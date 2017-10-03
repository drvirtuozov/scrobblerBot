const { branch } = require('telegraf');
const { canScrobble } = require('../helpers/utils');


module.exports = branch(canScrobble, (ctx, next) => next(), (ctx) => {
  if (ctx.callbackQuery) {
    return ctx.answerCallbackQuery('Wait 30 seconds');
  }

  return ctx.reply('⚠️ You can\'t scrobble more than once in 30 seconds');
});
