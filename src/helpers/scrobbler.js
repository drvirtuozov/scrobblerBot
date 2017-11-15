const { Markup, Extra } = require('telegraf');
const {
  getRandomFavSong, md5, utf8, successfulScrobble,
  scrobbleError, validateTrackDurations, getIgnoredTracksFromLastfmRes } = require('./utils');
const { LASTFM_URL, LASTFM_KEY, LASTFM_SECRET } = require('../../config');
const { proxyPost } = require('./proxy');


// low-level function
function scrobbleTracks(tracks = [], timestamp = Math.floor(Date.now() / 1000), key = '') {
  const vtracks = validateTrackDurations(tracks);
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
  const apiSig = md5(utf8(`${queryAlbums}api_key${LASTFM_KEY}${queryArtists}methodtrack.scrobblesk${key}${
    queryTimestamps}${queryTracks}${LASTFM_SECRET}`.replace(/[&=]/g, '')));
  return proxyPost(LASTFM_URL, `${queryAlbums.slice(1)}&api_key=${LASTFM_KEY}&api_sig=${apiSig}${
    queryArtists}&format=json&method=track.scrobble&sk=${key}${queryTimestamps}${queryTracks}`);
}

async function scrobbleTracksByParts(ctx, tracks = []) {
  const batchCount = 50; // 50 is the max count allowed by last.fm at once
  const partsCount = Math.ceil(tracks.length / batchCount);
  const responses = [];
  let errorsCount = 0; // use error checker later

  for (let i = 0; i < partsCount; i += 1) {
    if (partsCount > 1) {
      await ctx.telegram.editMessageText(ctx.chat.id, ctx.flow.state.messageIdToEdit, null,
        `Too many tracks to scrobble at once.\n\n<i>Scrobbling by parts... ${i + 1} of ${partsCount}</i>`,
        Extra.HTML());
    }

    try {
      const trcks = tracks.slice(i * batchCount, (i + 1) * batchCount);
      const res = await scrobbleTracks(trcks, undefined, ctx.user.key); // change timestamp later
      responses.push(res);
    } catch (e) {
      responses.push(e);
      errorsCount += 1;
    }
  }

  if (errorsCount === partsCount) {
    throw responses[errorsCount - 1];
  }

  return responses;
}

async function scrobbleTrackFromDB(ctx, isAlbum = true) {
  const track = {
    artist: ctx.user.track.artist,
    name: ctx.user.track.name,
    album: isAlbum ? ctx.user.track.album : '',
  };

  if (ctx.callbackQuery) {
    ctx.flow.state.messageIdToEdit = (await ctx.editMessageText('<i>Scrobbling...</i>',
      Extra.HTML())).message_id;
  } else {
    ctx.flow.state.messageIdToEdit = (await ctx.reply('<i>Scrobbling...</i>',
      Extra.HTML().inReplyTo(ctx.flow.state.messageIdToReply))).message_id;
  }

  try {
    const res = await scrobbleTracks([track], undefined, ctx.user.key);

    if (res.scrobbles['@attr'].ingored) {
      await scrobbleError(ctx, {}, [track]);
      return;
    }
  } catch (e) {
    await scrobbleError(ctx, e, [track]);
    return;
  }

  await successfulScrobble(ctx, undefined, [track]);
}

async function scrobbleTrackFromText(ctx) {
  const parsedTrack = ctx.message.text.split('\n');
  const song = getRandomFavSong();

  if (parsedTrack.length < 2 || parsedTrack.length > 3) {
    await ctx.reply('Please, send me valid data separated by new lines. Example:\n\n' +
      `${song.artist}\n${song.name}\n${song.album} <i>(optional)</i>\n\nType /help for more info`,
        Extra.HTML().webPreview(false));

    return;
  }

  ctx.flow.state.messageIdToReply = ctx.message.message_id;
  ctx.flow.state.messageIdToEdit = (await ctx.reply('<i>Scrobbling...</i>',
    Extra.HTML().inReplyTo(ctx.flow.state.messageIdToReply))).message_id;

  const track = {
    artist: parsedTrack[0],
    name: parsedTrack[1],
    album: parsedTrack[2],
  };

  try {
    const res = await scrobbleTracks([track], ctx.message.date, ctx.user.key);

    if (res.scrobbles['@attr'].ingored) {
      await scrobbleError(ctx, {}, [track]);
      return;
    }
  } catch (e) {
    await scrobbleError(ctx, e, [track]);
    return;
  }

  await successfulScrobble(ctx, undefined, [track]);
}

async function scrobbleAlbum(ctx) {
  if (ctx.callbackQuery) {
    ctx.flow.state.messageIdToEdit = (await ctx.editMessageText('<i>Scrobbling...</i>',
      Extra.HTML())).message_id;
  } else {
    ctx.flow.state.messageIdToEdit = (await ctx.reply('<i>Scrobbling...</i>',
      Extra.HTML().inReplyTo(ctx.flow.state.messageIdToReply))).message_id;
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
    await scrobbleError(ctx, e, tracks);
    return;
  }

  await successfulScrobble(ctx, undefined, tracks);
}

async function scrobbleTracklist(ctx) {
  let isValid = true;
  const tracks = ctx.message.text.split('\n')
    .map((string) => {
      const track = string.split('|');

      if (track.length < 2 || track.length > 3) {
        isValid = false;
      }

      return {
        name: track[1],
        artist: track[0],
        album: track[2],
      };
    });

  if (!isValid) {
    await ctx.reply('Please, send me valid data with the valid syntax:\n\nArtist | Track Name | Album Title',
      Markup.inlineKeyboard([
        Markup.callbackButton('Cancel', 'CANCEL'),
      ]).extra());

    return;
  }

  ctx.flow.state.messageIdToReply = ctx.message.message_id;
  ctx.flow.state.messageIdToEdit = (await ctx.reply('<i>Scrobbling...</i>',
    Extra.HTML().inReplyTo(ctx.flow.state.messageIdToReply))).message_id;

  let responses = [];

  try {
    responses = await scrobbleTracksByParts(ctx, tracks);
  } catch (e) {
    await scrobbleError(ctx, e, tracks);
    return;
  }

  const ignored = [];

  for (let i = 0; i < responses.length; i += 1) {
    ignored.push(...getIgnoredTracksFromLastfmRes(responses[i]));
  }

  if (ignored.length) {
    await successfulScrobble(ctx, '✅ Success, but...\nThe following tracks were ignored:\n\n' +
      `${ignored.map(track => `${track.artist} | ${track.name} | ${track.album}`).join('\n')}`,
      tracks);

    return;
  }

  await successfulScrobble(ctx, undefined, tracks);
}

module.exports = {
  scrobbleTracks,
  scrobbleTrackFromDB,
  scrobbleTrackFromText,
  scrobbleAlbum,
  scrobbleTracklist,
  scrobbleTracksByParts,
};
