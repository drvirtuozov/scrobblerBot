import { Markup } from 'telegraf';
import { Scene } from 'telegraf-flow';
import { scrobbleTrack } from '../helpers/scrobbler';
import { error } from '../helpers/utils';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';


const editTrackAlbumScene = new Scene('edit_track_album');

editTrackAlbumScene.enter(ctx => {
  ctx.editMessageText('Send me album title please.', 
    Markup.inlineKeyboard([
      Markup.callbackButton('Cancel', 'CANCEL')
    ]).extra());
});

editTrackAlbumScene.on('text', async ctx => {
  try {
    let album = ctx.message.text,
      user = await findUserByIdAndUpdate(ctx.from.id, { 'track.album': album });

    delete ctx.update.message.text;
    scrobbleTrack(ctx);  
  } catch (e) {
    error(ctx, e);
  }
});

export default editTrackAlbumScene;