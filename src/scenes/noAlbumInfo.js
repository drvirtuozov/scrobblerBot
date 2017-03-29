const { Markup, Extra } = require('telegraf');
const { Scene } = require('telegraf-flow');


const noAlbumInfoScene = new Scene('no_album_info');

noAlbumInfoScene.enter((ctx) => {
  ctx.reply('Last.fm and Discogs.com don\'t have any data about this album. Would you like to enter album tracklist manually?',
    Extra.webPreview(false).markup(Markup.inlineKeyboard([
      Markup.callbackButton('Yes', 'YES'),
      Markup.callbackButton('Cancel', 'CANCEL'),
    ])));
});

noAlbumInfoScene.action('YES', (ctx) => {
  ctx.flow.enter('set_album_tracks');
});

module.exports = noAlbumInfoScene;
