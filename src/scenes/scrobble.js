import { Markup } from 'telegraf';
import { Scene } from 'telegraf-flow';


const scrobbleScene = new Scene('scrobble');

scrobbleScene.enter(ctx => {
  ctx.reply('What do you want to scrobble?', Markup.inlineKeyboard([[
    Markup.callbackButton('Song', 'SONG'),
    Markup.callbackButton('List of Songs', 'LIST'),
    Markup.callbackButton('Album', 'ALBUM')
  ], [ Markup.callbackButton('Cancel', 'CANCEL') ]]).extra());
});

scrobbleScene.on('callback_query', async ctx => {
  switch (ctx.callbackQuery.data) {
    case 'SONG': ctx.flow.enter('search_song'); break;
    case 'LIST': ctx.flow.enter('song_list'); break;
    case 'ALBUM': ctx.flow.enter('search_album'); break;
    case 'CANCEL': 
      await ctx.editMessageText('Canceled.');
      ctx.flow.leave();
  }
});

export default scrobbleScene;