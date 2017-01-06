import axios from 'axios';
import User from '../models/user';
import bot from '../bot';
import config from '../config';
import { error, cancelQuery } from '../helpers/utils';


export default function (milestone) {
  milestone.on('inline_query', query => {
    if (!query.query) return query.echo('Type your query below...');
    
    axios(encodeURI(`${config.lastfm.url}album.search&album=${query.query}&api_key=${config.lastfm.key}&format=json`))
      .then(res => {
        let albums = res.data.results.albummatches.album;
        
        let results = albums
          .filter(album => album.name !== '(null)')
          .map((album, i) => {
            let photo_url = album.image[2]['#text'] || 'http://img2-ak.lst.fm/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png';
            
            return {
              type: 'article',
              id: String(i),
              thumb_url: photo_url,
              photo_width: 174,
              photo_height: 174,
              title: album.name,
              description: album.artist,
              input_message_content: {
                message_text: `${album.artist}\n${album.name}`
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
    let album = message.text.split('\n'),
      title = album[1],
      artist = album[0],
      foundOn = '',
      discogsResults = [];
      
    if (album.length < 2) return message.echo('Format:\n\nArtist\nAlbum Title');
    
    User.findByIdAndUpdate(message.from.id, { album: { title, artist }})
      .then(() => {
        
        return Promise.all([
          axios(encodeURI(`https://api.discogs.com/database/search?artist=${artist}&release_title=${title}&type=release&key=${config.discogs.key}&secret=${config.discogs.secret}`)),
          axios(encodeURI(`${config.lastfm.url}album.getinfo&api_key=${config.lastfm.key}&artist=${artist}&album=${title}&format=json`))
        ]);
      })
      .then(results => {
        if (results[0].data.results[0]) {
          let id = results[0].data.results[0].id;
          discogsResults = results[0].data.results;
          discogsResults.unshift({});
        
          return User.findByIdAndUpdate(message.from.id, { discogsResults })
            .then(() => {
              return axios(`https://api.discogs.com/releases/${id}`);
            })
            .then(res => {
              if (res.data.tracklist.length) {
                let tracks = res.data.tracklist
                  .map(track => { 
                    let dur = track.duration.split(':'); 
                    return { name: track.title, duration: dur[0] * 60 + +dur[1] };
                  });
                
                foundOn = 'Discogs.com';
                return tracks;
              }
            });
        } else if (results[1].data.album && results[1].data.album.tracks.track.length) {
          let album = results[1].data.album,
            tracks = album.tracks.track.map(track => { 
              return { name: track.name, duration: track.duration };
            });
            
          foundOn = 'Last.fm';
          return tracks;
        } else {
          throw undefined;
        }
      })
      .catch(() => {
        bot.sendMessage({
          chat_id: message.from.id,
          text: 'Last.fm and Discogs.com don\'t have any data about this album. Would you like to enter album tracklist manually?',
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [[
              { text: 'Yes', callback_data: 'YES' }, 
              { text: 'Cancel', callback_data: 'CANCEL' }
            ]]
          }
        })
        .then(() => {
          bot.setUserMilestone('no_info', message.from.id);
        });
      })
      .then(tracks => {
        return User.findByIdAndUpdate(message.from.id, { 'album.tracks': tracks }, { new: true });
      })
      .then(user => {
        let album = user.album,
          name = album.title,
          artist = album.artist,
          inline_keyboard = foundOn === 'Discogs.com' ? 
            [[
              { text: 'Edit', callback_data: 'EDIT' },
              { text: '⬅️', callback_data: 'PREV' },
              { text: '➡️', callback_data: 'NEXT' },
              { text: 'Cancel', callback_data: 'CANCEL' }  
            ],
            [
              { text: 'OK', callback_data: 'OK' }
            ]] : 
            [[
              { text: 'OK', callback_data: 'OK' }, 
              { text: 'Edit', callback_data: 'EDIT' },
              { text: 'Cancel', callback_data: 'CANCEL' }
            ]];
        
        return bot.sendMessage({
          chat_id: message.from.id,
          text: `You are about to scrobble [${name}](${encodeURI(`http://www.last.fm/music/${artist}/${name}`)}) by [${artist}](${encodeURI(`http://www.last.fm/music/${artist}`)}). The following tracks have been found on ${foundOn} and will be scrobbled:\n\n${album.tracks.map(track => track.name).join('\n')}${foundOn === 'Discogs.com' ? `\n\nResults: 1 of ${discogsResults.length - 1}` : ''}`,
          disable_web_page_preview: true,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard
          }
        });
      })
      .then(() => {
        bot.setUserMilestone('album_chosen', message.from.id);
      })
      .catch(err => {
        return error(message, err);
      });
  });
  
  milestone.on('callback_query', query => {
    if (query.data === 'CANCEL') {
      cancelQuery(query);
    }
  });
}