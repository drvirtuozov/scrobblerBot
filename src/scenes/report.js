import { sendToAdmin } from '../helpers/utils';
import { Scene } from 'telegraf-flow';


const reportScene = new Scene('report');

reportScene.enter(ctx => {
  ctx.reply('Ok, I\'m listening. Tell me about a bug... /cancel');
});

reportScene.command('cancel', async ctx => {
  await ctx.reply('Canceled.');
  ctx.flow.leave();
});

reportScene.on('text', async ctx => {
  await sendToAdmin(`A report from @${ctx.from.username}: ${ctx.message.text}`);
  await ctx.reply('Thanks! We have successfully received your bug report.');
  ctx.flow.leave();
});

export default reportScene;