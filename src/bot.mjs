import Telegraf from 'telegraf';
import HttpsProxyAgent from 'https-proxy-agent';
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
import { sendToAdmin } from './helpers/util';
import './helpers/scheduler';
import './db';


const bot = new Telegraf(SCROBBLERBOT_TOKEN, {
  telegram: {
    webhookReply: false,
    agent: process.env.NODE_ENV === 'development' ? new HttpsProxyAgent({ // proxy for russian blocked devs
      host: process.env.https_proxy && process.env.https_proxy.split(':')[0],
      port: process.env.https_proxy && process.env.https_proxy.split(':')[1],
      secureProxy: true,
    }) : null,
  },
});

bot.context.user = null;

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
bot.use(user);
bot.use(session);
bot.use(logger);
bot.use(scenes); // global commands are here

bot.on('text', auth, limiter, scrobbleTrackFromText);
bot.on('audio', auth, limiter, scrobbleTrackFromAudio);

bot.on('inline_query', async (ctx) => {
  await searchFromLastfmAndAnswerInlineQuery(ctx, 'track');
});

bot.action('CANCEL', cancel);
bot.action('RETRY', retry);
bot.action('REPEAT', repeat);
bot.action(/REPEAT:\d?\d/, auth, limiter, repeatMany);

bot.catch((e) => {
  console.error(e);
  sendToAdmin(`Unhandled Bot Error! ${e.message}`);
});

export default bot;
