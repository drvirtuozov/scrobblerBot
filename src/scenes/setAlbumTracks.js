const { Markup } = require('telegraf');
const { Scene } = require('telegraf-flow');
const { scrobbleAlbum } = require('../helpers/scrobbler');
const { findUserByIdAndUpdate } = require('../helpers/dbmanager');


const setAlbumTracksScene = new Scene('set_album_tracks');

setAlbumTracksScene.enter(async (ctx) => {
  await ctx.editMessageText('Just send me song names of the album separated by new lines',
    Markup.inlineKeyboard([
      Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
});

setAlbumTracksScene.on('text', async (ctx) => {
  const tracks = ctx.message.text.split('\n').map(track => ({ name: track }));

  if (tracks.length <= 1) {
    await ctx.reply('Send me song names separated by new lines',
      Markup.inlineKeyboard([
        Markup.callbackButton('Cancel', 'CANCEL'),
      ]).extra());

    return;
  }

  ctx.user = await findUserByIdAndUpdate(ctx.from.id, { 'album.tracks': tracks });
  await scrobbleAlbum(ctx);
});

module.exports = setAlbumTracksScene;
