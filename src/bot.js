const Telegraf = require('telegraf');
const TelegrafLogger = require('telegraf-logger');
const { scrobbleTracks, scrobbleTrackFromText } = require('./helpers/scrobbler');
const { searchFromLastfmAndAnswerInlineQuery } = require('./helpers/actions');
const user = require('./middlewares/user');
const scenes = require('./middlewares/scenes');
const auth = require('./middlewares/auth');
const session = require('./middlewares/session');
const limiter = require('./middlewares/limiter');
const { SCROBBLERBOT_TOKEN } = require('../config');
const { error, successfulScrobble, requestError, multipleArray } = require('./helpers/utils');
const { findSucceededMessageById, findFailedMessageById } = require('./helpers/dbmanager');


const bot = new Telegraf(SCROBBLERBOT_TOKEN);
const logger = new TelegrafLogger();

bot.context.user = null;
bot.context.messageToEdit = null;

bot.telegram.getMe()
  .then((data) => {
    bot.options.username = data.username;
  })
  .catch((err) => {
    console.log('Bot\'s getMe error:', err.message);
  });

bot.use(user);
bot.use(session);
bot.use(logger.middleware());
bot.use(scenes);

bot.hears(/\/\w+/, (ctx) => {
  ctx.reply('If you are confused type /help');
});

bot.on('text', auth, limiter, async (ctx) => {
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

bot.action('RETRY', limiter, async (ctx) => {
  try {
    ctx.messageToEdit = await ctx.editMessageText('<i>Scrobbling...</i>', Telegraf.Extra.HTML());
    const messageId = ctx.callbackQuery.message.message_id;
    const message = await findFailedMessageById(messageId);

    if (!message) ctx.editMessageText('Expired');

    try {
      await scrobbleTracks(message.tracks, undefined, ctx.user.key);
    } catch (e) {
      requestError(ctx, e);
      return;
    }

    await successfulScrobble(ctx);
  } catch (e) {
    error(ctx, e);
  }
});

bot.action('REPEAT', limiter, async (ctx) => {
  try {
    const messageId = ctx.callbackQuery.message.message_id;
    const message = await findSucceededMessageById(messageId);

    if (!message) ctx.editMessageText('Expired');

    ctx.editMessageText('How many times do you want to scrobble this again?',
      Telegraf.Markup.inlineKeyboard([
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
      ]).extra());
  } catch (e) {
    error(ctx, e);
  }
});

bot.action(/REPEAT:\d?\d/, limiter, async (ctx) => {
  try {
    ctx.messageToEdit = await ctx.editMessageText('<i>Scrobbling...</i>', Telegraf.Extra.HTML());
    const messageId = ctx.callbackQuery.message.message_id;
    const message = await findSucceededMessageById(messageId);
    const count = ctx.callbackQuery.data.split(':')[1];

    if (!message) ctx.editMessageText('Expired');

    try {
      await scrobbleTracks(multipleArray(message.tracks, count), undefined, ctx.user.key);
    } catch (e) {
      requestError(ctx, e);
      return;
    }

    await successfulScrobble(ctx, undefined, message.tracks);
  } catch (e) {
    error(ctx, e);
  }
});

bot.catch((err) => {
  console.log('Bot error:', err.message);
});

module.exports = bot;
