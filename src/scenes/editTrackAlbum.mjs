import Telegraf from 'telegraf';
import TelegrafFlow from 'telegraf-flow';
import { scrobbleTrackFromDB } from '../helpers/scrobbler';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';


const editTrackAlbumScene = new TelegrafFlow.Scene('edit_track_album');

editTrackAlbumScene.enter(async (ctx) => {
  await ctx.editMessageText('Enter album title',
    Telegraf.Markup.inlineKeyboard([
      Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
});

editTrackAlbumScene.on('text', async (ctx) => {
  const album = ctx.message.text;
  ctx.user = await findUserByIdAndUpdate(ctx.from.id, { 'track.album': album });
  await scrobbleTrackFromDB(ctx);
});

export default editTrackAlbumScene;
