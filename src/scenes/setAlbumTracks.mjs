import Telegraf from 'telegraf';
import TelegrafFlow from 'telegraf-flow';
import { scrobbleAlbum } from '../helpers/scrobbler';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';


const setAlbumTracksScene = new TelegrafFlow.Scene('set_album_tracks');

setAlbumTracksScene.enter(async (ctx) => {
  await ctx.editMessageText('Just send me song names of the album separated by new lines',
    Telegraf.Markup.inlineKeyboard([
      Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
});

setAlbumTracksScene.on('text', async (ctx) => {
  const tracks = ctx.message.text.split('\n').map(track => ({ name: track }));

  if (tracks.length <= 1) {
    await ctx.reply('Send me song names separated by new lines',
      Telegraf.Markup.inlineKeyboard([
        Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
      ]).extra());

    return;
  }

  ctx.user = await findUserByIdAndUpdate(ctx.from.id, { 'album.tracks': tracks });
  await scrobbleAlbum(ctx);
});

export default setAlbumTracksScene;
