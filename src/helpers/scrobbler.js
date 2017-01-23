import axios from 'axios';
import { getRandomFavSong, md5, utf8, error } from './utils';
import config from '../config';
import { findUserById, findUserByIdAndUpdate } from './dbmanager';


export async function scrobbleTrack(ctx, isAlbum = true) {
  try {
    if (ctx.message && ctx.message.text) {
      let track = ctx.message.text.split('\n'),
        song = getRandomFavSong();
      
      if (track.length < 2 || track.length > 3) {
        ctx.reply(`Please, send me valid data separated by new lines. Example:\n\n${song.artist}\n${song.name}\n${song.album}\n\nAlbum title is an optional parameter. Type /help for more info.`);
      } else {
        let user = await findUserById(ctx.from.id);

        if (checkLastScrobble(ctx, user)) {
          let res = await scrobbleTracks([{ 
            artist: track[0], 
            name: track[1], 
            album: track[2] || '', 
            duration: 0 
          }], ctx.message.date, user.key);

          if (res.data.scrobbles['@attr'].ingored) 
            return successfulScrobble(ctx, 'Error. Track has been ignored.');
            
          successfulScrobble(ctx);
        }
      }
    } else {      
      let user = await findUserById(ctx.from.id);

      if (checkLastScrobble(ctx, user)) {
        let track = user.track;
      
        let res = await scrobbleTracks([{ 
          artist: track.artist, 
          name: track.name, 
          album: isAlbum ? track.album : '', 
          duration: 0 
        }], ctx.callbackQuery.date, user.key);

        if (res.data.scrobbles['@attr'].ingored) 
          return successfulScrobble(ctx, 'Error. Track has been ignored.');
        
        successfulScrobble(ctx);
      }
    }
  } catch (e) {
    error(ctx, e);
  }
}

function checkLastScrobble(ctx, user) {
  if (Date.now() - user.last_scrobble <= 30000) {
    ctx.reply('You can\'t scrobble tracks more than once in 30 seconds. If you need to scrobble a couple of tracks you can do that via /scrobble command.');
    return false;
  }

  return true;
}

function scrobbleTracks(tracks, timestamp, key) {
  let startTimestamp = (timestamp || Math.floor(Date.now() / 1000)) - tracks
      .map(track => track.duration)
      .reduce((prev, next) => prev + next),
    names = tracks.map(track => track.name),
    albums = tracks.map(track => track.album),
    artists = tracks.map(track => track.artist),
    timestamps = tracks.map(track => startTimestamp += track.duration),
    queryAlbums = albums.map((album, i) => `&album[${i}]=${encodeURIComponent(album)}`).sort().join(''),
    queryArtists = artists.map((artist, i) => `&artist[${i}]=${encodeURIComponent(artist)}`).sort().join(''),
    queryTimestamps = timestamps.map((ms, i) => `&timestamp[${i}]=${ms}`).sort().join(''),
    queryTracks = names.map((name, i) => `&track[${i}]=${encodeURIComponent(name)}`).sort().join(''),
    api_sig = md5(utf8(`${queryAlbums}api_key${config.lastfm.key}${queryArtists}methodtrack.scrobblesk${key}${queryTimestamps}${queryTracks}${config.lastfm.secret}`.replace(/[&=]/g, '')));
    
  return axios
    .post('http://ws.audioscrobbler.com/2.0/',
      `${queryAlbums.slice(1)}&api_key=${config.lastfm.key}&api_sig=${api_sig}${queryArtists}&format=json&method=track.scrobble&sk=${key}${queryTimestamps}${queryTracks}`
    );
}

export async function scrobbleAlbum(ctx) {
  try {
    let user = await findUserById(ctx.from.id),
      tracks = user.album.tracks.map(track => {
        return {
          name: track.name,
          artist: user.album.artist,
          album: user.album.title,
          duration: track.duration
        };
      });
    
    await scrobbleTracks(tracks, null, user.key);
    successfulScrobble(ctx);
  } catch (e) {
    error(ctx, e);
  }
}

export async function successfulScrobble(ctx, text) {
  let user = await findUserByIdAndUpdate(ctx.from.id, {
    $inc: { scrobbles: 1 }, 
    username: ctx.from.username, 
    last_scrobble: Date.now(),
    album: {}, 
    track: {}, 
    discogs_results: []
  });

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text ? text : 'Success!');
  } else {
    await ctx.reply(text ? text : 'Success!');
  }
  
  if (ctx.flow) ctx.flow.leave();
}

export async function scrobbleTracklist(ctx) {
  try {
    let tracks = ctx.message.text.split('\n')
      .map(string => {
        if (string.split('|').length < 2) {
          return ctx.reply('Please, send me valid data with this syntax:\n\nArtist | Track Name | Album Title');
        }
        
        let track = string.split('|');
        
        return {
          name: track[1],
          artist: track[0],
          album: track[2] || '',
          duration: 300
        };
      }),
      parts = [];
      
    while (tracks[0]) {
      parts.push(tracks.slice(0, 50));
      tracks = tracks.slice(50);
    }
    
    let user = await findUserById(ctx.from.id),
      results = await Promise.all(parts.map(part => scrobbleTracks(part, null, user.key))),
      ignored = [];
        
    results.forEach(result => {
      result.data.scrobbles.scrobble
        .filter(scrobble => scrobble.ignoredMessage.code === '1')
        .forEach(scr => ignored.push(scr));
    });
    
    if (ignored.length)
      return successfulScrobble(ctx, `Success, but...\nThe following tracks have been ignored:\n\n${ignored.map(track => `${track.artist['#text']} | ${track.track['#text']} | ${track.album['#text']}`).join('\n')}`);
    
    successfulScrobble(ctx);
  } catch (e) {
    error(ctx, e);
  }
}