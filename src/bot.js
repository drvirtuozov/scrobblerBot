const Telegraf = require('telegraf');
const TelegrafLogger = require('telegraf-logger');
const { scrobbleTracks, scrobbleTrackFromText } = require('./helpers/scrobbler');
const { searchFromLastfmAndAnswerInlineQuery } = require('./helpers/actions');
const user = require('./middlewares/user');
const scenes = require('./middlewares/scenes');
const auth = require('./middlewares/auth');
const { session, sessionMiddleware } = require('./middlewares/session');
const { SCROBBLERBOT_TOKEN } = require('../config');
const { error, successfulScrobble, requestError, multipleArray } = require('./helpers/utils');
const { findSucceededMessageById, findFailedMessageById } = require('./helpers/dbmanager');


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
    ctx.messageToEdit = await ctx.editMessageText('<i>Scrobbling...</i>', Telegraf.Extra.HTML());
    const messageId = ctx.callbackQuery.message.message_id;
    const message = await findFailedMessageById(messageId);

    if (message) {
      try {
        await scrobbleTracks(message.tracks, null, ctx.user.key);
      } catch (e) {
        requestError(ctx, e);
        return;
      }

      await successfulScrobble(ctx);
    } else {
      ctx.editMessageText('Expired');
    }
  } catch (e) {
    error(ctx, e);
  }
});

bot.action('REPEAT', async (ctx) => {
  try {
    const messageId = ctx.callbackQuery.message.message_id;
    const message = await findSucceededMessageById(messageId);

    if (message) {
      ctx.editMessageText('How many times do you want to scrobble this again?', Telegraf.Markup.inlineKeyboard([
        [
          Telegraf.Markup.callbackButton('1', 'REPEAT:1'),
          Telegraf.Markup.callbackButton('2', 'REPEAT:2'),
          Telegraf.Markup.callbackButton('3', 'REPEAT:3'),
          Telegraf.Markup.callbackButton('4', 'REPEAT:4'),
          Telegraf.Markup.callbackButton('5', 'REPEAT:5'),
        ],
        [
          Telegraf.Markup.callbackButton('6', 'REPEAT:6'),
          Telegraf.Markup.callbackButton('7', 'REPEAT:7'),
          Telegraf.Markup.callbackButton('8', 'REPEAT:8'),
          Telegraf.Markup.callbackButton('9', 'REPEAT:9'),
          Telegraf.Markup.callbackButton('10', 'REPEAT:10'),
        ],
        [
          Telegraf.Markup.callbackButton('Custom', 'REPEAT:CUSTOM'),
        ],
      ]).extra());
    } else {
      ctx.editMessageText('Expired');
    }
  } catch (e) {
    error(ctx, e);
  }
});

bot.action(/REPEAT:\d?\d/, async (ctx) => {
  try {
    ctx.messageToEdit = await ctx.editMessageText('<i>Scrobbling...</i>', Telegraf.Extra.HTML());
    const messageId = ctx.callbackQuery.message.message_id;
    const message = await findSucceededMessageById(messageId);
    const count = ctx.callbackQuery.data.split(':')[1];

    try {
      await scrobbleTracks(multipleArray(message.tracks, count), null, ctx.user.key);
    } catch (e) {
      requestError(ctx, e);
      return;
    }

    await successfulScrobble(ctx, undefined, message.tracks);
  } catch (e) {
    error(ctx, e);
  }
});

bot.action('REPEAT:CUSTOM', async (ctx) => {
  await ctx.editMessageText('Enter a number:', Telegraf.Markup.inlineKeyboard([
    Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
  ]).extra());
  ctx.session.messageId = ctx.callbackQuery.message.message_id;
  ctx.enterScene('repeat_scrobble');
});

bot.catch((err) => {
  console.log('Bot error:', err.message);
});

module.exports = bot;
