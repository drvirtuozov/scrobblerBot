import Telegraf from 'telegraf';
import url from 'url';
import { scrobbleTrackFromText, scrobbleTrackFromAudio } from './helpers/scrobbler';
import {
  searchFromLastfmAndAnswerInlineQuery, cancel, retry, repeat, repeatMany,
} from './handlers/actions';
import user from './middlewares/user';
import scenes from './middlewares/scenes';
import auth from './middlewares/auth';
import session from './middlewares/session';
import limiter from './middlewares/limiter';
import logger from './middlewares/logger';
import error from './middlewares/error';
import asyncer from './middlewares/asyncer';
import { SCROBBLERBOT_TOKEN } from '../config';
import { sendToAdmin, isTextLink } from './helpers/util';
import './helpers/scheduler';
import './db';


const bot = new Telegraf(SCROBBLERBOT_TOKEN, {
  telegram: {
    webhookReply: false,
  },
});

setImmediate(async () => {
  try {
    const data = await bot.telegram.getMe();
    bot.options.username = data.username;
  } catch (e) {
    console.error(e);
  }
});

bot.use(asyncer);
bot.use(error);
bot.use(session);
bot.use(user);
bot.use(logger);
bot.use(scenes); // global commands are here

bot.on('text', auth, limiter, async (ctx) => {
  if (isTextLink(ctx.message.text)) {
    // leave any scenes for convinient mobile experience if there are some non-completed actions
    await ctx.scene.leave();
    const service = url.parse(ctx.message.text).hostname;

    if (service === 'itunes.apple.com') {
      return ctx.scene.enter('search_apple_music');
    }

    return ctx.reply(`Unknown service: ${service}`);
  }

  return scrobbleTrackFromText(ctx);
});

bot.on('audio', auth, limiter, async (ctx) => {
  await scrobbleTrackFromAudio(ctx);
  await ctx.scene.leave();
});

bot.on('inline_query', async (ctx) => {
  await searchFromLastfmAndAnswerInlineQuery(ctx, 'track');
});

bot.action('CANCEL', ctx => cancel(ctx));
bot.action('RETRY', ctx => retry(ctx));
bot.action('REPEAT', ctx => repeat(ctx));
bot.action(/REPEAT:\d?\d/, auth, limiter, ctx => repeatMany(ctx));

bot.catch((e) => {
  console.error(e);
  sendToAdmin(`Unhandled Bot Error! ${e.message}`);
});

export default bot;
