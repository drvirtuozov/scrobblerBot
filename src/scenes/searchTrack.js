const { Markup, Extra } = require('telegraf');
const { Scene } = require('telegraf-flow');
const axios = require('axios');
const { LASTFM_URL, LASTFM_KEY } = require('../../config');
const { scrobbleTrackFromDB, scrobbleTrackFromText } = require('../helpers/scrobbler');
const { error } = require('../helpers/utils');
const { findUserByIdAndUpdate } = require('../helpers/dbmanager');
const { searchFromLastfmAndAnswerInlineQuery } = require('../helpers/actions');


const searchTrackScene = new Scene('search_track');

searchTrackScene.enter((ctx) => {
  ctx.editMessageText('OK. In order to start searching a track click the button below. Or you can type track info in this format manually:\n\nArtist\nTrack Name\nAlbum Title',
    Markup.inlineKeyboard([
      Markup.switchToCurrentChatButton('Search...', ''),
      Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
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
    const parsedTrack = ctx.message.text.split('\n');

    if (parsedTrack.length > 2) {
      return scrobbleTrackFromText(ctx, true);
    } else if (parsedTrack.length === 2) {
      const res = await axios(encodeURI(`${LASTFM_URL}?method=track.getInfo&api_key=${LASTFM_KEY}&artist=${parsedTrack[0]}&track=${parsedTrack[1]}&format=json`));

      if (res.data.error) return scrobbleTrackFromText(ctx, true);

      const track = res.data.track || {};
      track.album = track.album || {};
      const artist = track.artist.name || '';
      const name = track.name || '';
      const album = track.album.title || '';

      await findUserByIdAndUpdate(ctx.from.id, { track: { name, artist, album } });

      if (Object.keys(track.album).length) {
        return ctx.reply(`Last.fm has additional data about this track:\n\n${artist}\n${name}\n${album}\n\nWould you like to scrobble this track with the new data or leave it as is?`,
          Extra.webPreview(false).markup(Markup.inlineKeyboard([
            [
              Markup.callbackButton('Scrobble', 'SCR'),
              Markup.callbackButton('Leave', 'SCR_WITHOUT_ALBUM'),
              Markup.callbackButton('Edit album', 'EDIT_TRACK_ALBUM'),
            ], [
              Markup.callbackButton('Cancel', 'CANCEL'),
            ],
          ])));
      }

      return ctx.reply('Last.fm has no album data about this track. Would you like to enter album title manually?',
        Extra.webPreview(false).markup(Markup.inlineKeyboard([
          Markup.callbackButton('Yes', 'EDIT_TRACK_ALBUM'),
          Markup.callbackButton('No, scrobble', 'SCR_WITHOUT_ALBUM'),
          Markup.callbackButton('Cancel', 'CANCEL'),
        ])));
    }

    return ctx.reply('Format:\n\nArtist\nSong Name\nAlbum Title');
  } catch (e) {
    return error(ctx, e);
  }
});

searchTrackScene.action('SCR', async (ctx) => {
  try {
    await scrobbleTrackFromDB(ctx);
  } catch (e) {
    error(ctx, e);
  }
});

searchTrackScene.action('EDIT_TRACK_ALBUM', (ctx) => {
  ctx.flow.enter('edit_track_album');
});

searchTrackScene.action('SCR_WITHOUT_ALBUM', async (ctx) => {
  try {
    await scrobbleTrackFromDB(ctx, false);
  } catch (e) {
    error(ctx, e);
  }
});

module.exports = searchTrackScene;
