import Telegraf from 'telegraf';
import TelegrafFlow from 'telegraf-flow';
import { scrobbleTracklist } from '../helpers/scrobbler';


const tracklistScene = new TelegrafFlow.Scene('tracklist');

tracklistScene.enter(async (ctx) => {
  const text = `OK. Send me a track list with the following syntax:\n\n${
    new Array(3).fill('Artist | Track Name | Album Title').join('\n')}`;
  const extra = Telegraf.Markup.inlineKeyboard([
    Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
  ]).extra();

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, extra);
    return;
  }

  await ctx.reply(text, extra);
});

tracklistScene.on('text', async (ctx) => {
  await scrobbleTracklist(ctx);
});

export default tracklistScene;
