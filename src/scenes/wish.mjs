import Telegram from 'telegraf';
import Scene from 'telegraf/scenes/base';
import { sendToAdmin } from '../helpers/util';


const wishScene = new Scene('wish');

wishScene.enter(async (ctx) => {
  await ctx.reply('OK, I\'m listening. Tell me what feature you do want...',
    Telegram.Markup.inlineKeyboard([
      Telegram.Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
});

wishScene.on('text', async (ctx) => {
  await sendToAdmin(`A wish from @${ctx.from.username}: ${ctx.message.text}`);
  await ctx.reply('Thanks! We have successfully received your wish');
  await ctx.scene.leave();
});

export default wishScene;
