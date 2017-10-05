const TelegrafFlow = require('telegraf-flow');
const wishScene = require('../scenes/wish');
const authScene = require('../scenes/auth');
const searchTrackScene = require('../scenes/searchTrack');
const tracklistScene = require('../scenes/tracklist');
const searchAlbumScene = require('../scenes/searchAlbum');
const noAlbumInfoScene = require('../scenes/noAlbumInfo');
const editAlbumScene = require('../scenes/editAlbum');
const setAlbumTracksScene = require('../scenes/setAlbumTracks');
const editTrackAlbumScene = require('../scenes/editTrackAlbum');
const { start, whoami, help, recentTracks } = require('../helpers/actions');
const auth = require('./auth');
const limiter = require('./limiter');


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
flow.command('recent', auth, recentTracks);
flow.command('auth', ctx => ctx.flow.enter('auth'));
flow.command('wish', ctx => ctx.flow.enter('wish'));

flow.register(wishScene);
flow.register(authScene);
flow.register(searchTrackScene);
flow.register(tracklistScene);
flow.register(searchAlbumScene);
flow.register(noAlbumInfoScene);
flow.register(editAlbumScene);
flow.register(setAlbumTracksScene);
flow.register(editTrackAlbumScene);

module.exports = flow.middleware();
