import bot from '../bot';
import { 
  scrobbleAlbum, successfulScrobble, unsuccessfulScrobble
} from '../helpers/scrobble';
import User from '../models/user';
import { nextAlbum } from '../helpers/actions';
import { error, cancelQuery } from '../helpers/utils';


export default function (milestone) {
  milestone.on('callback_query', query => {
    if (query.data === 'OK') {
      scrobbleAlbum(query)
        .then(() => {
          return successfulScrobble(query);
        })
        .catch(err => {
          return unsuccessfulScrobble(query, err);
        });
    } else if (query.data === 'EDIT') {
      User.findById(query.from.id)
        .then(user => {
          return bot.editMessageText({
            chat_id: query.from.id,
            message_id: query.message.message_id,
            text: `Edit the tracklist and send it back to me:\n\n${user.album.tracks.map(track => track.name).join('\n')}`,
            reply_markup: {
              inline_keyboard: [[
                { text: 'Cancel', callback_data: 'CANCEL' }  
              ]]
            }
          });
        })
        .then(() => {
          bot.setUserMilestone('edit_album', query.from.id);
        })
        .catch(err => {
          error(query, err);
        });
    } else if (query.data === 'PREV') {
      nextAlbum(query, 'PREV');
    } else if (query.data === 'NEXT') { 
      nextAlbum(query, 'NEXT');  
    } else if (query.data === 'CANCEL') {
      cancelQuery(query);
    }
  });
}