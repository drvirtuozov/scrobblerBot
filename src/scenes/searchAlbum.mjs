import Telegraf from 'telegraf';
import Scene from 'telegraf/scenes/base';
import { LASTFM_URL, LASTFM_KEY } from '../config';
import { searchFromLastfmAndAnswerInlineQuery } from '../handlers/actions';
import { scrobbleAlbum } from '../helpers/scrobbler';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';
import limiter from '../middlewares/limiter';
import { requestError, httpGet } from '../helpers/util';


const searchAlbumScene = new Scene('search_album');

searchAlbumScene.enter(async (ctx) => {
  const text = 'OK. In order to start searching an album push the button below. ' +
    'Or you can type album info in this format manually:\n\nArtist\nAlbum Title';

  const extra = Telegraf.Markup.inlineKeyboard([
    Telegraf.Markup.switchToCurrentChatButton('Search...', ''),
    Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
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
  ctx.session.messageIdToReply = ctx.message.message_id;
  let [artist, title] = ctx.message.text.split('\n');

  if (!artist || !title) {
    await ctx.reply('Format:\n\nArtist\nAlbum Title', Telegraf.Markup.inlineKeyboard([
      Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());

    return;
  }

  ctx.session.messageIdToEdit = (await ctx.reply('<i>Fetching data...</i>',
    Telegraf.Extra.HTML().inReplyTo(ctx.session.messageIdToReply))).message_id;
  let tracks = [];
  let res;

  try {
    res = await httpGet(
      `${LASTFM_URL}?method=album.getinfo&api_key=${LASTFM_KEY}&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(title)}&format=json`);
  } catch (e) {
    await requestError(ctx, e);
    await ctx.scene.leave();
    return;
  }

  if (res.album && res.album.tracks.track.length) {
    artist = res.album.artist;
    title = res.album.name;
    tracks = res.album.tracks.track.map(track => (
      { name: track.name, duration: track.duration }
    ));

    ctx.session.user = await findUserByIdAndUpdate(ctx.from.id, {
      album: {
        artist,
        title,
        tracks,
      },
    });
  } else {
    ctx.session.user = await findUserByIdAndUpdate(ctx.from.id, {
      album: {
        artist,
        title,
      },
    });

    await ctx.scene.enter('no_album_info');
    return;
  }

  await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.messageIdToEdit, null,
    `You are about to scrobble <a href="${encodeURI(`https://www.last.fm/music/${artist}/${title}`)}">${title}</a> ` +
    `by <a href="${encodeURI(`https://www.last.fm/music/${artist}`)}">${artist}</a>. ` +
    `The following tracks have been found on Last.fm and will be scrobbled:\n\n${tracks
      .map(track => track.name).join('\n')}`,
          Telegraf.Extra.HTML().webPreview(false).markup(Telegraf.Markup.inlineKeyboard([
            Telegraf.Markup.callbackButton('Edit', 'EDIT'),
            Telegraf.Markup.callbackButton('OK', 'OK'),
            Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
          ])));
});

searchAlbumScene.action('OK', limiter, async (ctx) => {
  await scrobbleAlbum(ctx);
  await ctx.scene.leave();
});

searchAlbumScene.action('EDIT', async (ctx) => {
  await ctx.scene.enter('edit_album');
});

export default searchAlbumScene;
