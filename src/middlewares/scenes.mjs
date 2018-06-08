import TelegrafFlow from 'telegraf-flow';
import wishScene from '../scenes/wish';
import authScene from '../scenes/auth';
import searchTrackScene from '../scenes/searchTrack';
import tracklistScene from '../scenes/tracklist';
import searchAlbumScene from '../scenes/searchAlbum';
import noAlbumInfoScene from '../scenes/noAlbumInfo';
import editAlbumScene from '../scenes/editAlbum';
import setAlbumTracksScene from '../scenes/setAlbumTracks';
import editTrackAlbumScene from '../scenes/editTrackAlbum';
import { start, whoami, help, recent } from '../handlers/commands';
import auth from './auth';
import limiter from './limiter';
import { setProxyEnabled } from '../helpers/proxy';
import admin from '../middlewares/admin';


const flow = new TelegrafFlow();

flow.hears('🎵 Track', auth, limiter, ctx => ctx.flow.enter('search_track'));
flow.hears('💽 Album', auth, limiter, ctx => ctx.flow.enter('search_album'));
flow.hears('📃 Tracklist', auth, limiter, ctx => ctx.flow.enter('tracklist'));

flow.command('start', async (ctx, next) => {
  if (ctx.user) {
    await next();
    return;
  }

  await start(ctx, next);
});

flow.command('help', help);
flow.command('whoami', auth, whoami);
flow.command('recent', auth, recent);
flow.command('auth', ctx => ctx.flow.enter('auth'));
flow.command('wish', ctx => ctx.flow.enter('wish'));
flow.command('proxy', admin, ctx => ctx.reply(`Proxy status was set to ${setProxyEnabled()}`));

flow.register(wishScene);
flow.register(authScene);
flow.register(searchTrackScene);
flow.register(tracklistScene);
flow.register(searchAlbumScene);
flow.register(noAlbumInfoScene);
flow.register(editAlbumScene);
flow.register(setAlbumTracksScene);
flow.register(editTrackAlbumScene);

export default flow.middleware();
