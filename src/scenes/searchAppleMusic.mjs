import Telegraf from 'telegraf';
import url from 'url';
import Scene from 'telegraf/scenes/base';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';
import { httpGet, requestError } from '../helpers/util';
import { scrobbleAlbum } from '../helpers/scrobbler';
import auth from '../middlewares/auth';
import limiter from '../middlewares/limiter';
import { APPLE_MUSIC_API_TOKEN } from '../../config';


const searchAppleMusicScene = new Scene('search_apple_music');

searchAppleMusicScene.enter(async (ctx) => {
  const u = url.parse(ctx.message.text);
  ctx.session.messageIdToReply = ctx.message.message_id;

  if (u.pathname.includes('album')) {
    const albumID = u.pathname.match(/\/\d+/g)[0].substring(1);
    const countryCode = u.pathname.match(/\/[A-z]{2}\//g)[0].substring(1, 3);
    let res;

    try {
      res = await httpGet(`https://amp-api.music.apple.com/v1/catalog/${countryCode}/albums?ids=${albumID}`, {
        headers: {
          Authorization: `Bearer ${APPLE_MUSIC_API_TOKEN}`,
        },
      });
    } catch (e) {
      await requestError(ctx, e);
      return;
    }

    const artist = res.data[0].attributes.artistName;
    const album = res.data[0].attributes.name;
    const tracks = res.data[0].relationships.tracks.data.map(track => ({
      artist,
      name: track.attributes.name,
      album,
      duration: track.attributes.durationInMillis / 1000,
    }));

    ctx.session.user = await findUserByIdAndUpdate(ctx.from.id, {
      'album.title': album,
      'album.artist': artist,
      'album.tracks': tracks,
    });

    await ctx.reply(`You are about to scrobble <a href="${encodeURI(`https://www.last.fm/music/${artist}/${album}`)}">${album}</a> ` +
      `by <a href="${encodeURI(`https://www.last.fm/music/${artist}`)}">${artist}</a>. ` +
      `The following tracks have been found on iTunes and will be scrobbled:\n\n${tracks
        .map(track => track.name).join('\n')}`,
          Telegraf.Extra.HTML().webPreview(false).inReplyTo(ctx.session.messageIdToReply)
          .markup(Telegraf.Markup.inlineKeyboard([
            Telegraf.Markup.callbackButton('Edit', 'EDIT'),
            Telegraf.Markup.callbackButton('OK', 'OK'),
            Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
          ])));
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

export default searchAppleMusicScene;

