const { Markup } = require('telegraf');
const { Scene } = require('telegraf-flow');
const { sendToAdmin } = require('../helpers/utils');


const wishScene = new Scene('wish');

wishScene.enter((ctx) => {
  ctx.reply('OK, I\'m listening. Tell me what feature do you want...',
    Markup.inlineKeyboard([
      Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
});

wishScene.on('text', async (ctx) => {
  await sendToAdmin(`A wish from @${ctx.from.username}: ${ctx.message.text}`);
  await ctx.reply('Thanks! We have successfully received your wish');
  ctx.flow.leave();
});

module.exports = wishScene;
