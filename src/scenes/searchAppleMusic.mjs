import Telegraf from 'telegraf';
import url from 'url';
import Scene from 'telegraf/scenes/base';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';
import { httpGet, requestError, cleanNameTags } from '../helpers/util';
import { scrobbleAlbum } from '../helpers/scrobbler';
import auth from '../middlewares/auth';
import limiter from '../middlewares/limiter';
import { APPLE_MUSIC_API_TOKEN } from '../config';


const searchAppleMusicScene = new Scene('search_apple_music');

searchAppleMusicScene.enter(async (ctx) => {
  const u = url.parse(ctx.message.text);
  ctx.session.messageIdToReply = ctx.message.message_id;

  if (u.pathname.includes('album')) {
    const albumID = u.pathname.match(/\/\d+/g)[0].substring(1);
    const countryCode = u.pathname.match(/\/[A-z]{2}\//g)[0].substring(1, 3);
    let res;

    try {
      res = await httpGet(`https://amp-api.music.apple.com/v1/catalog/${countryCode}/albums?ids=${albumID}&l=en`, {
        headers: {
          Authorization: `Bearer ${APPLE_MUSIC_API_TOKEN}`,
        },
      });
    } catch (e) {
      await requestError(ctx, e);
      await ctx.scene.leave();
      return;
    }

    const artist = res.data[0].attributes.artistName;
    const title = res.data[0].attributes.name;
    const tracks = res.data[0].relationships.tracks.data.map(track => ({
      artist,
      name: track.attributes.name,
      album: title,
      duration: track.attributes.durationInMillis / 1000,
    }));

    ctx.session.user = await findUserByIdAndUpdate(ctx.from.id, {
      'album.title': title,
      'album.artist': artist,
      'album.tracks': tracks,
    });

    await ctx.reply(`You are about to scrobble <a href="${encodeURI(`https://www.last.fm/music/${artist}/${title}`)}">${title}</a> ` +
      `by <a href="${encodeURI(`https://www.last.fm/music/${artist}`)}">${artist}</a>. ` +
      `The following tracks have been found on iTunes and will be scrobbled:\n\n${tracks
        .map(track => track.name).join('\n')}`,
          Telegraf.Extra.HTML().webPreview(false).inReplyTo(ctx.session.messageIdToReply)
          .markup(Telegraf.Markup.inlineKeyboard([[
            Telegraf.Markup.callbackButton('Clean name tags (Beta)', 'CLEAN'),
          ], [
            Telegraf.Markup.callbackButton('Edit', 'EDIT'),
            Telegraf.Markup.callbackButton('OK', 'OK'),
            Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
          ]])));
    return;
  }

  await ctx.scene.leave();
});

searchAppleMusicScene.action('OK', auth, limiter, async (ctx) => {
  await scrobbleAlbum(ctx);
  await ctx.scene.leave();
});

searchAppleMusicScene.action('EDIT', async (ctx) => {
  await ctx.scene.enter('edit_album');
});

searchAppleMusicScene.action('CLEAN', async (ctx) => {
  const { artist, title, tracks } = ctx.session.user.album;
  ctx.session.user.album.titleCleaned = cleanNameTags(title);
  ctx.session.user.album.tracksCleaned = tracks.map((t) => {
    const track = Object.assign({}, t);
    track.name = cleanNameTags(track.name);
    track.album = ctx.session.user.album.titleCleaned;
    return track;
  });

  const { titleCleaned, tracksCleaned } = ctx.session.user.album;

  await ctx.editMessageText(`You are about to scrobble <a href="${encodeURI(`https://www.last.fm/music/${artist}/${titleCleaned}`)}">${titleCleaned}</a> ` +
    `by <a href="${encodeURI(`https://www.last.fm/music/${artist}`)}">${artist}</a>. ` +
    `The following tracks have been found on iTunes and will be scrobbled:\n\n${tracksCleaned
      .map(track => track.name).join('\n')}`,
        Telegraf.Extra.HTML().webPreview(false).inReplyTo(ctx.session.messageIdToReply)
        .markup(Telegraf.Markup.inlineKeyboard([[
          Telegraf.Markup.callbackButton('Unclean name tags (Beta)', 'UNCLEAN'),
        ], [
          Telegraf.Markup.callbackButton('Edit', 'EDIT'),
          Telegraf.Markup.callbackButton('OK', 'OK'),
          Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
        ]])));
});

searchAppleMusicScene.action('UNCLEAN', async (ctx) => {
  delete ctx.session.user.album.titleCleaned;
  delete ctx.session.user.album.tracksCleaned;
  const { artist, title, tracks } = ctx.session.user.album;

  await ctx.editMessageText(`You are about to scrobble <a href="${encodeURI(`https://www.last.fm/music/${artist}/${title}`)}">${title}</a> ` +
    `by <a href="${encodeURI(`https://www.last.fm/music/${artist}`)}">${artist}</a>. ` +
    `The following tracks have been found on iTunes and will be scrobbled:\n\n${tracks
      .map(track => track.name).join('\n')}`,
        Telegraf.Extra.HTML().webPreview(false).inReplyTo(ctx.session.messageIdToReply)
        .markup(Telegraf.Markup.inlineKeyboard([[
          Telegraf.Markup.callbackButton('Clean name tags (Beta)', 'CLEAN'),
        ], [
          Telegraf.Markup.callbackButton('Edit', 'EDIT'),
          Telegraf.Markup.callbackButton('OK', 'OK'),
          Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
        ]])));
});

export default searchAppleMusicScene;

