const { Extra } = require('telegraf');
const crypto = require('crypto');
const songs = require('../songs');
const { findUserByIdAndUpdate } = require('./dbmanager');
const { ADMIN_ID } = require('../../config');
const { changeProxy } = require('./proxy');


function sendToAdmin(ctx, text) {
  return ctx.telegram.sendMessage(ADMIN_ID, text);
}

function md5(text) {
  return crypto.createHash('md5').update(text, 'utf8').digest('hex');
}

function getRandomFavSong() {
  const index = Math.floor(Math.random() * songs.length);
  return songs[index];
}

async function error(ctx, e) {
  console.log('ERROR!!!', e);

  if (e.response && e.response.data) {
    const err = e.response.data.error;

    if (err === 14 || err === 4 || err === 9) {
      await ctx.telegram.sendMessage(ctx.from.id,
        'Access has not been granted. Please re-authenticate');
      return ctx.flow.enter('auth');
    } else if (err === 29) {
      await ctx.telegram.sendMessage(ctx.from.id,
        'Unfortunately, Last.fm\'s server restrictions don\'t allow us sending too many requests. Retry after a while',
        Extra.webPreview(false));
      return sendToAdmin('Rate limit exceeded - Your IP has made too many requests in a short period');
    }
  }

  await ctx.telegram.sendMessage(ctx.from.id, 
    'Oops, something went wrong. Please try again later.\nIf it goes on constantly please let us know via /report command');
  await changeProxy();
  return ctx.flow.leave();
}

function utf8(text) {
  return decodeURI(decodeURIComponent(text));
}

async function successfulScrobble(ctx, text, messageId) {
  await findUserByIdAndUpdate(ctx.from.id, {
    $inc: { scrobbles: 1 },
    username: ctx.from.username,
    last_scrobble: Date.now(),
    album: {},
    track: {},
    discogs_results: [],
  });

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text ? text : 'Success!');
  } else {
    if (messageId) {
      await ctx.telegram.editMessageText(ctx.chat.id, messageId, null, text ? text : 'Success!');
    } else {
      await ctx.reply(text ? text : 'Success!');
    }
  }

  if (ctx.flow) ctx.flow.leave();
}

function canScrobble(user) {
  if (Date.now() - user.last_scrobble <= 30000) {
    return false;
  }

  return true;
}

module.exports = {
  sendToAdmin,
  md5,
  getRandomFavSong,
  utf8,
  successfulScrobble,
  canScrobble,
  error,
};
