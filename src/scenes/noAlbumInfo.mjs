import Telegram from 'telegraf';
import Scene from 'telegraf/scenes/base';


const noAlbumInfoScene = new Scene('no_album_info');

noAlbumInfoScene.enter(async (ctx) => {
  await ctx.telegram.editMessageText(ctx.from.id, ctx.scene.state.messageIdToEdit, null,
    'Last.fm has no any info about this album. Would you like to enter its track list manually?',
      Telegram.Extra.webPreview(false).markup(Telegram.Markup.inlineKeyboard([
        Telegram.Markup.callbackButton('Yes', 'YES'),
        Telegram.Markup.callbackButton('Cancel', 'CANCEL'),
      ])));
});

noAlbumInfoScene.action('YES', async (ctx) => {
  await ctx.scene.enter('set_album_tracks', ctx.scene.state);
});

export default noAlbumInfoScene;
