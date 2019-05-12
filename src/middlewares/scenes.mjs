import url from 'url';
import Stage from 'telegraf/stage';
import wishScene from '../scenes/wish';
import authScene from '../scenes/auth';
import searchTrackScene from '../scenes/searchTrack';
import tracklistScene from '../scenes/tracklist';
import searchAlbumScene from '../scenes/searchAlbum';
import noAlbumInfoScene from '../scenes/noAlbumInfo';
import editAlbumScene from '../scenes/editAlbum';
import editAlbumTracksScene from '../scenes/editAlbumTracks';
import setAlbumTracksScene from '../scenes/setAlbumTracks';
import editTrackAlbumScene from '../scenes/editTrackAlbum';
import searchAlbumAppleScene from '../scenes/searchAlbumApple';
import searchTrackAppleScene from '../scenes/searchTrackApple';
import auth from '../middlewares/auth';
import limiter from '../middlewares/limiter';
import { start, help, whoami, recent } from '../handlers/commands';


const stage = new Stage();

stage.command('start', async (ctx, next) => {
  if (ctx.session.user) {
    await next();
    return;
  }

  await start(ctx, next);
});

stage.command('help', ctx => help(ctx));
stage.command('whoami', auth, ctx => whoami(ctx));
stage.command('recent', auth, ctx => recent(ctx));
stage.command('auth', ctx => ctx.scene.enter('auth'));
stage.command('wish', ctx => ctx.scene.enter('wish'));

// url handler before scenes' text handlers for convinient mobile experience
// if there are some non-completed actions in those scenes
stage.hears(/^https?:\/\/.+$/g, async (ctx, next) => {
  const u = new url.URL(ctx.message.text);

  if (u.hostname === 'itunes.apple.com') {
    ctx.scene.state.apple = {
      countryCode: u.pathname.slice(u.pathname.indexOf('/') + 1, 3),
      albumID: u.pathname.slice(u.pathname.lastIndexOf('/') + 1),
      songID: u.searchParams.get('i'),
    };

    if (ctx.scene.state.apple.songID) {
      return ctx.scene.enter('search_track_apple', ctx.scene.state);
    }

    return ctx.scene.enter('search_album_apple', ctx.scene.state);
  }

  return next();
});

stage.hears(/^\/\w+$/, async (ctx) => {
  await ctx.reply('If you are confused type /help');
});

stage.hears('🎵 Track', auth, limiter, ctx => ctx.scene.enter('search_track'));
stage.hears('💽 Album', auth, limiter, ctx => ctx.scene.enter('search_album'));
stage.hears('📃 Tracklist', auth, limiter, ctx => ctx.scene.enter('tracklist'));

stage.register(wishScene);
stage.register(authScene);
stage.register(searchTrackScene);
stage.register(tracklistScene);
stage.register(searchAlbumScene);
stage.register(noAlbumInfoScene);
stage.register(editAlbumScene);
stage.register(editAlbumTracksScene);
stage.register(setAlbumTracksScene);
stage.register(editTrackAlbumScene);
stage.register(searchAlbumAppleScene);
stage.register(searchTrackAppleScene);

export default stage.middleware();
