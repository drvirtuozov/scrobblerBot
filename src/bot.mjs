import Telegraf from 'telegraf';
import { scrobbleTracks, scrobbleTrackFromText, scrobbleTracksByParts } from './helpers/scrobbler';
import { searchFromLastfmAndAnswerInlineQuery } from './helpers/actions';
import user from './middlewares/user';
import scenes from './middlewares/scenes';
import auth from './middlewares/auth';
import session from './middlewares/session';
import limiter from './middlewares/limiter';
import logger from './middlewares/logger';
import error from './middlewares/error';
import asyncer from './middlewares/asyncer';
import { SCROBBLERBOT_TOKEN } from '../config';
import { successfulScrobble, scrobbleError, multipleArray, sendToAdmin } from './helpers/util';
import { findSucceededMessageById, findFailedMessageById } from './helpers/dbmanager';
import './helpers/scheduler';
import './db';


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

bot.use(asyncer);
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
    await scrobbleError(ctx, e, message.tracks);
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
  const tracks = multipleArray(message.tracks, count);

  if (!message) {
    await ctx.editMessageText('Expired');
    return;
  }

  try {
    await scrobbleTracksByParts(ctx, tracks);
  } catch (e) {
    await scrobbleError(ctx, e, tracks);
    return;
  }

  await successfulScrobble(ctx, undefined, message.tracks);
});

bot.catch((e) => {
  console.log(e);
  sendToAdmin(`Unhandled Bot Error! ${e.message}`);
});

export default bot;
