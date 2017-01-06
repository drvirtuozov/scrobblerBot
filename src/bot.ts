import Bot from 'botogram';
import User from './models/user';
import albumChosenMilestone from './milestones/albumChosen';
import alertMilestone from './milestones/alert';
import editAlbumMilestone from './milestones/editAlbum';
import editTrackAlbumMilestone from './milestones/editTrackAlbum';
import noInfoMilestone from './milestones/noInfo';
import reportMilestone from './milestones/report';
import scrobbleMilestone from './milestones/scrobble';
import searchAlbumMilestone from './milestones/searchAlbum';
import searchSongMilestone from './milestones/searchSong';
import setTracksMilestone from './milestones/setTracks';
import songListMilestone from './milestones/songList';
import wishMilestone from './milestones/wish';
import { sendToAdmin, error, isUserAuthorized } from './helpers/utils';
import { auth, help, whoami, report, wish } from './helpers/actions';
import { scrobble, scrobbleSong } from './helpers/scrobble';
import { callbackQueryHandler } from './helpers/handlers';
import config from './config';


const bot = new Bot(config.token);

bot.on('/start', (message, next) => {
  User.findById(message.from.id)
    .then(user => {
      if (!user) {
        return User.create({
          _id: message.from.id,
          username: message.from.username
        })
        .then(() => {
          return message.echo(`Hello, ${message.from.first_name}!\n\nThis bot provides you ability to scrobble songs, albums or lists of songs in text mode. To take advantage of these opportunities you have to grant access to your Last.fm account...`);
        })
        .then(() => {
          return auth(message);
        })
        .then(() => {
          sendToAdmin(`We've got a new user! @${message.from.username}`);
        });
      } else {
        next();
      }
    })
    .catch(err => {
      error(message, err);
    });
});

bot.on('text', message => {
  isUserAuthorized(message.from.id, yes => {
    yes ? scrobbleSong(message) : auth(message);
  });
});

bot.on('/alert', (message, next) => {
  if (message.from.id === 1501719) {
    message.echo('Type an alert... /cancel')
    .then(() => {
      bot.setUserMilestone('alert', message.from.id);
    });
  } else {
    next();
  }
});

bot.on('callback_query', callbackQueryHandler);

bot.milestone('album_chosen', albumChosenMilestone);
bot.milestone('alert', alertMilestone);
bot.milestone('edit_album', editAlbumMilestone);
bot.milestone('edit_track_album', editTrackAlbumMilestone);
bot.milestone('no_info', noInfoMilestone);
bot.milestone('report', reportMilestone);
bot.milestone('scrobble', scrobbleMilestone);
bot.milestone('search_album', searchAlbumMilestone);
bot.milestone('search_song', searchSongMilestone);
bot.milestone('set_tracks', setTracksMilestone);
bot.milestone('song_list', songListMilestone);
bot.milestone('wish', wishMilestone);

bot.milestones.on('/help', help);
bot.milestones.on('/auth', auth);

bot.milestones.on('/scrobble', message => {
  isUserAuthorized(message.from.id, yes => {
    yes ? scrobble(message) : auth(message);
  });
});

bot.milestones.on('/whoami', message => {
  isUserAuthorized(message.from.id, yes => {
    yes ? whoami(message) : auth(message);
  });
});

bot.milestones.on('/wish', message => {
  isUserAuthorized(message.from.id, yes => {
    yes ? wish(message) : auth(message);
  });
});

bot.milestones.on('/report', message => {
  isUserAuthorized(message.from.id, yes => {
    yes ? report(message) : auth(message);
  });
});

bot.milestones.on('command', message => {
  message.echo('If you are confused type /help.');
});

export default bot;