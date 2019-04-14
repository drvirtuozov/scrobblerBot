import Telegram from 'telegraf';
import Scene from 'telegraf/scenes/base';
import { scrobbleAlbum } from '../helpers/scrobbler';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';


const editAlbumTracksScene = new Scene('edit_album_tracks');

editAlbumTracksScene.enter(async (ctx) => {
  const tracks = ctx.session.user.album.tracks;
  const msg = 'Edit the album\'s tracklist and send it back to me:';

  if (ctx.callbackQuery) {
    await ctx.editMessageText(msg);
  } else {
    await ctx.reply(msg);
  }

  await ctx.reply(`${tracks.map(track => track.name).join('\n')}`,
    Telegram.Markup.inlineKeyboard([
      Telegram.Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
});

editAlbumTracksScene.on('text', async (ctx) => {
  const tracks = ctx.message.text.split('\n').map(name => ({ name }));
  ctx.session.user = await findUserByIdAndUpdate(ctx.from.id, { 'album.tracks': tracks });
  await scrobbleAlbum(ctx);
  await ctx.scene.leave();
});

export default editAlbumTracksScene;
