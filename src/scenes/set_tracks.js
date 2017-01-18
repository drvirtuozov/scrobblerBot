import { Markup } from 'telegraf';
import { Scene } from 'telegraf-flow';
import { 
  scrobbleAlbum, successfulScrobble, unsuccessfulScrobble
} from '../helpers/scrobble';
import { findUserByIdAndSetAlbumTracks } from '../helpers/dbmanager';


const setTracksScene = new Scene('set_tracks');

setTracksScene.enter(ctx => {
  ctx.editMessageText('Just send me song names of the album separated by new lines.',
    Markup.inlineKeyboard([ Markup.callbackButton('Cancel', 'CANCEL') ]));
});

setTracksScene.on('text', async ctx => {
  try {
    let tracks = ctx.message.text.split('\n')
      .map(track => ({ name: track }));
    
    if (tracks.length <= 1) 
      return ctx.reply('Send me song names separated by new lines.');
    
    await findUserByIdAndSetAlbumTracks(ctx.from.id, tracks);
    await scrobbleAlbum(ctx);
    await successfulScrobble(message);
  } catch (e) {
    unsuccessfulScrobble(ctx, e);
  }
});

setTracksScene.on('callback_query', async ctx => {
  switch (ctx.callbackQuery.data) {
    case 'CANCEL':
      await ctx.editMessageText('Canceled.');
      ctx.flow.leave();
  }
});

export default setTracksScene;