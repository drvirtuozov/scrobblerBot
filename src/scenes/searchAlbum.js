const { Markup, Extra } = require('telegraf');
const { Scene } = require('telegraf-flow');
const { LASTFM_URL, LASTFM_KEY } = require('../../config');
const { searchFromLastfmAndAnswerInlineQuery } = require('../helpers/actions');
const { scrobbleAlbum } = require('../helpers/scrobbler');
const { findUserByIdAndUpdate } = require('../helpers/dbmanager');
const toTitleCase = require('to-title-case');
const { proxyGet } = require('../helpers/proxy');
const limiter = require('../middlewares/limiter');
const { requestError } = require('../helpers/utils');


const searchAlbumScene = new Scene('search_album');

searchAlbumScene.enter(async (ctx) => {
  const text = 'OK. In order to start searching an album push the button below. ' +
    'Or you can type album info in this format manually:\n\nArtist\nAlbum Title';

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
  await searchFromLastfmAndAnswerInlineQuery(ctx, 'album');
});

searchAlbumScene.on('text', async (ctx) => {
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

  const qartist = encodeURIComponent(parsedArtist);
  const qalbum = encodeURIComponent(parsedTitle);
  let res;

  try {
    res = await proxyGet(
      `${LASTFM_URL}?method=album.getinfo&api_key=${LASTFM_KEY}&artist=${qartist}&album=${qalbum}&format=json`);
  } catch (e) {
    await requestError(ctx, e);
    return;
  }

  if (res.album && res.album.tracks.track.length) {
    tracks = res.album.tracks.track.map(track => (
      { name: track.name, duration: track.duration }
    ));
  } else {
    await ctx.flow.enter('no_album_info', ctx.flow.state);
    return;
  }

  const user = await findUserByIdAndUpdate(ctx.from.id, { 'album.tracks': tracks });
  const { artist, title } = user.album;
  await ctx.telegram.editMessageText(ctx.chat.id, ctx.flow.state.messageIdToEdit, null,
    `You are about to scrobble <a href="${encodeURI(`https://www.last.fm/music/${artist}/${title}`)}">${title}</a> ` +
    `by <a href="${encodeURI(`https://www.last.fm/music/${artist}`)}">${artist}</a>. ` +
    `The following tracks were found on Last.fm and will be scrobbled:\n\n${user.album.tracks
      .map(track => track.name).join('\n')}`,
          Extra.HTML().webPreview(false).markup(Markup.inlineKeyboard([
            Markup.callbackButton('Edit', 'EDIT'),
            Markup.callbackButton('OK', 'OK'),
            Markup.callbackButton('Cancel', 'CANCEL'),
          ])));
});

searchAlbumScene.action('OK', limiter, async (ctx) => {
  await scrobbleAlbum(ctx);
});

searchAlbumScene.action('EDIT', async (ctx) => {
  await ctx.flow.enter('edit_album', ctx.flow.state);
});

module.exports = searchAlbumScene;
