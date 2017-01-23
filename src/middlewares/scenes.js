import TelegrafFlow from 'telegraf-flow';
import reportScene from '../scenes/report';
import wishScene from '../scenes/wish';
import authScene from '../scenes/auth';
import scrobbleScene from '../scenes/scrobble';
import searchTrackScene from '../scenes/search_track';
import tracklistScene from '../scenes/tracklist';
import searchAlbumScene from '../scenes/search_album';
import noAlbumInfoScene from '../scenes/no_album_info';
import editAlbumScene from '../scenes/edit_album';
import setAlbumTracksScene from '../scenes/set_album_tracks';
import editTrackAlbumScene from '../scenes/edit_track_album';
import { start, whoami, help, recentTracks } from '../helpers/actions';
import auth from './auth';


const flow = new TelegrafFlow();

flow.command('start', start);
flow.command('help', help);
flow.command('whoami', auth, whoami);
flow.command('recent', auth, recentTracks);

flow.command('auth', ctx => {
  ctx.flow.enter('auth');
});

flow.command('scrobble', auth, ctx => {
  ctx.flow.enter('scrobble');
});

flow.command('wish', ctx => {
  ctx.flow.enter('wish');
});

flow.command('report', ctx => {
  ctx.flow.enter('report');
});

flow.register(reportScene);
flow.register(wishScene);
flow.register(authScene);
flow.register(scrobbleScene);
flow.register(searchTrackScene);
flow.register(tracklistScene);
flow.register(searchAlbumScene);
flow.register(noAlbumInfoScene);
flow.register(editAlbumScene);
flow.register(setAlbumTracksScene);
flow.register(editTrackAlbumScene);

export default flow.middleware();