const Telegraf = require('telegraf');
const TelegrafLogger = require('telegraf-logger');
const { scrobbleTrackFromText } = require('./helpers/scrobbler');
const { searchFromLastfmAndAnswerInlineQuery } = require('./helpers/actions');
const user = require('./middlewares/user');
const scenes = require('./middlewares/scenes');
const auth = require('./middlewares/auth');
const { session, sessionMiddleware } = require('./middlewares/session');
const { SCROBBLERBOT_TOKEN, LASTFM_URL } = require('../config');
const { error, successfulScrobble, requestError } = require('./helpers/utils');
const { proxyPost } = require('./helpers/requests');
const { findUserByIdAndUpdate } = require('./helpers/dbmanager');


const bot = new Telegraf(SCROBBLERBOT_TOKEN);
const logger = new TelegrafLogger();

bot.context.user = null;
bot.context.messageToEdit = null;

bot.context.enterScene = function (name) {
  const ctx = this;
  ctx.flow.enter(name);
  session.saveSession(session.options.getSessionKey(ctx), ctx.session);
};

bot.context.leaveScene = function () {
  const ctx = this;
  ctx.flow.leave();
  session.saveSession(session.options.getSessionKey(ctx), ctx.session);
};

bot.telegram.getMe()
  .then((data) => {
    bot.options.username = data.username;
  })
  .catch((err) => {
    console.log('Bot\'s getMe error:', err.message);
  });

bot.use(sessionMiddleware);
bot.use(logger.middleware());
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
  ctx.leaveScene();
});

bot.action('RETRY', async (ctx) => {
  try {
    const messageId = ctx.callbackQuery.message.message_id;
    const data = ctx.user.failed
      .filter(fail => fail.message_id === messageId)[0].data;
    ctx.messageToEdit = await ctx.editMessageText('<i>Scrobbling...</i>', Telegraf.Extra.HTML());

    try {
      await proxyPost(LASTFM_URL, data);
    } catch (e) {
      return requestError(ctx, e);
    }

    await successfulScrobble(ctx);
    return findUserByIdAndUpdate(ctx.from.id, {
      $pull: {
        failed: {
          message_id: messageId,
        },
      },
    });
  } catch (e) {
    return error(ctx, e);
  }
});

bot.catch((err) => {
  console.log('Bot error:', err.message);
});

module.exports = bot;
