import { sendToAdmin } from '../helpers/utils';
import { Scene } from 'telegraf-flow';


const wishScene = new Scene('wish');

wishScene.enter(ctx => {
  ctx.reply('Ok, I\'m listening. /cancel');
});

wishScene.command('cancel', async ctx => {
  await ctx.reply('Canceled.');
  ctx.flow.leave();
});

wishScene.on('text', async ctx => {
  await sendToAdmin(`A wish from @${ctx.from.username}: ${ctx.message.text}`);
  await ctx.reply('Thanks! We have successfully received your wish.');
  ctx.flow.leave();
});

export default wishScene;
  
  