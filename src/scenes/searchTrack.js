const { Markup, Extra } = require('telegraf');
const { Scene } = require('telegraf-flow');
const { LASTFM_URL, LASTFM_KEY } = require('../../config');
const { scrobbleTrackFromDB, scrobbleTrackFromText } = require('../helpers/scrobbler');
const { error } = require('../helpers/utils');
const { findUserByIdAndUpdate } = require('../helpers/dbmanager');
const { searchFromLastfmAndAnswerInlineQuery } = require('../helpers/actions');
const { proxyGet } = require('../helpers/requests');
const limiter = require('../middlewares/limiter');


const searchTrackScene = new Scene('search_track');

searchTrackScene.enter((ctx) => {
  const text = 'OK. In order to start searching a track click the button below. Or you can type track info in this format manually:\n\nArtist\nTrack Name\nAlbum Title';
  const extra = Markup.inlineKeyboard([
    Markup.switchToCurrentChatButton('Search...', ''),
    Markup.callbackButton('Cancel', 'CANCEL'),
  ]).extra();

  if (ctx.callbackQuery) {
    return ctx.editMessageText(text, extra);
  }

  return ctx.reply(text, extra);
});

searchTrackScene.on('inline_query', async (ctx) => {
  try {
    await searchFromLastfmAndAnswerInlineQuery(ctx, 'track');
  } catch (e) {
    error(ctx, e);
  }
});

searchTrackScene.on('text', async (ctx) => {
  try {
    ctx.flow.state.messageIdToReply = ctx.message.message_id;
    const parsedTrack = ctx.message.text.split('\n');

    if (parsedTrack.length < 2 || parsedTrack.length > 3) {
      await ctx.reply('Format:\n\nArtist\nSong Name\nAlbum Title', Markup.inlineKeyboard([
        Markup.callbackButton('Cancel', 'CANCEL'),
      ]).extra());
    } else if (parsedTrack.length === 2) {
      ctx.flow.state.messageIdToEdit = (await ctx.reply('<i>Fetching data...</i>',
        Extra.HTML().inReplyTo(ctx.flow.state.messageIdToReply))).message_id;
      const res = await proxyGet(encodeURI(`${LASTFM_URL}?method=track.getInfo&api_key=${LASTFM_KEY}&artist=${parsedTrack[0]}&track=${parsedTrack[1]}&format=json`));

      if (res.data.error) {
        await scrobbleTrackFromText(ctx);
        return;
      }

      const track = res.data.track || {};
      track.album = track.album || {};
      const artist = track.artist.name || '';
      const name = track.name || '';
      const album = track.album.title || '';
      await findUserByIdAndUpdate(ctx.from.id, { track: { name, artist, album } });

      if (Object.keys(track.album).length) {
        await ctx.telegram.editMessageText(ctx.chat.id, ctx.flow.state.messageIdToEdit, null,
          `Last.fm has album info of this track:\n\n${artist}\n${name}\n${album}\n\nWould you like to scrobble it with the new info or leave it as is?`,
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
  } catch (e) {
    error(ctx, e);
  }
});

searchTrackScene.action('SCR', limiter, async (ctx) => {
  try {
    await scrobbleTrackFromDB(ctx);
  } catch (e) {
    error(ctx, e);
  }
});

searchTrackScene.action('EDIT_TRACK_ALBUM', (ctx) => {
  ctx.flow.enter('edit_track_album', ctx.flow.state);
});

searchTrackScene.action('SCR_WITHOUT_ALBUM', limiter, async (ctx) => {
  try {
    await scrobbleTrackFromDB(ctx, false);
  } catch (e) {
    error(ctx, e);
  }
});

module.exports = searchTrackScene;
