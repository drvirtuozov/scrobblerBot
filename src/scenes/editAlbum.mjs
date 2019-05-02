import Telegram from 'telegraf';
import Scene from 'telegraf/scenes/base';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';


const editAlbumScene = new Scene('edit_album');

editAlbumScene.enter(async (ctx) => {
  const { artist, title } = ctx.session.user.album;
  const { title: titleCleaned } = ctx.scene.state.albumCleaned || {};
  await ctx.editMessageText('Edit the album and send it with the following format back to me:');
  await ctx.reply(`${artist}\n${titleCleaned || title}`,
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

  ctx.scene.state.messageIdToReply = ctx.message.message_id;
  ctx.session.user = await findUserByIdAndUpdate(ctx.from.id, {
    'album.artist': artist,
    'album.title': title,
  });

  if (ctx.scene.state.albumCleaned) {
    delete ctx.scene.state.albumCleaned.title;
  }

  return ctx.scene.enter('edit_album_tracks', ctx.scene.state);
});

editAlbumScene.action('NEXT', async (ctx) => {
  await ctx.scene.enter('edit_album_tracks', ctx.scene.state);
});

export default editAlbumScene;
