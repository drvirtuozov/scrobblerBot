const TelegrafFlow = require('telegraf-flow');
const reportScene = require('../scenes/report');
const wishScene = require('../scenes/wish');
const authScene = require('../scenes/auth');
const scrobbleScene = require('../scenes/scrobble');
const searchTrackScene = require('../scenes/searchTrack');
const tracklistScene = require('../scenes/tracklist');
const searchAlbumScene = require('../scenes/searchAlbum');
const noAlbumInfoScene = require('../scenes/noAlbumInfo');
const editAlbumScene = require('../scenes/editAlbum');
const setAlbumTracksScene = require('../scenes/setAlbumTracks');
const editTrackAlbumScene = require('../scenes/editTrackAlbum');
const { start, whoami, help, recentTracks } = require('../helpers/actions');
const auth = require('./auth');
const { error } = require('../helpers/utils');


const flow = new TelegrafFlow();

flow.command('start', async (ctx, next) => {
  try {
    await start(ctx, next);
  } catch (e) {
    error(ctx, e);
  }
});

flow.command('help', help);
flow.command('whoami', auth, whoami);
flow.command('recent', auth, recentTracks);

flow.command('auth', (ctx) => {
  ctx.flow.enter('auth');
});

flow.command('scrobble', auth, (ctx) => {
  ctx.flow.enter('scrobble');
});

flow.command('wish', (ctx) => {
  ctx.flow.enter('wish');
});

flow.command('report', (ctx) => {
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

module.exports = flow.middleware();
