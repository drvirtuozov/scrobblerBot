import Telegram from 'telegraf';
import Scene from 'telegraf/scenes/base';
import { scrobbleTrackFromDB } from '../helpers/scrobbler';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';


const editTrackAlbumScene = new Scene('edit_track_album');

editTrackAlbumScene.enter(async (ctx) => {
  await ctx.editMessageText('Enter album title',
    Telegram.Markup.inlineKeyboard([
      Telegram.Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
});

editTrackAlbumScene.on('text', async (ctx) => {
  const album = ctx.message.text;
  ctx.session.user = await findUserByIdAndUpdate(ctx.from.id, { 'track.album': album });
  await scrobbleTrackFromDB(ctx);
  await ctx.scene.leave();
});

export default editTrackAlbumScene;
