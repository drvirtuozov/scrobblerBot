import Telegraf from 'telegraf';
import { canScrobble } from '../helpers/util';


export default Telegraf.branch(canScrobble, (ctx, next) => next(), (ctx, next) => {
  if (ctx.inlineQuery) {
    return next();
  }

  let isTooMany = false;
  let text = '⚠️ You can\'t scrobble more than once in 30 seconds';
  const retryAfter = new Date(ctx.session.state.retryAfter);
  const now = Date.now();
  isTooMany = retryAfter > now;

  if (isTooMany) {
    const sec = Math.ceil((retryAfter - now) / 1000);
    text = `⚠️ You’ve hit Last.fm scrobble limits in recent time. Please wait ${sec} seconds`;
  }

  if (ctx.callbackQuery) {
    return ctx.answerCallbackQuery(text, '', isTooMany && true);
  }

  return ctx.reply(text);
});
