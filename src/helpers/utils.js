const { Markup } = require('telegraf');
const crypto = require('crypto');
const songs = require('../songs');
const { findUserByIdAndUpdate } = require('./dbmanager');
const { ADMIN_ID } = require('../../config');


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
  console.log(e);
  const errText = 'Oops, something went wrong. Please try again later.\nIf it goes on constantly please let us know via /report command';

  if (ctx.callbackQuery) {
    await ctx.editMessageText(errText);
  } else {
    await ctx.reply(errText);
  }

  return ctx.flow.leave();
}

function utf8(text) {
  return decodeURI(decodeURIComponent(text));
}

async function successfulScrobble(ctx, text) {
  await findUserByIdAndUpdate(ctx.from.id, {
    $inc: { scrobbles: 1 },
    username: ctx.from.username,
    last_scrobble: Date.now(),
    album: {},
    track: {},
    discogs_results: [],
  });

  const respText = text ? text : '✅ Success!';

  if (ctx.callbackQuery) {
    await ctx.editMessageText(respText);
  } else {
    if (ctx.messageToEdit) {
      await ctx.telegram.editMessageText(ctx.chat.id, ctx.messageToEdit.message_id, null, respText);
    } else {
      await ctx.reply(respText);
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

async function customError(ctx, e) {
  const extra = Markup.inlineKeyboard([
    Markup.callbackButton('Retry', 'RETRY'),
  ]).extra();

  if (ctx.messageToEdit) {
    await findUserByIdAndUpdate(ctx.from.id, {
      $addToSet: {
        failed: {
          message_id: ctx.messageToEdit.message_id,
          data: e.config.data,
        },
      },
    });
  }

  if (ctx.callbackQuery) {
    if (ctx.messageToEdit.text !== e.message) {
      await ctx.editMessageText(e.message, extra);
    }
  } else {
    if (ctx.messageToEdit) {
      await ctx.telegram.editMessageText(ctx.chat.id,
        ctx.messageToEdit.message_id, null, e.message, extra);
    } else {
      await ctx.reply(e.message, extra);
    }
  }

  return ctx.flow.leave();
}

async function requestError(ctx, e) {
  if (e.response && e.response.data) {
    const err = e.response.data.error;

    if (err === 14 || err === 4 || err === 9) {
      await ctx.telegram.sendMessage(ctx.from.id,
        'Access has not been granted. Please re-authenticate');
      return ctx.flow.enter('auth');
    }
  }

  e.message = '❌ Failed';
  return customError(ctx, e);
}

async function isUserAuthorized(ctx) {
  return ctx.user.key ? true : false;
}

module.exports = {
  sendToAdmin,
  md5,
  getRandomFavSong,
  utf8,
  successfulScrobble,
  canScrobble,
  error,
  customError,
  requestError,
  isUserAuthorized,
};
