const { Markup } = require('telegraf');
const { Scene } = require('telegraf-flow');
const { sendToAdmin } = require('../helpers/utils');


const wishScene = new Scene('wish');

wishScene.enter((ctx) => {
  ctx.reply('Ok, I\'m listening to you. Tell me what feature do you want...',
    Markup.inlineKeyboard([
      Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
});

wishScene.on('text', async (ctx) => {
  await sendToAdmin(ctx, `A wish from @${ctx.from.username}: ${ctx.message.text}`);
  await ctx.reply('Thanks! We have successfully received your wish');
  ctx.leaveScene();
});

module.exports = wishScene;
