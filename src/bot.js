const Telegraf = require('telegraf');
const { scrobbleTrackFromText } = require('./helpers/scrobbler');
const { searchFromLastfmAndAnswerInlineQuery } = require('./helpers/actions');
const user = require('./middlewares/user');
const scenes = require('./middlewares/scenes');
const auth = require('./middlewares/auth');
const logger = require('telegraf-logger');
const { SCROBBLERBOT_TOKEN, LASTFM_URL } = require('../config');
const { error, successfulScrobble, requestError } = require('./helpers/utils');
const { proxyPost } = require('./helpers/requests');


const bot = new Telegraf(SCROBBLERBOT_TOKEN);

bot.context.user = null;
bot.context.messageToEdit = null;

bot.telegram.getMe()
  .then((data) => {
    bot.options.username = data.username;
  })
  .catch((err) => {
    console.log('Bot\'s getMe error:', err.message);
  });

bot.use(logger());

bot.use(Telegraf.memorySession({
  getSessionKey: ctx => ctx.from.id,
}));

bot.use(user);
bot.use(scenes);

bot.hears(/\/\w+/, (ctx) => {
  ctx.reply('If you are confused type /help');
});

bot.on('text', auth, async (ctx) => {
  try {
    await scrobbleTrackFromText(ctx);
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

bot.action('RETRY', async (ctx) => {
  try {
    const data = ctx.user.failed
      .filter(fail => fail.message_id === ctx.callbackQuery.message.message_id)[0].data;
    ctx.messageToEdit = await ctx.editMessageText('<i>Scrobbling...</i>', Telegraf.Extra.HTML());
    await proxyPost(LASTFM_URL, data);
    await successfulScrobble(ctx);
  } catch (e) {
    requestError(ctx, e);
  }
});

bot.catch((err) => {
  console.log('Bot error:', err.message);
});

module.exports = bot;
