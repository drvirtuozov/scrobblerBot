const { branch } = require('telegraf');
const { canScrobble } = require('../helpers/utils');


module.exports = branch(canScrobble, async (ctx, next) => {
  await next();
}, async (ctx, next) => {
  if (ctx.inlineQuery) {
    await next();
    return;
  }

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery('Wait 30 seconds');
    return;
  }

  await ctx.reply('⚠️ You can\'t scrobble more than once in 30 seconds');
});
