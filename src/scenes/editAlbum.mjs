import Telegram from 'telegraf';
import Scene from 'telegraf/scenes/base';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';


const editAlbumScene = new Scene('edit_album');

editAlbumScene.enter(async (ctx) => {
  const album = ctx.session.user.album;
  await ctx.editMessageText('Edit the album and send it in the following format back to me:');
  await ctx.reply(`${album.artist}\n${album.title}`,
    Telegram.Markup.inlineKeyboard([
      Telegram.Markup.callbackButton('Next', 'NEXT'),
      Telegram.Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
});

editAlbumScene.on('text', async (ctx) => {
  const [artist, title] = ctx.message.text.split('\n');

  if (!artist || !title) {
    return ctx.reply('Format:\n\nArtist Name\nAlbum Title');
  }

  ctx.session.user = await findUserByIdAndUpdate(ctx.from.id, {
    'album.artist': artist,
    'album.title': title,
  });

  await ctx.scene.enter('edit_album_tracks');
});

editAlbumScene.action('NEXT', ctx => ctx.scene.enter('edit_album_tracks'));

export default editAlbumScene;
