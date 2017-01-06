import axios from 'axios';
import User from '../models/user';
import { md5, getRandomFavSong, error } from './utils';
import config from '../config';
import bot from '../bot';


export function callbackQueryHandler(query) {
  if (query.data === 'ACCESS_GRANTED') {
    User.findById(query.from.id)
      .then(user => {
        let token = user.token,
          sig = md5(`api_key${config.lastfm.key}methodauth.getsessiontoken${token}${config.lastfm.secret}`),
          song = getRandomFavSong();
        
        return axios(`${config.lastfm.url}auth.getsession&format=json&token=${token}&api_key=${config.lastfm.key}&api_sig=${sig}`)
          .then(res => {
            let username = res.data.session.name;
            
            bot.editMessageText({
              message_id: query.message.message_id,
              text: `Glad to see you, <a href="http://www.last.fm/user/${username}">${username}</a>!\n\nNow you can scrobble your first song. To do it just type artist name, song name and album title separated by new lines. Example:\n\n${song.artist}\n${song.name}\n${song.album}\n\nType /help for more info.`,
              chat_id: query.from.id,
              parse_mode: 'HTML',
              disable_web_page_preview: true
            });
            
            return User.findByIdAndUpdate(query.from.id, {
              account: res.data.session.name, 
              key: res.data.session.key
            });
          });
      })
      .catch(err => {
        return error(query, err);
      });
  }
}