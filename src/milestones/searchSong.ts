import axios from 'axios';
import bot from '../bot';
import config from '../config';
import { scrobbleSong } from '../helpers/scrobble';
import User from '../models/user';
import { error, cancelQuery } from '../helpers/utils';


export default function (milestone) {
  milestone.on('inline_query', query => {
    if (!query.query) return query.echo('Type your query below...');
    
    axios(`${config.lastfm.url}track.search&track=${encodeURI(query.query)}&api_key=${config.lastfm.key}&format=json`)
      .then(res => {
        let tracks = res.data.results.trackmatches.track;
        
        let results = tracks  
          .map((track, i) => {
            let photo_url = track.image[2]['#text'] || 'http://img2-ak.lst.fm/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png';
            
            return {
              type: 'article',
              id: String(i),
              thumb_url: photo_url,
              photo_width: 174,
              photo_height: 174,
              title: track.name,
              description: `${track.artist}`,
              input_message_content: {
                message_text: `${track.artist}\n${track.name}`
              }
            };
          });
          
        return bot.answerInlineQuery({
          inline_query_id: query.id,
          results: results,
        });
      })
      .catch(err => {
        return error(query, err);
      });
  });
  
  milestone.on('text', message => {
    let track = message.text.split('\n');
    
    if (track.length > 2) {
      scrobbleSong(message);
    } else if (track.length === 2) {
      axios(encodeURI(`${config.lastfm.url}track.getInfo&api_key=${config.lastfm.key}&artist=${track[0]}&track=${track[1]}&format=json`))
        .then(res => {
          if (res.data.error) {
            scrobbleSong(message);
            throw undefined;
          }
          
          let track = res.data.track || {};
            track.album = track.album || {};
          let artist = track.artist.name || '',
            name = track.name || '',
            album = track.album.title || '';
          
          return User.findByIdAndUpdate(message.from.id, { track: { name, artist, album } }, { new: true });
        })
        .then(user => {
          let track = user.track;
          
          if (track.album) {
            return bot.sendMessage({
              chat_id: message.from.id,
              text: `Last.fm has additional data about this track:\n\n${track.artist}\n${track.name}\n${track.album}\n\nWould you like to scrobble this track with the new data or leave it as is?`,
              disable_web_page_preview: true,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: 'Scr with new data', callback_data: 'SCR' }, 
                    { text: 'Leave it as is', callback_data: 'LEAVE' }
                  ],
                  [
                    { text: 'Cancel', callback_data: 'CANCEL' }  
                  ]
                ]
              }
            });
          } else {
            return bot.sendMessage({
              chat_id: message.from.id,
              text: `Last.fm has no album data about this track. Would you like to enter album title?`,
              disable_web_page_preview: true,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: 'Yes', callback_data: 'YES' }, 
                    { text: 'No', callback_data: 'NO' }
                  ]
                ]
              }
            });
          }
        })
        .catch(err => {
          return error(message, err);
        });
    } else {
      message.echo('Format:\n\nArtist\nSong Name\nAlbum Title');
    }
  });
  
  milestone.on('callback_query', query => {
    if (query.data === 'SCR') {
      scrobbleSong(query);
    } else if (query.data === 'LEAVE') {
      scrobbleSong(query, false);
    } else if (query.data === 'YES') {
      bot.setUserMilestone('edit_track_album', query.from.id);
      bot.editMessageText({
        chat_id: query.from.id,
        message_id: query.message.message_id,
        text: 'Send me album title please.'
      });
    } else if (query.data === 'NO') {
      scrobbleSong(query, false);
    } else if (query.data === 'CANCEL') {
      cancelQuery(query);
    }
  });
}