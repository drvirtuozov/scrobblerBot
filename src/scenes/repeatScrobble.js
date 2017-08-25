const { Markup } = require('telegraf');
const { Scene } = require('telegraf-flow');
const { findSucceededMessageById } = require('../helpers/dbmanager');
const { scrobbleTracks } = require('../helpers/scrobbler');
const { error, requestError, multipleArray, successfulScrobble } = require('../helpers/utils');


const repeatScrobbleScene = new Scene('repeat_scrobble');

repeatScrobbleScene.on('text', async (ctx) => {
  try {
    const count = Number(ctx.message.text);

    if (count) {
      const message = await findSucceededMessageById(ctx.session.messageId);

      try {
        await scrobbleTracks(multipleArray(message.tracks, count), undefined, ctx.user.key);
      } catch (e) {
        requestError(ctx, e);
        return;
      }

      await successfulScrobble(ctx, undefined, message.tracks);
    } else {
      await ctx.reply('Enter a number:', Markup.inlineKeyboard([
        Markup.callbackButton('Cancel', 'CANCEL'),
      ]).extra());
    }
  } catch (e) {
    error(ctx, e);
  }
});

module.exports = repeatScrobbleScene;
