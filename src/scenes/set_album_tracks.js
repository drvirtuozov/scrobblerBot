import { Markup } from 'telegraf';
import { Scene } from 'telegraf-flow';
import { scrobbleAlbum } from '../helpers/scrobbler';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';


const setAlbumTracksScene = new Scene('set_album_tracks');

setAlbumTracksScene.enter(ctx => {
  ctx.editMessageText('Just send me song names of the album separated by new lines.',
    Markup.inlineKeyboard([ Markup.callbackButton('Cancel', 'CANCEL') ]));
});

setAlbumTracksScene.on('text', async ctx => {
  try {
    let tracks = ctx.message.text.split('\n')
      .map(track => ({ name: track }));
    
    if (tracks.length <= 1) 
      return ctx.reply('Send me song names separated by new lines.');
    
    await findUserByIdAndUpdate(ctx.from.id, { 'album.tracks': tracks });
    scrobbleAlbum(ctx);
  } catch (e) {
    error(ctx, e);
  }
});

export default setAlbumTracksScene;