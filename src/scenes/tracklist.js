const { Markup } = require('telegraf');
const { Scene } = require('telegraf-flow');
const { scrobbleTracklist } = require('../helpers/scrobbler');
const { error } = require('../helpers/utils');


const tracklistScene = new Scene('tracklist');

tracklistScene.enter((ctx) => {
  const text = `OK. Send me a track list with the following syntax:\n\n${new Array(3).fill('Artist | Track Name | Album Title').join('\n')}`;
  const extra = Markup.inlineKeyboard([
    Markup.callbackButton('Cancel', 'CANCEL'),
  ]).extra();

  if (ctx.callbackQuery) {
    return ctx.editMessageText(text, extra);
  }

  return ctx.reply(text, extra);
});

tracklistScene.on('text', async (ctx) => {
  try {
    ctx.flow.state.messageIdToReply = ctx.message.message_id;
    await scrobbleTracklist(ctx);
  } catch (e) {
    error(ctx, e);
  }
});

module.exports = tracklistScene;
