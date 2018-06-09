import Telegraf from 'telegraf';
import { canScrobble } from '../helpers/util';


export default Telegraf.branch(canScrobble, (ctx, next) => next(), (ctx, next) => {
  if (ctx.inlineQuery) {
    return next();
  }

  if (ctx.callbackQuery) {
    return ctx.answerCallbackQuery('Wait 30 seconds');
  }

  return ctx.reply('⚠️ You can\'t scrobble more than once in 30 seconds');
});
