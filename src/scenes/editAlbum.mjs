import Telegraf from 'telegraf';
import TelegrafFlow from 'telegraf-flow';
import { scrobbleAlbum } from '../helpers/scrobbler';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';


const editAlbumScene = new TelegrafFlow.Scene('edit_album');

editAlbumScene.enter(async (ctx) => {
  const tracks = ctx.user.album.tracks;
  await ctx.editMessageText('Edit the track list and send it back to me:');
  await ctx.reply(`${tracks.map(track => track.name).join('\n')}`,
    Telegraf.Markup.inlineKeyboard([
      Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
});

editAlbumScene.on('text', async (ctx) => {
  const tracks = ctx.message.text.split('\n').map(name => ({ name }));
  ctx.user = await findUserByIdAndUpdate(ctx.from.id, { 'album.tracks': tracks });
  await scrobbleAlbum(ctx);
});

export default editAlbumScene;
