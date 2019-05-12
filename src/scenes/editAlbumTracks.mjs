import Telegram from 'telegraf';
import Scene from 'telegraf/scenes/base';
import { scrobbleAlbum } from '../helpers/scrobbler';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';


const editAlbumTracksScene = new Scene('edit_album_tracks');

editAlbumTracksScene.enter(async (ctx) => {
  const { tracks } = ctx.session.user.album;
  const { tracks: tracksCleaned } = ctx.scene.state.albumCleaned || {};
  const msg = 'Edit the album\'s tracklist and send it back to me:';

  if (ctx.callbackQuery) {
    await ctx.editMessageText(msg);
  } else {
    await ctx.reply(msg);
  }

  await ctx.reply(`${(tracksCleaned || tracks).map(track => track.name).join('\n')}`,
    Telegram.Markup.inlineKeyboard([
      Telegram.Markup.callbackButton('OK', 'OK'),
      Telegram.Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra(
      Telegram.Extra.inReplyTo(ctx.message ?
        ctx.message.message_id : ctx.scene.state.messageIdToReply),
      ),
    );
});

editAlbumTracksScene.on('text', async (ctx) => {
  const tracks = ctx.message.text.split('\n').map(name => ({ name }));
  ctx.session.user = await findUserByIdAndUpdate(ctx.from.id, { 'album.tracks': tracks });

  if (ctx.scene.state.albumCleaned) {
    delete ctx.scene.state.albumCleaned.tracks;
  }

  await scrobbleAlbum(ctx);
  await ctx.scene.leave();
});

editAlbumTracksScene.action('OK', async (ctx) => {
  await scrobbleAlbum(ctx);
});

export default editAlbumTracksScene;
