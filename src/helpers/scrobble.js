import axios from 'axios';
import User from '../models/user';
import bot from '../bot';
import { getRandomFavSong, md5, utf8 } from './utils';
import config from '../config';


export function scrobble(message) {
  bot.sendMessage({
    text: 'What do you want to scrobble?',
    chat_id: message.from.id,
    reply_markup: {
      inline_keyboard: [[
        { text: 'Song', callback_data: 'SONG' },
        { text: 'List of Songs', callback_data: 'LIST' },
        { text: 'Album', callback_data: 'ALBUM' }
      ],
      [
        { text: 'Cancel', callback_data: 'CANCEL' }
      ]]
    }
  })
  .then(() => {
    bot.setUserMilestone('scrobble', message.from.id);
  });
}

export function scrobbleSong(event, isAlbum?) {
  if (event.text) {
    let track = event.text.split('\n'),
      song = getRandomFavSong();
    
    if (track.length < 2 || track.length > 3) {
      event.echo(`Please, send me valid data separated by new lines. Example:\n\n
        ${song.artist}\n${song.name}\n${song.album}\n\nAlbum title is an optional parameter. 
        Type /help for more info.`);
    } else {
      User.findById(event.from.id)
        .then(user => {
          if (Date.now() - user.lastScrobble <= 30000) {
            event.echo(`You can\'t scrobble songs more than once in 30 seconds. 
              If you need to scrobble a list of songs you can do that via /scrobble command.`);
            throw undefined;
          }
          
          return scrobbleSongs([{ artist: track[0], name: track[1], album: track[2] || '', duration: 0 }], user.key);
        })
        .then(res => {
          if (res.data.scrobbles['@attr'].ingored) 
            return successfulScrobble(event, 'Error. Track has been ignored.');
          
          return successfulScrobble(event);
        })
        .catch(err => {
          return unsuccessfulScrobble(event, err);
        });
    }
  } else {
    isAlbum = typeof isAlbum === 'undefined' ? true : isAlbum;
    
    User.findById(event.from.id)
      .then(user => {
        if (Date.now() - user.lastScrobble <= 30000) {
          event.echo('You can\'t scrobble songs more than once in 30 seconds. If you need to scrobble a list of songs you can do that via /scrobble command.');
          throw undefined;
        }
        
        let track = user.track;
        
        return scrobbleSongs([{ artist: track.artist, name: track.name, album: track.album, duration: 0 }], user.key);
      })
      .then(res => {
        if (res.data.scrobbles['@attr'].ingored) 
          return successfulScrobble(event, 'Error. Track has been ignored.');
        
        return successfulScrobble(event);
      })
      .catch(err => {
        return unsuccessfulScrobble(event, err);
      });
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

export function scrobbleAlbum(event) {
  return User.findById(event.from.id)
    .then(user => {
      let tracks = user.album.tracks.map(track => {
        return {
          name: track.name,
          artist: user.album.artist,
          album: user.album.title,
          duration: track.duration
        };
      });
      
      return scrobbleSongs(tracks, user.key);
    });
}

export function successfulScrobble(event, text?) {
  User.findByIdAndUpdate(event.from.id, {
    $inc: { scrobbles: 1 }, 
    username: event.from.username, 
    lastScrobble: Date.now(),
    album: {}, 
    track: {}, 
    discogsResults: []
  })
    .then(() => {
      if (event.data) {
        event.echo('Scrobbled.');
        return bot.editMessageText({
          chat_id: event.from.id,
          message_id: event.message.message_id,
          text: text ? text : 'Success!'
        });
      }
      
      return bot.sendMessage({
        chat_id: event.from.id,
        text: text ? text : 'Success!'
      });
    })
    .then(() => {
      bot.setUserMilestone('source', event.from.id);
    });
}

export function unsuccessfulScrobble(event, err) {
  if (err) {
    console.log(err.data || err);
    err.data = err.data || {};
  
    if (err.data.error === 9) {
      //auth(event);
    } else {
      bot.sendMessage({
        chat_id: event.from.id,
        text: 'Oops, something went wrong. Please try again later. If it goes on constantly please let us know via /report command.'
      })
      .then(() => {
        bot.setUserMilestone('source', event.from.id);
      });
    }
  }
}