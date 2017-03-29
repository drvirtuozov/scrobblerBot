const { Markup } = require('telegraf');
const { Scene } = require('telegraf-flow');


const scrobbleScene = new Scene('scrobble');

scrobbleScene.enter((ctx) => {
  ctx.reply('What do you want to scrobble?', Markup.inlineKeyboard([[
    Markup.callbackButton('Track', 'TRACK'),
    Markup.callbackButton('Album', 'ALBUM'),
    Markup.callbackButton('Tracklist', 'LIST'),
  ], [
    Markup.callbackButton('Cancel', 'CANCEL'),
  ]]).extra());
});

scrobbleScene.action('TRACK', (ctx) => {
  ctx.flow.enter('search_track');
});

scrobbleScene.action('LIST', (ctx) => {
  ctx.flow.enter('tracklist');
});

scrobbleScene.action('ALBUM', (ctx) => {
  ctx.flow.enter('search_album');
});

module.exports = scrobbleScene;
