import { Markup, Extra } from 'telegraf';
import { Scene } from 'telegraf-flow';


const noAlbumInfoScene = new Scene('no_album_info');

noAlbumInfoScene.enter(ctx => {
  ctx.reply('Last.fm and Discogs.com don\'t have any data about this album. Would you like to enter album tracklist manually?',
    Extra.webPreview(false).markup(Markup.inlineKeyboard([
      Markup.callbackButton('Yes', 'YES'),
      Markup.callbackButton('Cancel', 'CANCEL')
    ]))
  );
});

noAlbumInfoScene.on('callback_query', async ctx => {
  switch (ctx.callbackQuery.data) {
    case 'YES': ctx.flow.enter('set_tracks'); break;
    case 'CANCEL':
      await ctx.editMessageText('Canceled.');
      ctx.flow.leave();
  }
});

export default noAlbumInfoScene;