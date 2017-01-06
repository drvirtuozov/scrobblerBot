import crypto from 'crypto';
import bot from '../bot';
import User from '../models/user';
import { auth } from './actions';


const songs = require('../songs.json');

export function cancelQuery(query) {
  bot.editMessageText({
    chat_id: query.from.id,
    message_id: query.message.message_id,
    text: 'Canceled.'
  })
  .then(() => {
    bot.setUserMilestone('source', query.from.id);
  });
}

export function isUserAuthorized(id, callback) {
  User.findById(id)
    .then(user => {
      user = user || {};
      callback(user.key ? true : false);
    });
}

export function sendToAdmin(text) {
  return bot.sendMessage({
    chat_id: 1501719,
    text
  });
}

export function md5(string: string): string {
  return crypto.createHash('md5').update(string, 'utf8').digest('hex');
}

export function getRandomFavSong() {
  let index = Math.floor(Math.random() * songs.length);
  
  return songs[index];
}

export function error(event, err) {
  if (err) {
    if (event.data) {
      if (err.data) {
        if (err.data.error === 14 || err.data.error === 4) {
          bot.editMessageText({
            chat_id: event.from.id,
            message_id: event.message.message_id,
            text: 'Access has not been granted.'
          })
          .then(() => {
            auth(event);
          });
          
          return;
        }
      }
      
      return event.echo('Oops, something went wrong. Please try again later.');  
    }
    
    console.log(err.data || err);
    event.echo('Oops, something went wrong. Please try again later.\nIf it goes on constantly please let us know via /report command.');
  }
}

export function utf8(text: string): string {
  return unescape(decodeURIComponent(text));
}