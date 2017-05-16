const Bot = require('telegraf');
const { scrobbleTrack } = require('./helpers/scrobbler');
const { searchFromLastfmAndAnswerInlineQuery } = require('./helpers/actions');
const scenes = require('./middlewares/scenes');
const auth = require('./middlewares/auth');
const logger = require('telegraf-logger');
const { SCROBBLERBOT_TOKEN } = require('../config');
const { error } = require('./helpers/utils');


const bot = new Bot(SCROBBLERBOT_TOKEN);

bot.context.messageToEdit = null;

bot.telegram.getMe()
  .then((data) => {
    bot.options.username = data.username;
  })
  .catch((err) => {
    console.log('Bot\'s getMe error:', err.message);
  });

bot.use(logger());

bot.use(Bot.memorySession({
  getSessionKey: ctx => ctx.from.id,
}));

bot.use(scenes);

bot.hears(/\/\w+/, (ctx) => {
  ctx.reply('If you are confused type /help');
});

bot.on('text', auth, async (ctx) => {
  try {
    await scrobbleTrack(ctx);
  } catch (e) {
    error(ctx, e);
  }
});

bot.on('inline_query', async (ctx) => {
  try {
    await searchFromLastfmAndAnswerInlineQuery(ctx, 'track');
  } catch (e) {
    error(e, ctx);
  }
});

bot.action('CANCEL', async (ctx) => {
  await ctx.editMessageText('Canceled');
  ctx.flow.leave();
});

bot.catch((err) => {
  console.log('Bot error:', err.message);
});

module.exports = bot;
