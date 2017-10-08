const { Markup, Extra } = require('telegraf');
const { Scene } = require('telegraf-flow');


const noAlbumInfoScene = new Scene('no_album_info');

noAlbumInfoScene.enter(async (ctx) => {
  await ctx.reply('Last.fm has no any info about this album. Would you like to enter its track list manually?',
    Extra.webPreview(false).markup(Markup.inlineKeyboard([
      Markup.callbackButton('Yes', 'YES'),
      Markup.callbackButton('Cancel', 'CANCEL'),
    ])));
});

noAlbumInfoScene.action('YES', async (ctx) => {
  await ctx.flow.enter('set_album_tracks', ctx.flow.state);
});

module.exports = noAlbumInfoScene;
