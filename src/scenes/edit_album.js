import { Markup } from 'telegraf';
import { Scene } from 'telegraf-flow';
import { scrobbleAlbum } from '../helpers/scrobbler';
import { findUserById, findUserByIdAndUpdate } from '../helpers/dbmanager';


const editAlbumScene = new Scene('edit_album');

editAlbumScene.enter(async ctx => {
  let user = await findUserById(ctx.from.id, 'album');
  ctx.editMessageText(`Edit the tracklist and send it back to me:\n\n${user.album.tracks.map(track => track.name).join('\n')}`,
    Markup.inlineKeyboard([ Markup.callbackButton('Cancel', 'CANCEL') ]).extra()
  );
});

editAlbumScene.on('text', async ctx => {
  try {
    let tracks = ctx.message.text.split('\n').map(name => ({ name }));
    
    await findUserByIdAndUpdate(ctx.from.id, { 'album.tracks': tracks });
    scrobbleAlbum(ctx);
  } catch (e) {
    error(ctx, e);
  }
});

editAlbumScene.on('callback_query', async ctx => {
  switch (ctx.callbackQuery.data) {
    case 'CANCEL': 
      await ctx.editMessageText('Canceled.');
      ctx.flow.leave();
  }
});

export default editAlbumScene;