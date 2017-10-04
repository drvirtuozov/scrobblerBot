const { Markup, Extra } = require('telegraf');
const {
  getRandomFavSong, md5, utf8, successfulScrobble,
  scrobbleError, requestError, validateTracksDurations } = require('./utils');
const { LASTFM_URL, LASTFM_KEY, LASTFM_SECRET } = require('../../config');
const { proxyPost } = require('./requests');


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

  if (ctx.callbackQuery) {
    ctx.flow.state.messageIdToEdit = (await ctx.editMessageText('<i>Scrobbling...</i>',
      Extra.HTML())).message_id;
  } else {
    ctx.flow.state.messageIdToEdit = (await ctx.reply('<i>Scrobbling...</i>',
      Extra.HTML().inReplyTo(ctx.flow.state.messageIdToReply))).message_id;
  }

  try {
    const res = await scrobbleTracks([trackToScrobble], undefined, ctx.user.key);

    if (res.data.scrobbles['@attr'].ingored) {
      await scrobbleError(ctx, new Error('❌ Error: The track was ignored by Last.fm'));
      return;
    }
  } catch (e) {
    await requestError(ctx, e);
    return;
  }

  await successfulScrobble(ctx, undefined, [trackToScrobble]);
}

async function scrobbleTrackFromText(ctx) {
  const track = ctx.message.text.split('\n');
  const song = getRandomFavSong();

  if (track.length < 2 || track.length > 3) {
    await ctx.reply(`Please, send me valid data separated by new lines. Example:
    
${song.artist}\n${song.name}\n${song.album} <i>(optional)</i>\n\nType /help for more info`,
      Extra.HTML().webPreview(false));

    return;
  }

  ctx.flow.state.messageIdToReply = ctx.message.message_id;
  ctx.flow.state.messageIdToEdit = (await ctx.reply('<i>Scrobbling...</i>',
    Extra.HTML().inReplyTo(ctx.flow.state.messageIdToReply))).message_id;

  const trackToScrobble = {
    artist: track[0],
    name: track[1],
    album: track[2],
  };

  try {
    const res = await scrobbleTracks([trackToScrobble], ctx.message.date, ctx.user.key);

    if (res.data.scrobbles['@attr'].ingored) {
      await scrobbleError(ctx, new Error('❌ Error: The track was ignored by Last.fm'));
      return;
    }
  } catch (e) {
    await requestError(ctx, e);
    return;
  }

  await successfulScrobble(ctx, undefined, [trackToScrobble]);
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
    await requestError(ctx, e);
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

  let res;

  try {
    res = await scrobbleTracks(tracks, undefined, ctx.user.key);
  } catch (e) {
    await requestError(ctx, e);
    return;
  }

  const ignored = [];
  const scrobbles = res.data.scrobbles.scrobble;

  if (Array.isArray(scrobbles)) {
    scrobbles
      .filter(scr => scr.ignoredMessage.code === '1')
      .forEach(scr => ignored.push(scr));
  } else if (scrobbles.ignoredMessage.code === '1') {
    ignored.push(scrobbles);
  }

  if (ignored.length) {
    await successfulScrobble(ctx,
      `✅ Success, but...\nThe following tracks were ignored:
      
${ignored.map(track => `${track.artist['#text']} | ${track.track['#text']} | ${track.album['#text']}`).join('\n')}`,
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
};
