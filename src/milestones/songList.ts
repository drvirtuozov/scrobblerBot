import User from '../models/user';
import bot from '../bot';
import { 
  scrobbleSongs, successfulScrobble, unsuccessfulScrobble
} from '../helpers/scrobble';
import { cancelQuery } from '../helpers/utils';


export default function (milestone) {
  milestone.on('text', message => {
    Promise.resolve()
      .then(() => {
        let tracks = message.text.split('\n')
          .map(string => {
            if (string.split('|').length < 2) {
              message.echo('Please, send me valid data with this syntax:\n\nArtist | Song Name | Album Title');
              throw undefined;
            }
            
            let track = string.split('|');
            
            return {
              name: track[1],
              artist: track[0],
              album: track[2] || '',
              duration: 300
            };
          }),
          parts = [];
          
        while (tracks[0]) {
          parts.push(tracks.slice(0, 50));
          tracks = tracks.slice(50);
        }
        
        return parts;
      })
      .then(parts => {
        return User.findById(message.from.id)
          .then(user => {
            return Promise.all(parts.map(part => scrobbleSongs(part, user.key)));
          });
      })
      .then(results => {
        let ignored = [];
        
        results.forEach(result => {
          result.data.scrobbles.scrobble
            .filter(scrobble => scrobble.ignoredMessage.code === '1')
            .forEach(scr => ignored.push(scr));
        });
        
        if (ignored.length)
          return successfulScrobble(message, `Success, but...\nThe following tracks have been ignored:\n\n${ignored.map(track => `${track.artist['#text']} | ${track.track['#text']} | ${track.album['#text']}`).join('\n')}`);
        
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