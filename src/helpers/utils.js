const { Telegram, Markup } = require('telegraf');
const crypto = require('crypto');
const querystring = require('querystring');
const fetch = require('node-fetch');
const songs = require('../songs');
const { findUserByIdAndUpdate, createSucceededMessage, createFailedMessage } = require('./dbmanager');
const { ADMIN_ID, SCROBBLERBOT_TOKEN } = require('../../config');


const telegram = new Telegram(SCROBBLERBOT_TOKEN);
const GLOBAL_KEYBOARD = Markup.keyboard([['🎵 Track', '💽 Album', '📃 Tracklist']]).resize().extra();

function sendToAdmin(text) {
  return telegram.sendMessage(ADMIN_ID, text);
}

function md5(text) {
  return crypto.createHash('md5').update(text, 'utf8').digest('hex');
}

function getRandomFavSong() {
  const index = Math.floor(Math.random() * songs.length);
  return songs[index];
}

async function error(ctx, e) {
  if (e.code === 400) { // message is not modified
    return;
  }

  console.log(e);
  const errText = '❗️ Oops, something went wrong. Please try again later.';

  if (ctx.callbackQuery) {
    await ctx.editMessageText(errText);
  } else if (ctx.inlineQuery) {
    // pass
  } else {
    await ctx.reply(errText);
  }

  if (ctx.flow) await ctx.flow.leave();
  await sendToAdmin('❗️ An error occured. Check the logs...');
}

function utf8(text) {
  return decodeURI(decodeURIComponent(text));
}

async function successfulScrobble(ctx, text = '✅ Success!', tracks = []) {
  await findUserByIdAndUpdate(ctx.from.id, {
    $inc: { scrobbles: 1 },
    username: ctx.from.username,
    last_scrobble: new Date(),
    album: {},
    track: {},
  });

  const extra = Markup.inlineKeyboard([
    Markup.callbackButton('Repeat', 'REPEAT'),
  ]).extra();

  let message;

  if (ctx.callbackQuery) {
    message = await ctx.editMessageText(text, extra);
  } else if (ctx.flow.state.messageIdToEdit) {
    message = await ctx.telegram
      .editMessageText(ctx.chat.id, ctx.flow.state.messageIdToEdit, null, text, extra);
  } else {
    message = await ctx.reply(text, extra);
  }

  await createSucceededMessage(message.message_id, tracks);
  await ctx.flow.leave();
}

function canScrobble(ctx) {
  if (!ctx.user || Date.now() - +ctx.user.last_scrobble <= 30000) {
    return false;
  }

  return true;
}

function multipleArray(array = [], multipleTimes = 1) {
  let multipliedArray = [];

  if (multipleTimes > 1) {
    for (let i = 0; i < multipleTimes; i += 1) {
      multipliedArray = multipliedArray.concat(array);
    }

    return multipliedArray;
  }

  return array;
}

async function requestError(ctx, e) {
  if (e.response) {
    let json;

    try {
      json = await e.response.json();
    } catch (err) {
      console.log(e.response);
      await sendToAdmin(`Got strange response. Check the console:\n\n${e.message}`);
      return;
    }

    const err = json.error;

    if (err === 14 || err === 4 || err === 9) {
      const text = '❌ Access has not been granted. Please re-authenticate';

      if (ctx.callbackQuery) {
        await ctx.editMessageText(text);
      } else {
        await ctx.reply(text);
      }

      await ctx.flow.enter('auth');
    }
  }
}

async function scrobbleError(ctx, e, tracks = [], msg = '❌ Failed') {
  const extra = Markup.inlineKeyboard([
    Markup.callbackButton('Retry', 'RETRY'),
  ]).extra();

  let messageId;

  if (ctx.flow.state.messageIdToEdit) {
    messageId = ctx.flow.state.messageIdToEdit;
    await ctx.telegram.editMessageText(ctx.chat.id, messageId, null, msg, extra);
  } else if (ctx.callbackQuery) {
    messageId = ctx.callbackQuery.message.message_id;
    await ctx.editMessageText(msg, extra);
  } else {
    const res = await ctx.reply(msg, extra);
    messageId = res.message_id;
  }

  if (tracks.length) {
    await createFailedMessage(messageId, tracks);
  }

  await requestError(ctx, e);
  await ctx.flow.leave();
}

function isUserAuthorized(ctx) {
  return ctx.user && ctx.user.key;
}

function validateTrackDurations(tracks = []) {
  const defDur = 300;
  return tracks.map((track) => {
    let duration = 0;
    const td = track.duration;

    if (tracks.length === 1) {
      return Object.assign(track, { duration });
    }

    duration = typeof td === 'undefined' ? defDur : +td || defDur;
    return Object.assign(track, { duration });
  });
}

async function httpRequest(url = '', options = {}) {
  const opts = Object.assign({}, options);
  opts.headers = Object.assign(opts.headers || {}, {
    'User-Agent': 'telegram@scrobblerBot/1.0.0 (+https://github.com/drvirtuozov/scrobblerBot)',
  });
  const res = await fetch(url, opts);

  if (res.status !== 200) {
    const err = { message: res.statusText, response: res };
    throw err;
  }

  return res;
}

async function httpPost(url = '', data = {}, opts = {}) {
  const res = await httpRequest(url, Object.assign({
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: typeof data === 'string' ? data : querystring.stringify(data),
  }, opts));

  return res.json();
}

async function httpGet(url = '', opts = {}) {
  const res = await httpRequest(url, Object.assign({
    method: 'GET',
  }, opts));

  return res.json();
}

function getIgnoredTracksFromLastfmRes(res = {}) {
  if (!res.scrobbles) return [];
  const ignored = [];
  const scrobbles = res.scrobbles.scrobble;

  if (Array.isArray(scrobbles)) {
    scrobbles.filter(scr => scr.ignoredMessage.code === '1')
      .forEach(scr => ignored.push(scr));
  } else if (scrobbles.ignoredMessage.code === '1') {
    ignored.push(scrobbles);
  }

  return ignored.map(track => ({
    artist: track.artist['#text'],
    name: track.track['#text'],
    album: track.album['#text'],
  }));
}

module.exports = {
  sendToAdmin,
  md5,
  getRandomFavSong,
  utf8,
  successfulScrobble,
  canScrobble,
  error,
  requestError,
  scrobbleError,
  isUserAuthorized,
  GLOBAL_KEYBOARD,
  multipleArray,
  validateTrackDurations,
  httpPost,
  httpGet,
  getIgnoredTracksFromLastfmRes,
};
