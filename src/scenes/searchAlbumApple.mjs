import Telegraf from 'telegraf';
import Scene from 'telegraf/scenes/base';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';
import { httpGet, requestError, cleanNameTags, areTagsInAlbum } from '../helpers/util';
import { scrobbleAlbum } from '../helpers/scrobbler';
import auth from '../middlewares/auth';
import limiter from '../middlewares/limiter';
import { APPLE_MUSIC_API_TOKEN } from '../config';


const searchAlbumAppleScene = new Scene('search_album_apple');

searchAlbumAppleScene.enter(async (ctx) => {
  ctx.scene.state.messageIdToReply = ctx.message.message_id;

  const { countryCode, albumID } = ctx.scene.state.apple;
  let res;

  try {
    res = await httpGet(`https://amp-api.music.apple.com/v1/catalog/${countryCode}/albums?ids=${albumID}`, {
      headers: {
        Authorization: `Bearer ${APPLE_MUSIC_API_TOKEN}`,
      },
    });
  } catch (e) {
    await requestError(ctx, e);
    await ctx.scene.leave();
    return;
  }

  const album = {
    artist: res.data[0].attributes.artistName,
    title: res.data[0].attributes.name,
    tracks: res.data[0].relationships.tracks.data.map(track => ({
      artist: track.attributes.artistName,
      name: track.attributes.name,
      album: track.attributes.albumName,
      duration: track.attributes.durationInMillis / 1000,
    })),
  };

  const { artist, title, tracks } = album;
  ctx.session.user = await findUserByIdAndUpdate(ctx.from.id, { album });

  await ctx.reply(`You are about to scrobble <a href="${encodeURI(`https://www.last.fm/music/${artist}/${title}`)}">${title}</a> ` +
    `by <a href="${encodeURI(`https://www.last.fm/music/${artist}`)}">${artist}</a>. ` +
    `The following tracks have been found on iTunes and will be scrobbled:\n\n${tracks
      .map(track => track.name).join('\n')}`,
        Telegraf.Extra.HTML().webPreview(false).inReplyTo(ctx.scene.state.messageIdToReply)
        .markup(Telegraf.Markup.inlineKeyboard([areTagsInAlbum(album) ? [
          Telegraf.Markup.callbackButton('Clean name tags (Beta)', 'CLEAN'),
        ] : [], [
          Telegraf.Markup.callbackButton('Edit', 'EDIT'),
          Telegraf.Markup.callbackButton('OK', 'OK'),
          Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
        ]])));
});

searchAlbumAppleScene.action('OK', auth, limiter, async (ctx) => {
  await scrobbleAlbum(ctx);
  await ctx.scene.leave();
});

searchAlbumAppleScene.action('EDIT', async (ctx) => {
  await ctx.scene.enter('edit_album', ctx.scene.state);
});

searchAlbumAppleScene.action('CLEAN', async (ctx) => {
  const { artist, title, tracks } = ctx.session.user.album;
  const titleCleaned = cleanNameTags(title);

  ctx.scene.state.albumCleaned = {
    title: titleCleaned,
    tracks: tracks.map(t => ({
      artist: t.artist,
      name: cleanNameTags(t.name),
      album: titleCleaned,
      duration: t.duration,
    })),
  };

  const { tracks: tracksCleaned } = ctx.scene.state.albumCleaned;

  await ctx.editMessageText(`You are about to scrobble <a href="${encodeURI(`https://www.last.fm/music/${artist}/${titleCleaned}`)}">${titleCleaned}</a> ` +
    `by <a href="${encodeURI(`https://www.last.fm/music/${artist}`)}">${artist}</a>. ` +
    `The following tracks have been found on iTunes and will be scrobbled:\n\n${tracksCleaned
      .map(track => track.name).join('\n')}`,
        Telegraf.Extra.HTML().webPreview(false).inReplyTo(ctx.scene.state.messageIdToReply)
        .markup(Telegraf.Markup.inlineKeyboard([[
          Telegraf.Markup.callbackButton('Unclean name tags (Beta)', 'UNCLEAN'),
        ], [
          Telegraf.Markup.callbackButton('Edit', 'EDIT'),
          Telegraf.Markup.callbackButton('OK', 'OK'),
          Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
        ]])));
});

searchAlbumAppleScene.action('UNCLEAN', async (ctx) => {
  delete ctx.scene.state.albumCleaned;
  const { artist, title, tracks } = ctx.session.user.album;

  await ctx.editMessageText(`You are about to scrobble <a href="${encodeURI(`https://www.last.fm/music/${artist}/${title}`)}">${title}</a> ` +
    `by <a href="${encodeURI(`https://www.last.fm/music/${artist}`)}">${artist}</a>. ` +
    `The following tracks have been found on iTunes and will be scrobbled:\n\n${tracks
      .map(track => track.name).join('\n')}`,
        Telegraf.Extra.HTML().webPreview(false).inReplyTo(ctx.scene.state.messageIdToReply)
        .markup(Telegraf.Markup.inlineKeyboard([[
          Telegraf.Markup.callbackButton('Clean name tags (Beta)', 'CLEAN'),
        ], [
          Telegraf.Markup.callbackButton('Edit', 'EDIT'),
          Telegraf.Markup.callbackButton('OK', 'OK'),
          Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
        ]])));
});

export default searchAlbumAppleScene;

