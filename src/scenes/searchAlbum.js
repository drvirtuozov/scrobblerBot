const { Markup, Extra } = require('telegraf');
const { Scene } = require('telegraf-flow');
const axios = require('axios');
const { LASTFM_URL, LASTFM_KEY, DISCOGS_KEY, DISCOGS_SECRET } = require('../../config');
const { error } = require('../helpers/utils');
const { nextAlbum, searchFromLastfmAndAnswerInlineQuery } = require('../helpers/actions');
const { scrobbleAlbum } = require('../helpers/scrobbler');
const { findUserByIdAndUpdate } = require('../helpers/dbmanager');
const toTitleCase = require('to-title-case');


const searchAlbumScene = new Scene('search_album');

searchAlbumScene.enter((ctx) => {
  ctx.editMessageText('OK. In order to start searching an album click the button below. Or you can type album info in this format manually:\n\nArtist\nAlbum Title',
    Markup.inlineKeyboard([
      Markup.switchToCurrentChatButton('Search...', ''),
      Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
});

searchAlbumScene.on('inline_query', async (ctx) => {
  try {
    await searchFromLastfmAndAnswerInlineQuery(ctx, 'album');
  } catch (e) {
    error(ctx, e);
  }
});

searchAlbumScene.on('text', async (ctx) => {
  try {
    const parsedAlbum = ctx.message.text.split('\n');

    if (parsedAlbum.length < 2) return ctx.reply('Format:\n\nArtist\nAlbum Title');

    const parsedTitle = toTitleCase(parsedAlbum[1]);
    const parsedArtist = toTitleCase(parsedAlbum[0]);

    let foundOn = '';
    let discogsResults = [];
    let tracks = [];

    await findUserByIdAndUpdate(ctx.from.id, {
      $set: {
        album: { title: parsedTitle, artist: parsedArtist },
      },
    });

    const results = await Promise.all([
      axios(encodeURI(`https://api.discogs.com/database/search?artist=${parsedArtist}&release_title=${parsedTitle}&type=release&key=${DISCOGS_KEY}&secret=${DISCOGS_SECRET}`)),
      axios(encodeURI(`${LASTFM_URL}?method=album.getinfo&api_key=${LASTFM_KEY}&artist=${parsedArtist}&album=${parsedTitle}&format=json`)),
    ]);

    if (results[0].data.results[0]) {
      const id = results[0].data.results[0].id;

      discogsResults = results[0].data.results;
      discogsResults.unshift({});

      await findUserByIdAndUpdate(ctx.from.id, {
        discogs_results: discogsResults.map(result => ({ id: result.id })),
      });

      const res = await axios(`https://api.discogs.com/releases/${id}`);

      if (res.data.tracklist.length) { // strange place
        tracks = res.data.tracklist
          .map((track) => {
            const dur = track.duration.split(':');
            return { name: track.title, duration: (dur[0] * 60) + (+dur[1]) };
          });

        foundOn = 'Discogs.com';
      }
    } else if (results[1].data.album && results[1].data.album.tracks.track.length) {
      tracks = results[1].data.album.tracks.track.map(track => (
        { name: track.name, duration: track.duration }
      ));

      foundOn = 'Last.fm';
    } else {
      return ctx.flow.enter('no_album_info');
    }

    const user = await findUserByIdAndUpdate(ctx.from.id, { 'album.tracks': tracks }, { new: true });
    const album = user.album;
    const name = album.title;
    const artist = album.artist;
    const inlineKeyboard = foundOn === 'Discogs.com'
      ?
      Markup.inlineKeyboard([[
        Markup.callbackButton('Edit', 'EDIT'),
        Markup.callbackButton('⬅️', 'PREV'),
        Markup.callbackButton('➡️', 'NEXT'),
        Markup.callbackButton('Cancel', 'CANCEL'),
      ], [
        Markup.callbackButton('OK', 'OK'),
      ]])
      :
      Markup.inlineKeyboard([
        Markup.callbackButton('OK', 'OK'),
        Markup.callbackButton('Edit', 'EDIT'),
        Markup.callbackButton('Cancel', 'CANCEL'),
      ]);

    return ctx.reply(`You are about to scrobble <a href="${encodeURI(`http://www.last.fm/music/${artist}/${name}`)}">${name}</a> by <a href="${encodeURI(`http://www.last.fm/music/${artist}`)}">${artist}</a>. The following tracks have been found on ${foundOn} and will be scrobbled:\n\n${album.tracks
      .map(track => track.name).join('\n')}${foundOn === 'Discogs.com'
        ? `\n\nResults: 1 of ${discogsResults.length - 1}`
        : ''}`,
          Extra.HTML().webPreview(false).markup(inlineKeyboard));
  } catch (e) {
    return error(ctx, e);
  }
});

searchAlbumScene.action('OK', async (ctx) => {
  try {
    await scrobbleAlbum(ctx);
  } catch (e) {
    error(ctx, e);
  }
});

searchAlbumScene.action('EDIT', (ctx) => {
  ctx.flow.enter('edit_album');
});

searchAlbumScene.action('PREV', async (ctx) => {
  try {
    await nextAlbum(ctx, 'PREV');
  } catch (e) {
    error(ctx, e);
  }
});

searchAlbumScene.action('NEXT', async (ctx) => {
  try {
    await nextAlbum(ctx, 'NEXT');
  } catch (e) {
    error(ctx, e);
  }
});

module.exports = searchAlbumScene;
