const axios = require('axios');
const { getRandomFavSong, md5, utf8, successfulScrobble, canScrobble } = require('./utils');
const { LASTFM_URL, LASTFM_KEY, LASTFM_SECRET } = require('../../config');
const { findUserById } = require('./dbmanager');


function scrobbleTracks(tracks, timestamp, key) {
  let startTimestamp = (timestamp || Math.floor(Date.now() / 1000)) - tracks
    .map(track => track.duration)
    .reduce((prev, next) => prev + next);
  const names = tracks.map(track => track.name);
  const albums = tracks.map(track => track.album);
  const artists = tracks.map(track => track.artist);
  const timestamps = tracks.map(track => startTimestamp += track.duration);
  const queryAlbums = albums.map((album, i) => `&album[${i}]=${encodeURIComponent(album)}`).sort().join('');
  const queryArtists = artists.map((artist, i) => `&artist[${i}]=${encodeURIComponent(artist)}`).sort().join('');
  const queryTimestamps = timestamps.map((ms, i) => `&timestamp[${i}]=${ms}`).sort().join('');
  const queryTracks = names.map((name, i) => `&track[${i}]=${encodeURIComponent(name)}`).sort().join('');
  const apiSig = md5(utf8(`${queryAlbums}api_key${LASTFM_KEY}${queryArtists}methodtrack.scrobblesk${key}${queryTimestamps}${queryTracks}${LASTFM_SECRET}`.replace(/[&=]/g, '')));

  return axios.post(LASTFM_URL,
    `${queryAlbums.slice(1)}&api_key=${LASTFM_KEY}&api_sig=${apiSig}${queryArtists}&format=json&method=track.scrobble&sk=${key}${queryTimestamps}${queryTracks}`);
}

async function scrobbleTrack(ctx, isAlbum = true) {
  const cantScrobbleText = 'You can\'t scrobble tracks more than once in 30 seconds. If you need to scrobble a couple of tracks you can do that via /scrobble command. Please, wait and try again';

  if (ctx.message && ctx.message.text) {
    const track = ctx.message.text.split('\n');
    const song = getRandomFavSong();

    if (track.length < 2 || track.length > 3) {
      return ctx.reply(`Please, send me valid data separated by new lines. Example:\n\n${song.artist}\n${song.name}\n${song.album}\n\nAlbum title is an optional parameter. Type /help for more info`);
    }

    const user = await findUserById(ctx.from.id);

    if (canScrobble(user)) {
      const res = await scrobbleTracks([{
        artist: track[0],
        name: track[1],
        album: track[2] || '',
        duration: 0,
      }], ctx.message.date, user.key);

      if (res.data.scrobbles['@attr'].ingored) {
        return successfulScrobble(ctx, 'Error. Track has been ignored');
      }

      return successfulScrobble(ctx);
    }

    return ctx.reply(cantScrobbleText);
  }

  const user = await findUserById(ctx.from.id);

  if (canScrobble(user)) {
    const track = user.track;
    const res = await scrobbleTracks([{
      artist: track.artist,
      name: track.name,
      album: isAlbum ? track.album : '',
      duration: 0,
    }], null, user.key);

    if (res.data.scrobbles['@attr'].ingored) {
      return successfulScrobble(ctx, 'Error. Track has been ignored');
    }

    return successfulScrobble(ctx);
  }

  if (ctx.callbackQuery) {
    return ctx.answerCallbackQuery(cantScrobbleText, undefined, true);
  }

  return ctx.reply(cantScrobbleText);
}

async function scrobbleAlbum(ctx) {
  const user = await findUserById(ctx.from.id);
  const tracks = user.album.tracks.map(track => ({
    name: track.name,
    artist: user.album.artist,
    album: user.album.title,
    duration: track.duration,
  }));

  await scrobbleTracks(tracks, null, user.key);
  return successfulScrobble(ctx);
}

async function scrobbleTracklist(ctx) {
  let tracks = ctx.message.text.split('\n')
    .map((string) => {
      if (string.split('|').length < 2) {
        return ctx.reply('Please, send me valid data with this syntax:\n\nArtist | Track Name | Album Title');
      }

      const track = string.split('|');

      return {
        name: track[1],
        artist: track[0],
        album: track[2] || '',
        duration: 300,
      };
    });
  const parts = [];

  while (tracks[0]) {
    parts.push(tracks.slice(0, 50));
    tracks = tracks.slice(50);
  }

  const user = await findUserById(ctx.from.id);
  const results = await Promise.all(parts.map(part => scrobbleTracks(part, null, user.key)));
  const ignored = [];

  results.forEach((result) => {
    const scrobbles = result.data.scrobbles.scrobble;

    if (Array.isArray(scrobbles)) {
      scrobbles
        .filter(scrobble => scrobble.ignoredMessage.code === '1')
        .forEach(scr => ignored.push(scr));
    } else {
      if (scrobbles.ignoredMessage.code === '1') ignored.push(scrobbles);
    }
  });

  if (ignored.length) {
    return successfulScrobble(ctx, `Success, but...\nThe following tracks have been ignored:\n\n${ignored.map(track => `${track.artist['#text']} | ${track.track['#text']} | ${track.album['#text']}`).join('\n')}`);
  }

  return successfulScrobble(ctx);
}

module.exports = {
  scrobbleTracks,
  scrobbleTrack,
  scrobbleAlbum,
  scrobbleTracklist,
};
