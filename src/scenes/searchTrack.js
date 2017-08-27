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
    ctx.flow.state.messageId = ctx.message.message_id;
    const parsedTrack = ctx.message.text.split('\n');

    if (parsedTrack.length > 2) {
      return scrobbleTrackFromText(ctx);
    } else if (parsedTrack.length === 2) {
      const res = await proxyGet(encodeURI(`${LASTFM_URL}?method=track.getInfo&api_key=${LASTFM_KEY}&artist=${parsedTrack[0]}&track=${parsedTrack[1]}&format=json`));

      if (res.data.error) return scrobbleTrackFromText(ctx);

      const track = res.data.track || {};
      track.album = track.album || {};
      const artist = track.artist.name || '';
      const name = track.name || '';
      const album = track.album.title || '';

      await findUserByIdAndUpdate(ctx.from.id, { track: { name, artist, album } });

      if (Object.keys(track.album).length) {
        return ctx.reply(`Last.fm has album info of this track:\n\n${artist}\n${name}\n${album}\n\nWould you like to scrobble it with the new info or leave it as is?`,
          Extra.webPreview(false).inReplyTo(ctx.message.message_id).markup(Markup.inlineKeyboard([
            [
              Markup.callbackButton('Scrobble', 'SCR'),
              Markup.callbackButton('Leave', 'SCR_WITHOUT_ALBUM'),
              Markup.callbackButton('Edit album', 'EDIT_TRACK_ALBUM'),
            ], [
              Markup.callbackButton('Cancel', 'CANCEL'),
            ],
          ])));
      }

      return ctx.reply('Last.fm has no album info of this track. Would you like to enter album title manually?',
        Extra.webPreview(false).markup(Markup.inlineKeyboard([
          Markup.callbackButton('Yes', 'EDIT_TRACK_ALBUM'),
          Markup.callbackButton('No, scrobble', 'SCR_WITHOUT_ALBUM'),
          Markup.callbackButton('Cancel', 'CANCEL'),
        ])));
    }

    return ctx.reply('Format:\n\nArtist\nSong Name\nAlbum Title', Markup.inlineKeyboard([
      Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
  } catch (e) {
    return error(ctx, e);
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
