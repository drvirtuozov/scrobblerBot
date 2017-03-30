const Bot = require('telegraf');
const { scrobbleTrack } = require('./helpers/scrobbler');
const { searchFromLastfmAndAnswerInlineQuery } = require('./helpers/actions');
const scenes = require('./middlewares/scenes');
const auth = require('./middlewares/auth');
const logger = require('telegraf-logger');
const { SCROBBLERBOT_TOKEN } = require('../config');


const bot = new Bot(SCROBBLERBOT_TOKEN);

bot.telegram.getMe()
  .then((data) => {
    bot.options.username = data.username;
  });

bot.use(logger());

bot.use(Bot.memorySession({
  getSessionKey: ctx => ctx.from.id,
}));

bot.use(scenes);

bot.hears(/\/\w+/, (ctx) => {
  ctx.reply('If you are confused type /help');
});

bot.on('text', auth, scrobbleTrack);

bot.on('inline_query', (ctx) => {
  searchFromLastfmAndAnswerInlineQuery(ctx, 'track');
});

bot.action('CANCEL', async (ctx) => {
  await ctx.editMessageText('Canceled');
  ctx.flow.leave();
});

module.exports = bot;
