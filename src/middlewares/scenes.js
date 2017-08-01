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
const { error, GLOBAL_KEYBOARD } = require('../helpers/utils');


const flow = new TelegrafFlow();

flow.hears('🎵 Track', auth, (ctx) => {
  ctx.enterScene('search_track');
});

flow.hears('💽 Album', auth, (ctx) => {
  ctx.enterScene('search_album');
});

flow.hears('📃 Tracklist', auth, (ctx) => {
  ctx.enterScene('tracklist');
});

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
  ctx.enterScene('auth');
});

flow.command('scrobble', auth, (ctx) => {
  ctx.reply('Deprecated command. Use the new keyboard below', GLOBAL_KEYBOARD);
});

flow.command('wish', (ctx) => {
  ctx.enterScene('wish');
});

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
