const { Markup } = require('telegraf');
const { Scene } = require('telegraf-flow');
const { sendToAdmin } = require('../helpers/utils');


const reportScene = new Scene('report');

reportScene.enter((ctx) => {
  ctx.reply('Ok, I\'m listening yo you. Tell me about a bug...',
    Markup.inlineKeyboard([
      Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
});

reportScene.on('text', async (ctx) => {
  await sendToAdmin(`A report from @${ctx.from.username}: ${ctx.message.text}`);
  await ctx.reply('Thanks! We have successfully received your bug report.');
  ctx.flow.leave();
});

module.exports = reportScene;
