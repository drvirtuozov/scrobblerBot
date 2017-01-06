import axios from 'axios';
import User from '../models/user';
import bot from '../bot';
import config from '../config';
import { error } from './utils';

export function alert(message) {
  User.find({})
    .then(users => {
      return bot.alert({
        chat_ids: users.map(user => user.id),
        text: message.text
      });
    })
    .then(res => {
      message.echo(res.description);
    });
}

export function auth(message) {
  return axios(`${config.lastfm.url}auth.gettoken&api_key=${config.lastfm.key}&format=json`)
    .then(res => {
      let token = res.data.token;
    
      bot.sendMessage({
        text: 'Please click the link below to grant access to your Last.fm account and then click OK button.',
        chat_id: message.from.id,
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [[
            {text: 'Grant access...', url: `http://www.last.fm/api/auth?api_key=${config.lastfm.key}&token=${token}`}, 
            {text: 'OK', callback_data: 'ACCESS_GRANTED'}
          ]]
        }
      });
      
      return User.findByIdAndUpdate(message.from.id, { token });
    })
    .catch(err => {
      return error(message, err);
    });
}

export function wish(message) {
  message.echo('Ok, I\'m listening... /cancel')
    .then(() => {
      bot.setUserMilestone('wish', message.from.id);
    });
}

export function report(message) {
  message.echo('Ok, I\'m listening. Tell me about a bug... /cancel')
    .then(() => {
      bot.setUserMilestone('report', message.from.id);
    });
}

export function help(message) {
  message.echo(`To scrobble a single song just type its info in this format:\n\n
    Artist\nSong Name\nAlbum Title\n\nIf you want to find a song or scrobble either a song list or 
    an album use our guide via /scrobble command.\n\nGrant access or change account - /auth.\n\n
    If you have any ideas or improvements for the bot please tell us about them via /wish command.`);
}

export function whoami(message) {
  User.findById(message.from.id)
    .then(user => {
      bot.sendMessage({
        text: `You are logged in as <a href="http://www.last.fm/user/${user.account}">${user.account}</a>.`, 
        chat_id: message.from.id,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
    });
}

export function nextAlbum(query, which) {
  let pages = query.message.text.slice(query.message.text.search(/\d?\d of \d\d/)).split(' of '),
    i = which === 'NEXT' ? 
      +pages[0] + 1 > +pages[1] ? 1 : +pages[0] + 1 :
      +pages[0] - 1 < 1 ? +pages[1] : +pages[0] - 1;
    
  User.findById(query.from.id, 'discogsResults')
    .then(user => {
      let id = user.discogsResults[i].id;
      
      return axios(`https://api.discogs.com/releases/${id}`);
    })
    .then(res => {
      if (res.data.tracklist.length) {
        let tracks = res.data.tracklist
        .map(track => { 
          let dur = track.duration.split(':'); 
          return { name: track.title, duration: dur[0] * 60 + +dur[1] };
        });
    
        return User.findByIdAndUpdate(query.from.id, { 'album.tracks': tracks }, { new: true });
      }
      
      return User.findByIdAndUpdate(query.from.id, { 'album.tracks': ['No tracks on this result'] }, { new: true });
    })
    .then(user => {
      let title = user.album.title,
        artist = user.album.artist;
      
      return bot.editMessageText({
        chat_id: query.from.id,
        message_id: query.message.message_id,
        text: `You are about to scrobble [${title}](${encodeURI(`http://www.last.fm/music/${artist}/${title}`)}) by [${artist}](${encodeURI(`http://www.last.fm/music/${artist}`)}). The following tracks have been found on Discogs.com and will be scrobbled:\n\n${user.album.tracks.map(track => track.name).join('\n')}\n\nResults: ${i} of ${user.discogsResults.length - 1}`,
        disable_web_page_preview: true,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Edit', callback_data: 'EDIT' },
              { text: '⬅️', callback_data: 'PREV' },
              { text: '➡️', callback_data: 'NEXT' },
              { text: 'Cancel', callback_data: 'CANCEL' }  
            ],
            [
              { text: 'OK', callback_data: 'OK' }
            ]
          ]
        }
      });
    })
    .catch(err => {
      error(query, err);
    });
}