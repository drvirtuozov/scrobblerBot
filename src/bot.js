import Bot from 'telegraf';
import config from './config';
import { scrobbleTrack } from './helpers/scrobbler';
import { searchFromLastfmAndAnswerInlineQuery } from './helpers/actions';
import scenes from './middlewares/scenes';
import auth from './middlewares/auth';
import logger from './middlewares/logger';


const bot = new Bot(config.token);

bot.telegram.getMe()
  .then(data => {
    bot.options.username = data.username;
  });

bot.use(logger);

bot.use(Bot.memorySession({
  getSessionKey: (ctx) => ctx.from.id
}));

bot.use(scenes);

bot.on('text', auth, scrobbleTrack);

bot.on('inline_query', ctx => {
  searchFromLastfmAndAnswerInlineQuery(ctx, 'track');
});

bot.action('CANCEL', async ctx => {
  await ctx.editMessageText('Canceled.');
  ctx.flow.leave();
});

export default bot;