const { Markup } = require('telegraf');
const { Scene } = require('telegraf-flow');
const { scrobbleAlbum } = require('../helpers/scrobbler');
const { findUserByIdAndUpdate } = require('../helpers/dbmanager');
const { error } = require('../helpers/utils');


const setAlbumTracksScene = new Scene('set_album_tracks');

setAlbumTracksScene.enter((ctx) => {
  ctx.editMessageText('Just send me song names of the album separated by new lines.',
    Markup.inlineKeyboard([
      Markup.callbackButton('Cancel', 'CANCEL'),
    ]));
});

setAlbumTracksScene.on('text', async (ctx) => {
  try {
    const tracks = ctx.message.text.split('\n')
      .map(track => ({ name: track }));

    if (tracks.length <= 1) return ctx.reply('Send me song names separated by new lines.');

    await findUserByIdAndUpdate(ctx.from.id, { 'album.tracks': tracks });
    await scrobbleAlbum(ctx);
    return Promise.resolve();
  } catch (e) {
    return error(ctx, e);
  }
});

module.exports = setAlbumTracksScene;