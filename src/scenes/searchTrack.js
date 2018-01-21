const { Markup, Extra } = require('telegraf');
const { Scene } = require('telegraf-flow');
const { LASTFM_URL, LASTFM_KEY } = require('../../config');
const { scrobbleTrackFromDB, scrobbleTrackFromText } = require('../helpers/scrobbler');
const { findUserByIdAndUpdate } = require('../helpers/dbmanager');
const { searchFromLastfmAndAnswerInlineQuery } = require('../helpers/actions');
const { proxyGet } = require('../helpers/proxy');
const limiter = require('../middlewares/limiter');
const { requestError } = require('../helpers/utils');


const searchTrackScene = new Scene('search_track');

searchTrackScene.enter(async (ctx) => {
  const text = 'OK. In order to start searching a track push the button below. ' +
    'Or you can type track info in this format manually:\n\nArtist\nTrack Name\nAlbum Title';

  const extra = Markup.inlineKeyboard([
    Markup.switchToCurrentChatButton('Search...', ''),
    Markup.callbackButton('Cancel', 'CANCEL'),
  ]).extra();

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, extra);
    return;
  }

  await ctx.reply(text, extra);
});

searchTrackScene.on('inline_query', async (ctx) => {
  await searchFromLastfmAndAnswerInlineQuery(ctx, 'track');
});

searchTrackScene.on('text', async (ctx) => {
  ctx.flow.state.messageIdToReply = ctx.message.message_id;
  const parsedTrack = ctx.message.text.split('\n');

  if (parsedTrack.length < 2 || parsedTrack.length > 3) {
    await ctx.reply('Format:\n\nArtist\nSong Name\nAlbum Title', Markup.inlineKeyboard([
      Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
  } else if (parsedTrack.length === 2) {
    ctx.flow.state.messageIdToEdit = (await ctx.reply('<i>Fetching data...</i>',
      Extra.HTML().inReplyTo(ctx.flow.state.messageIdToReply))).message_id;
    const qartist = encodeURIComponent(parsedTrack[0]);
    const qtrack = encodeURIComponent(parsedTrack[1]);
    let res;

    try {
      res = await proxyGet(`${LASTFM_URL}?method=track.getInfo&api_key=${
        LASTFM_KEY}&artist=${qartist}&track=${qtrack}&format=json`);
    } catch (e) {
      await requestError(ctx, e);
      return;
    }

    if (res.error) {
      await scrobbleTrackFromText(ctx);
      return;
    }

    const artist = parsedTrack[0];
    const name = parsedTrack[1];
    const track = res.track || {};
    track.album = track.album || {};
    const album = track.album.title || '';
    await findUserByIdAndUpdate(ctx.from.id, { track: { name, artist, album } });

    if (Object.keys(track.album).length) {
      await ctx.telegram.editMessageText(ctx.chat.id, ctx.flow.state.messageIdToEdit, null,
        `Last.fm has album info of this track:\n\n${artist}\n${name}\n${album}\n\n` +
        'Would you like to scrobble it with the new info or leave it as is?',
          Extra.webPreview(false).markup(Markup.inlineKeyboard([
            [
              Markup.callbackButton('Scrobble', 'SCR'),
              Markup.callbackButton('Leave', 'SCR_WITHOUT_ALBUM'),
              Markup.callbackButton('Edit album', 'EDIT_TRACK_ALBUM'),
            ], [
              Markup.callbackButton('Cancel', 'CANCEL'),
            ],
          ])));

      return;
    }

    await ctx.telegram.editMessageText(ctx.chat.id, ctx.flow.state.messageIdToEdit, null,
      'Last.fm has no album info of this track. Would you like to enter album title manually?',
        Extra.webPreview(false).markup(Markup.inlineKeyboard([
          Markup.callbackButton('Yes', 'EDIT_TRACK_ALBUM'),
          Markup.callbackButton('No, scrobble', 'SCR_WITHOUT_ALBUM'),
          Markup.callbackButton('Cancel', 'CANCEL'),
        ])));
  } else {
    await scrobbleTrackFromText(ctx);
  }
});

searchTrackScene.action('SCR', limiter, async (ctx) => {
  await scrobbleTrackFromDB(ctx);
});

searchTrackScene.action('EDIT_TRACK_ALBUM', async (ctx) => {
  await ctx.flow.enter('edit_track_album', ctx.flow.state);
});

searchTrackScene.action('SCR_WITHOUT_ALBUM', limiter, async (ctx) => {
  await scrobbleTrackFromDB(ctx, false);
});

module.exports = searchTrackScene;
