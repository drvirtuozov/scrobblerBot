const { Markup, Extra } = require('telegraf');
const { Scene } = require('telegraf-flow');
const { LASTFM_URL, LASTFM_KEY } = require('../../config');
const { error } = require('../helpers/utils');
const { searchFromLastfmAndAnswerInlineQuery } = require('../helpers/actions');
const { scrobbleAlbum } = require('../helpers/scrobbler');
const { findUserByIdAndUpdate } = require('../helpers/dbmanager');
const toTitleCase = require('to-title-case');
const { proxyGet } = require('../helpers/requests');
const limiter = require('../middlewares/limiter');


const searchAlbumScene = new Scene('search_album');

searchAlbumScene.enter(async (ctx) => {
  const text = 'OK. In order to start searching an album click the button below. Or you can type album info in this format manually:\n\nArtist\nAlbum Title';
  const extra = Markup.inlineKeyboard([
    Markup.switchToCurrentChatButton('Search...', ''),
    Markup.callbackButton('Cancel', 'CANCEL'),
  ]).extra();

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, extra);
    return;
  }

  await ctx.reply(text, extra);
});

searchAlbumScene.on('inline_query', async (ctx) => {
  try {
    await searchFromLastfmAndAnswerInlineQuery(ctx, 'album');
  } catch (e) {
    await error(ctx, e);
  }
});

searchAlbumScene.on('text', async (ctx) => {
  try {
    ctx.flow.state.messageIdToReply = ctx.message.message_id;
    const parsedAlbum = ctx.message.text.split('\n');

    if (parsedAlbum.length < 2) {
      await ctx.reply('Format:\n\nArtist\nAlbum Title', Markup.inlineKeyboard([
        Markup.callbackButton('Cancel', 'CANCEL'),
      ]).extra());

      return;
    }

    ctx.flow.state.messageIdToEdit = (await ctx.reply('<i>Fetching data...</i>',
      Extra.HTML().inReplyTo(ctx.flow.state.messageIdToReply))).message_id;
    const parsedTitle = toTitleCase(parsedAlbum[1]);
    const parsedArtist = toTitleCase(parsedAlbum[0]);
    let tracks = [];

    await findUserByIdAndUpdate(ctx.from.id, {
      $set: {
        album: { title: parsedTitle, artist: parsedArtist },
      },
    });

    const res = await proxyGet(encodeURI(`${LASTFM_URL}?method=album.getinfo&api_key=${LASTFM_KEY}&artist=${parsedArtist}&album=${parsedTitle}&format=json`));

    if (res.data.album && res.data.album.tracks.track.length) {
      tracks = res.data.album.tracks.track.map(track => (
        { name: track.name, duration: track.duration }
      ));
    } else {
      await ctx.flow.enter('no_album_info', ctx.flow.state);
      return;
    }

    const user = await findUserByIdAndUpdate(ctx.from.id, { 'album.tracks': tracks }, { new: true });
    const { artist, title } = user.album;
    await ctx.telegram.editMessageText(ctx.chat.id, ctx.flow.state.messageIdToEdit, null,
      `You are about to scrobble <a href="${encodeURI(`http://www.last.fm/music/${artist}/${title}`)}">${title}</a> by <a href="${encodeURI(`http://www.last.fm/music/${artist}`)}">${artist}</a>. The following tracks were found on Last.fm and will be scrobbled:\n\n${user.album.tracks
.map(track => track.name).join('\n')}`,
      Extra.HTML().webPreview(false).markup(Markup.inlineKeyboard([
        Markup.callbackButton('Edit', 'EDIT'),
        Markup.callbackButton('OK', 'OK'),
        Markup.callbackButton('Cancel', 'CANCEL'),
      ])));
  } catch (e) {
    await error(ctx, e);
  }
});

searchAlbumScene.action('OK', limiter, async (ctx) => {
  try {
    await scrobbleAlbum(ctx);
  } catch (e) {
    await error(ctx, e);
  }
});

searchAlbumScene.action('EDIT', async (ctx) => {
  await ctx.flow.enter('edit_album', ctx.flow.state);
});

module.exports = searchAlbumScene;
