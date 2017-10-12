const Telegraf = require('telegraf');
const { scrobbleTracks, scrobbleTrackFromText } = require('./helpers/scrobbler');
const { searchFromLastfmAndAnswerInlineQuery } = require('./helpers/actions');
const user = require('./middlewares/user');
const scenes = require('./middlewares/scenes');
const auth = require('./middlewares/auth');
const session = require('./middlewares/session');
const limiter = require('./middlewares/limiter');
const logger = require('./middlewares/logger');
const error = require('./middlewares/error');
const { SCROBBLERBOT_TOKEN } = require('../config');
const { successfulScrobble, requestError, multipleArray, sendToAdmin } = require('./helpers/utils');
const { findSucceededMessageById, findFailedMessageById } = require('./helpers/dbmanager');
require('./helpers/scheduler');
require('./db');


const bot = new Telegraf(SCROBBLERBOT_TOKEN, {
  telegram: {
    webhookReply: false,
  },
});

bot.context.user = null;

setImmediate(async () => {
  try {
    const data = await bot.telegram.getMe();
    bot.options.username = data.username;
  } catch (e) {
    console.log(e.message);
  }
});

bot.use(error);
bot.use(user);
bot.use(session);
bot.use(logger);
bot.use(scenes);

bot.hears(/\/\w+/, async (ctx) => {
  await ctx.reply('If you are confused type /help');
});

bot.on('text', auth, limiter, async (ctx) => {
  await scrobbleTrackFromText(ctx);
});

bot.on('inline_query', async (ctx) => {
  await searchFromLastfmAndAnswerInlineQuery(ctx, 'track');
});

bot.action('CANCEL', async (ctx) => {
  await ctx.flow.leave();
  await ctx.editMessageText('Canceled');
});

bot.action('RETRY', limiter, async (ctx) => {
  ctx.flow.state.messageIdToEdit = (await ctx.editMessageText('<i>Scrobbling...</i>',
    Telegraf.Extra.HTML())).message_id;
  const messageId = ctx.callbackQuery.message.message_id;
  const message = await findFailedMessageById(messageId);

  if (!message) {
    await ctx.editMessageText('Expired');
    return;
  }

  try {
    await scrobbleTracks(message.tracks, undefined, ctx.user.key);
  } catch (e) {
    await requestError(ctx, e);
    return;
  }

  await successfulScrobble(ctx);
});

bot.action('REPEAT', async (ctx) => {
  const messageId = ctx.callbackQuery.message.message_id;
  const message = await findSucceededMessageById(messageId);

  if (!message) {
    await ctx.editMessageText('Expired');
    return;
  }

  await ctx.editMessageText('How many times do you want to scrobble this again?',
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
});

bot.action(/REPEAT:\d?\d/, limiter, async (ctx) => {
  ctx.flow.state.messageIdToEdit = (await ctx.editMessageText('<i>Scrobbling...</i>',
    Telegraf.Extra.HTML())).message_id;
  const messageId = ctx.callbackQuery.message.message_id;
  const message = await findSucceededMessageById(messageId);
  const count = ctx.callbackQuery.data.split(':')[1];

  if (!message) {
    await ctx.editMessageText('Expired');
    return;
  }

  try {
    await scrobbleTracks(multipleArray(message.tracks, count), undefined, ctx.user.key);
  } catch (e) {
    await requestError(ctx, e);
    return;
  }

  await successfulScrobble(ctx, undefined, message.tracks);
});

bot.catch((e) => {
  console.log(e);
  sendToAdmin(`Unhandled Bot Error! ${e.message}`);
});

module.exports = bot;
