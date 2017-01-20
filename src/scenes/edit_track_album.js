import { Scene } from 'telegraf-flow';
import { scrobbleSong } from '../helpers/scrobble';
import { error } from '../helpers/utils';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';


const editTrackAlbumScene = new Scene('edit_track_album');

editTrackAlbumScene.enter(ctx => {
  ctx.reply('Send me album title please.');
});

editTrackAlbumScene.on('text', async ctx => {
  try {
    let album = ctx.message.text,
      user = await findUserByIdAndUpdate(ctx.from.id, { 'track.album': album });

    delete ctx.update.message.text;
    scrobbleSong(ctx);  
  } catch (e) {
    error(ctx, e);
  }
});

export default editTrackAlbumScene;