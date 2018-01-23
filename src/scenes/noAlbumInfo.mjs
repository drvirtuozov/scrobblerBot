import Telegraf from 'telegraf';
import TelegrafFlow from 'telegraf-flow';


const noAlbumInfoScene = new TelegrafFlow.Scene('no_album_info');

noAlbumInfoScene.enter(async (ctx) => {
  await ctx.telegram.editMessageText(ctx.from.id, ctx.flow.state.messageIdToEdit, null,
    'Last.fm has no any info about this album. Would you like to enter its track list manually?',
      Telegraf.Extra.webPreview(false).markup(Telegraf.Markup.inlineKeyboard([
        Telegraf.Markup.callbackButton('Yes', 'YES'),
        Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
      ])));
});

noAlbumInfoScene.action('YES', async (ctx) => {
  await ctx.flow.enter('set_album_tracks', ctx.flow.state);
});

export default noAlbumInfoScene;
