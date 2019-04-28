import Telegram from 'telegraf';
import Scene from 'telegraf/scenes/base';
import { LASTFM_URL, LASTFM_KEY } from '../config';
import { scrobbleTrackFromDB, scrobbleTrackFromText } from '../helpers/scrobbler';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';
import { searchFromLastfmAndAnswerInlineQuery } from '../handlers/actions';
import limiter from '../middlewares/limiter';
import { requestError, httpGet } from '../helpers/util';


const searchTrackScene = new Scene('search_track');

searchTrackScene.enter(async (ctx) => {
  const text = 'OK. In order to start searching a track push the button below. ' +
    'Or you can type track info in this format manually:\n\nArtist\nTrack Name\nAlbum Title';

  const extra = Telegram.Markup.inlineKeyboard([
    Telegram.Markup.switchToCurrentChatButton('Search...', ''),
    Telegram.Markup.callbackButton('Cancel', 'CANCEL'),
  ]).extra();

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, extra);
    return;
  }

  await ctx.reply(text, extra);
});

searchTrackScene.on('inline_query', async (ctx) => {
  await searchFromLastfmAndAnswerInlineQuery(ctx, 'track');
});

searchTrackScene.on('text', async (ctx) => {
  ctx.session.messageIdToReply = ctx.message.message_id;
  const [artist, name, album] = ctx.message.text.split('\n');

  if (!artist || !name) {
    await ctx.reply('Format:\n\nArtist\nSong Name\nAlbum Title', Telegram.Markup.inlineKeyboard([
      Telegram.Markup.callbackButton('Cancel', 'CANCEL'),
    ]).extra());
  } else if (artist && name && !album) {
    ctx.session.messageIdToEdit = (await ctx.reply('<i>Fetching data...</i>',
    Telegram.Extra.HTML().inReplyTo(ctx.session.messageIdToReply))).message_id;

    let res;

    try {
      res = await httpGet(`${LASTFM_URL}?method=track.getInfo&api_key=${
        LASTFM_KEY}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(name)}&format=json`);
    } catch (e) {
      await requestError(ctx, e);
      await ctx.scene.leave();
      return;
    }

    if (res.error) {
      await scrobbleTrackFromText(ctx);
      await ctx.scene.leave();
      return;
    }

    const track = res.track || {};
    track.name = name;
    track.artist = artist;
    track.album = (track.album || {}).title || '';

    ctx.session.user = await findUserByIdAndUpdate(ctx.from.id, { track });

    if (track.album) {
      await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.messageIdToEdit, null,
        `Last.fm has album info of this track:\n\n${artist}\n${name}\n${track.album}\n\n` +
        'Would you like to scrobble it with the new info or leave it as is?',
          Telegram.Extra.webPreview(false).markup(Telegram.Markup.inlineKeyboard([
            [
              Telegram.Markup.callbackButton('Scrobble', 'SCR'),
              Telegram.Markup.callbackButton('Leave', 'SCR_WITHOUT_ALBUM'),
              Telegram.Markup.callbackButton('Edit album', 'EDIT_TRACK_ALBUM'),
            ], [
              Telegram.Markup.callbackButton('Cancel', 'CANCEL'),
            ],
          ])));

      return;
    }

    await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.messageIdToEdit, null,
      'Last.fm has no album info of this track. Would you like to enter album title manually?',
        Telegram.Extra.webPreview(false).markup(Telegram.Markup.inlineKeyboard([
          Telegram.Markup.callbackButton('Yes', 'EDIT_TRACK_ALBUM'),
          Telegram.Markup.callbackButton('No, scrobble', 'SCR_WITHOUT_ALBUM'),
          Telegram.Markup.callbackButton('Cancel', 'CANCEL'),
        ])));
  } else {
    await scrobbleTrackFromText(ctx);
    await ctx.scene.leave();
  }
});

searchTrackScene.action('SCR', limiter, async (ctx) => {
  await scrobbleTrackFromDB(ctx);
  await ctx.scene.leave();
});

searchTrackScene.action('EDIT_TRACK_ALBUM', async (ctx) => {
  await ctx.scene.enter('edit_track_album');
});

searchTrackScene.action('SCR_WITHOUT_ALBUM', limiter, async (ctx) => {
  await scrobbleTrackFromDB(ctx, false);
  await ctx.scene.leave();
});

export default searchTrackScene;
