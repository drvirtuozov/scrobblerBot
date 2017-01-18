import { Markup } from 'telegraf';
import { Scene } from 'telegraf-flow';
import { 
  scrobbleAlbum, successfulScrobble, unsuccessfulScrobble
} from '../helpers/scrobble';
import { findUserByIdWithAlbum, findUserByIdAndSetAlbumTracks } from '../helpers/dbmanager';


const editAlbumScene = new Scene('edit_album');

editAlbumScene.enter(async ctx => {
  let user = await findUserByIdWithAlbum(ctx.from.id);
  ctx.editMessageText(`Edit the tracklist and send it back to me:\n\n${user.album.tracks.map(track => track.name).join('\n')}`,
    Markup.inlineKeyboard([ Markup.callbackButton('Cancel', 'CANCEL') ]).extra()
  );
});

editAlbumScene.on('text', async ctx => {
  try {
    let tracks = message.text.split('\n').map(name => ({ name }));
    
    await findUserByIdAndSetAlbumTracks(ctx.from.id, tracks);
    await scrobbleAlbum(message);
    successfulScrobble(message);
  } catch (e) {
    unsuccessfulScrobble(ctx, e);
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