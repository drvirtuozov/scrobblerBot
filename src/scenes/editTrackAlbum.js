const { Markup } = require('telegraf');
const { Scene } = require('telegraf-flow');
const { scrobbleTrackFromDB } = require('../helpers/scrobbler');
const { error } = require('../helpers/utils');
const { findUserByIdAndUpdate } = require('../helpers/dbmanager');


const editTrackAlbumScene = new Scene('edit_track_album');

editTrackAlbumScene.enter((ctx) => {
  ctx.editMessageText('Send me album title please',
    Markup.inlineKeyboard([
      Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
});

editTrackAlbumScene.on('text', async (ctx) => {
  try {
    const album = ctx.message.text;
    ctx.user = await findUserByIdAndUpdate(ctx.from.id,
      { 'track.album': album },
      { new: true });
    await scrobbleTrackFromDB(ctx);
  } catch (e) {
    error(ctx, e);
  }
});

module.exports = editTrackAlbumScene;
