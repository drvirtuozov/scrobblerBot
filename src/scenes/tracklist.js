const { Markup } = require('telegraf');
const { Scene } = require('telegraf-flow');
const { scrobbleTracklist } = require('../helpers/scrobbler');


const tracklistScene = new Scene('tracklist');

tracklistScene.enter((ctx) => {
  ctx.editMessageText(`Ok. Send me a tracklist with the following syntax:\n\n${new Array(3).fill('Artist | Track Name | Album Title').join('\n')}`,
    Markup.inlineKeyboard([
      Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
});

tracklistScene.on('text', (ctx) => {
  scrobbleTracklist(ctx);
});

module.exports = tracklistScene;
