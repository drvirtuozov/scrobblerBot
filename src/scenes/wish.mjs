import Telegraf from 'telegraf';
import TelegrafFlow from 'telegraf-flow';
import { sendToAdmin } from '../helpers/util';


const wishScene = new TelegrafFlow.Scene('wish');

wishScene.enter(async (ctx) => {
  await ctx.reply('OK, I\'m listening. Tell me what feature do you want...',
    Telegraf.Markup.inlineKeyboard([
      Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
});

wishScene.on('text', async (ctx) => {
  await sendToAdmin(`A wish from @${ctx.from.username}: ${ctx.message.text}`);
  await ctx.reply('Thanks! We have successfully received your wish');
  await ctx.flow.leave();
});

export default wishScene;
