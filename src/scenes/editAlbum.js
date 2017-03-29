const { Markup } = require('telegraf');
const { Scene } = require('telegraf-flow');
const { scrobbleAlbum } = require('../helpers/scrobbler');
const { findUserById, findUserByIdAndUpdate } = require('../helpers/dbmanager');
const { error } = require('../helpers/utils');


const editAlbumScene = new Scene('edit_album');

editAlbumScene.enter(async (ctx) => {
  const user = await findUserById(ctx.from.id, 'album');

  return ctx.editMessageText(`Edit the tracklist and send it back to me:\n\n${user.album.tracks.map(track => track.name).join('\n')}`,
    Markup.inlineKeyboard([
      Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
});

editAlbumScene.on('text', async (ctx) => {
  try {
    const tracks = ctx.message.text.split('\n').map(name => ({ name }));
    await findUserByIdAndUpdate(ctx.from.id, { 'album.tracks': tracks });
    await scrobbleAlbum(ctx);
    return Promise.resolve();
  } catch (e) {
    return error(ctx, e);
  }
});

module.exports = editAlbumScene;
