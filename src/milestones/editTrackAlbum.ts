import bot from '../bot';
import { 
  scrobbleSong
} from '../helpers/scrobble';
import User from '../models/user';
import { error } from '../helpers/utils';


export default function (milestone) {
  milestone.on('text', message => {
    let album = message.text;
    
    User.findByIdAndUpdate(message.from.id, { 'track.album': album })
      .then(() => {
        message.text = '';
        scrobbleSong(message);
      })
      .catch(err => {
        error(message, err);
      });
  });
}