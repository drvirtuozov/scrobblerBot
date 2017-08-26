const { Markup, Extra } = require('telegraf');
const {
  getRandomFavSong, md5, utf8, successfulScrobble,
  canScrobble, scrobbleError, requestError, validateTracksDurations } = require('./utils');
const { LASTFM_URL, LASTFM_KEY, LASTFM_SECRET } = require('../../config');
const { proxyPost } = require('./requests');


const cantScrobbleText = 'You can\'t scrobble tracks more than once in 30 seconds. If you need to scrobble a couple of tracks you can do that by using tracklist scrobbling';

function scrobbleTracks(tracks = [], timestamp = Math.floor(Date.now() / 1000), key = '') { // low-level function
  const vtracks = validateTracksDurations(tracks);
  let startTimestamp = timestamp - vtracks
    .map(track => track.duration)
    .reduce((prev, next) => prev + next);
  const names = vtracks.map(track => track.name);
  const artists = vtracks.map(track => track.artist);
  const albums = vtracks.map(track => track.album || '');
  const timestamps = vtracks.map((track) => {
    startTimestamp += track.duration;
    return startTimestamp;
  });
  const queryAlbums = albums.map((album, i) => `&album[${i}]=${encodeURIComponent(album)}`).sort().join('');
  const queryArtists = artists.map((artist, i) => `&artist[${i}]=${encodeURIComponent(artist)}`).sort().join('');
  const queryTimestamps = timestamps.map((ms, i) => `&timestamp[${i}]=${ms}`).sort().join('');
  const queryTracks = names.map((name, i) => `&track[${i}]=${encodeURIComponent(name)}`).sort().join('');
  const apiSig = md5(utf8(`${queryAlbums}api_key${LASTFM_KEY}${queryArtists}methodtrack.scrobblesk${key}${queryTimestamps}${queryTracks}${LASTFM_SECRET}`.replace(/[&=]/g, '')));

  return proxyPost(LASTFM_URL,
    `${queryAlbums.slice(1)}&api_key=${LASTFM_KEY}&api_sig=${apiSig}${queryArtists}&format=json&method=track.scrobble&sk=${key}${queryTimestamps}${queryTracks}`);
}

async function scrobbleTrackFromDB(ctx, isAlbum = true) {
  const trackToScrobble = {
    artist: ctx.user.track.artist,
    name: ctx.user.track.name,
    album: isAlbum ? ctx.user.track.album : '',
  };

  if (canScrobble(ctx.user)) {
    if (ctx.callbackQuery) {
      ctx.messageToEdit = await ctx.editMessageText('<i>Scrobbling...</i>', Extra.HTML());
    } else {
      ctx.messageToEdit = await ctx.reply('<i>Scrobbling...</i>',
        Extra.HTML().inReplyTo(ctx.flow.state.messageId));
    }

    try {
      const res = await scrobbleTracks([trackToScrobble], undefined, ctx.user.key);

      if (res.data.scrobbles['@attr'].ingored) {
        return scrobbleError(ctx, new Error('❌ Error: The track was ignored by Last.fm'));
      }

      return successfulScrobble(ctx, undefined, [trackToScrobble]);
    } catch (e) {
      return requestError(ctx, e);
    }
  }

  if (ctx.callbackQuery) {
    return ctx.answerCallbackQuery(cantScrobbleText, undefined, true);
  }

  return ctx.reply(cantScrobbleText);
}

async function scrobbleTrackFromText(ctx) {
  const track = ctx.message.text.split('\n');
  const song = getRandomFavSong();

  if (track.length < 2 || track.length > 3) {
    return ctx.reply(`Please, send me valid data separated by new lines. Example:
    
${song.artist}\n${song.name}\n${song.album} <i>(optional)</i>\n\nType /help for more info`,
      Extra.HTML().webPreview(false));
  }

  if (canScrobble(ctx.user)) {
    ctx.messageToEdit = await ctx.reply('<i>Scrobbling...</i>',
      Extra.HTML().inReplyTo(ctx.message.message_id));
    const trackToScrobble = {
      artist: track[0],
      name: track[1],
      album: track[2],
    };

    try {
      const res = await scrobbleTracks([trackToScrobble], ctx.message.date, ctx.user.key);

      if (res.data.scrobbles['@attr'].ingored) {
        return scrobbleError(ctx, new Error('❌ Error: The track was ignored by Last.fm'));
      }

      return successfulScrobble(ctx, undefined, [trackToScrobble]);
    } catch (e) {
      return requestError(ctx, e);
    }
  }

  return ctx.reply(cantScrobbleText);
}

async function scrobbleAlbum(ctx) {
  if (ctx.callbackQuery) {
    ctx.messageToEdit = await ctx.editMessageText('<i>Scrobbling...</i>', Extra.HTML());
  } else {
    ctx.messageToEdit = await ctx.reply('<i>Scrobbling...</i>',
      Extra.HTML().inReplyTo(ctx.flow.state.messageId));
  }

  const tracks = ctx.user.album.tracks.map(track => ({
    name: track.name,
    artist: ctx.user.album.artist,
    album: ctx.user.album.title,
    duration: track.duration,
  }));

  try {
    await scrobbleTracks(tracks, undefined, ctx.user.key);
  } catch (e) {
    return requestError(ctx, e);
  }

  return successfulScrobble(ctx, undefined, tracks);
}

async function scrobbleTracklist(ctx) {
  let isValid = true;
  let tracks = ctx.message.text.split('\n')
    .map((string) => {
      if (string.split('|').length < 2) {
        isValid = false;
      }

      const track = string.split('|');

      return {
        name: track[1],
        artist: track[0],
        album: track[2],
      };
    });

  const parts = [];

  if (!isValid) {
    return ctx.reply('Please, send me valid data with this syntax:\n\nArtist | Track Name | Album Title',
      Markup.inlineKeyboard([
        Markup.callbackButton('Cancel', 'CANCEL'),
      ]).extra());
  }

  ctx.messageToEdit = await ctx.reply('<i>Scrobbling...</i>',
    Extra.HTML().inReplyTo(ctx.flow.state.messageId));

  while (tracks[0]) {
    parts.push(tracks.slice(0, 50));
    tracks = tracks.slice(50);
  }

  let results;

  try {
    results = await Promise.all(parts.map(part => scrobbleTracks(part, undefined, ctx.user.key)));
  } catch (e) {
    return requestError(ctx, e);
  }

  const ignored = [];
  const tracksArray = [];
  parts.forEach(part => tracksArray.push(...part));

  results.forEach((result) => {
    const scrobbles = result.data.scrobbles.scrobble;

    if (Array.isArray(scrobbles)) {
      scrobbles
        .filter(scrobble => scrobble.ignoredMessage.code === '1')
        .forEach(scr => ignored.push(scr));
    } else if (scrobbles.ignoredMessage.code === '1') {
      ignored.push(scrobbles);
    }
  });

  if (ignored.length) {
    return successfulScrobble(ctx,
      `✅ Success, but...\nThe following tracks were ignored:
      
${ignored.map(track => `${track.artist['#text']} | ${track.track['#text']} | ${track.album['#text']}`).join('\n')}`,
      tracksArray);
  }

  return successfulScrobble(ctx, undefined, tracksArray);
}

module.exports = {
  scrobbleTracks,
  scrobbleTrackFromDB,
  scrobbleTrackFromText,
  scrobbleAlbum,
  scrobbleTracklist,
};
