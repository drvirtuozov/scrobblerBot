import axios from 'axios';
import bot from '../bot';
import { getRandomFavSong, md5, utf8 } from './utils';
import config from '../config';
import { findUserById, findUserByIdAndUpdate } from './dbmanager';


export async function scrobbleSong(ctx, isAlbum) {
  try {
    if (ctx.message) {
      let track = ctx.message.text.split('\n'),
        song = getRandomFavSong();
      
      if (track.length < 2 || track.length > 3) {
        ctx.reply(`Please, send me valid data separated by new lines. Example:\n\n
          ${song.artist}\n${song.name}\n${song.album}\n\nAlbum title is an optional parameter. 
          Type /help for more info.`);
      } else {
        let user = await findUserById(ctx.from.id);

        if (Date.now() - user.last_scrobble <= 30000) {
          ctx.reply(`You can\'t scrobble songs more than once in 30 seconds. 
            If you need to scrobble a list of songs you can do that via /scrobble command.`);
        } else {
          let res = await scrobbleSongs([{ artist: track[0], name: track[1], album: track[2] || '', duration: 0 }], user.key);

          if (res.data.scrobbles['@attr'].ingored) 
            return successfulScrobble(ctx, 'Error. Track has been ignored.');
            
          successfulScrobble(ctx);
        }
      }
    } else {
      isAlbum = typeof isAlbum === 'undefined' ? true : isAlbum;
      
      let user = await findUserById(ctx.from.id, 'track')

      if (Date.now() - user.last_scrobble <= 30000) {
        ctx.reply('You can\'t scrobble songs more than once in 30 seconds. If you need to scrobble a list of songs you can do that via /scrobble command.');
      } else {
        let track = user.track;
      
        let res = await scrobbleSongs([{ artist: track.artist, name: track.name, album: track.album, duration: 0 }], user.key);

        if (res.data.scrobbles['@attr'].ingored) 
          return successfulScrobble(ctx, 'Error. Track has been ignored.');
        
        successfulScrobble(ctx);
      }
    }
  } catch (e) {
    unsuccessfulScrobble(ctx, e);
  }
}

export function scrobbleSongs(tracks, key) {
  let startTimestamp = Math.floor(Date.now() / 1000) - tracks
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
  let user = await findUserById(ctx.from.id),
    tracks = user.album.tracks.map(track => {
      return {
        name: track.name,
        artist: user.album.artist,
        album: user.album.title,
        duration: track.duration
      };
    });
  
  return scrobbleSongs(tracks, user.key);
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
  
  ctx.flow.leave(); // strange behavior
}

export function unsuccessfulScrobble(ctx, err) {
  if (err) {
    console.log(err.data || err);
    err.data = err.data || {};
  
    if (err.data.error === 9) {
      ctx.flow.enter('auth');
    } else {
      ctx.reply('Oops, something went wrong. Please try again later. If it goes on constantly please let us know via /report command.');
      ctx.flow.leave();
    }
  }
}