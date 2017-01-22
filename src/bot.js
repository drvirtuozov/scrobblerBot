import Bot from 'telegraf';
import config from './config';
import { scrobbleSong } from './helpers/scrobble';
import { searchFromLastfmAndAnswerInlineQuery } from './helpers/actions';
import scenes from './middlewares/scenes';
import auth from './middlewares/auth';


const bot = new Bot(config.token);

bot.use(Bot.memorySession({
  getSessionKey: (ctx) => ctx.from.id
}));

bot.use(scenes);

bot.on('text', auth, scrobbleSong);
bot.on('inline_query', searchFromLastfmAndAnswerInlineQuery);

export default bot;