import bot from '../bot';
import { 
  scrobbleAlbum, successfulScrobble, unsuccessfulScrobble
} from '../helpers/scrobble';
import User from '../models/user';
import { cancelQuery } from '../helpers/utils';


export default function (milestone) {
  milestone.on('text', message => {
    let tracks = message.text.split('\n').map(name => ({ name }));
    
    User.findByIdAndUpdate(message.from.id, { 'album.tracks': tracks })
      .then(() => {
        return scrobbleAlbum(message);
      })
      .then(() => {
        return successfulScrobble(message);
      })
      .catch(err => {
        return unsuccessfulScrobble(message, err);
      });
  });
  
  milestone.on('callback_query', query => {
    if (query.data === 'CANCEL') {
      cancelQuery(query);
    }
  });
}