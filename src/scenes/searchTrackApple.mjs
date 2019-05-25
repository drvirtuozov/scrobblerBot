import Telegraf from 'telegraf';
import Scene from 'telegraf/scenes/base';
import { httpGet, requestError, cleanNameTags, areTagsInName } from '../helpers/util';
import { scrobbleTrackFromState } from '../helpers/scrobbler';
import auth from '../middlewares/auth';
import limiter from '../middlewares/limiter';
import { APPLE_MUSIC_API_TOKEN } from '../config';


const searchTrackAppleScene = new Scene('search_track_apple');

searchTrackAppleScene.enter(async (ctx) => {
  ctx.scene.state.messageIdToReply = ctx.message.message_id;

  const { countryCode, songID } = ctx.scene.state.apple;
  let res;

  try {
    res = await httpGet(`https://amp-api.music.apple.com/v1/catalog/${countryCode}/songs?ids=${songID}`, {
      headers: {
        Authorization: `Bearer ${APPLE_MUSIC_API_TOKEN}`,
      },
    });
  } catch (e) {
    await requestError(ctx, e);
    await ctx.scene.leave();
    return;
  }

  ctx.scene.state.track = {
    artist: res.data[0].attributes.artistName,
    name: res.data[0].attributes.name,
    album: res.data[0].attributes.albumName,
    duration: res.data[0].attributes.durationInMillis / 1000,
  };

  const { artist, name, album } = ctx.scene.state.track;

  await ctx.reply(`The following track has been found on iTunes and will be scrobbled:\n\n${artist}\n${name}\n${album}`,
    Telegraf.Extra.HTML().webPreview(false).inReplyTo(ctx.scene.state.messageIdToReply)
    .markup(Telegraf.Markup.inlineKeyboard([areTagsInName(name) || areTagsInName(album) ? [
      Telegraf.Markup.callbackButton('Clean name tags (Beta)', 'CLEAN'),
    ] : [], [
      Telegraf.Markup.callbackButton('Edit', 'EDIT'),
      Telegraf.Markup.callbackButton('OK', 'OK'),
      Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
    ]])));
});

searchTrackAppleScene.action('OK', auth, limiter, async (ctx) => {
  await scrobbleTrackFromState(ctx);
  await ctx.scene.leave();
});

searchTrackAppleScene.action('EDIT', async (ctx) => {
  const { artist, name, album } = ctx.scene.state.track;
  const { name: nameCleaned, album: albumCleaned } = ctx.scene.state.trackCleaned || {};
  await ctx.editMessageText('Edit the track and send it back to me:');
  await ctx.reply(`${artist}\n${nameCleaned || name}\n${albumCleaned || album}`);
  await ctx.scene.leave(); // go to the main scene to scrobble edited track
});

searchTrackAppleScene.action('CLEAN', async (ctx) => {
  const { artist, name, album, duration } = ctx.scene.state.track;

  ctx.scene.state.trackCleaned = {
    artist,
    name: cleanNameTags(name),
    album: cleanNameTags(album),
    duration,
  };

  const { name: nameCleaned, album: albumCleaned } = ctx.scene.state.trackCleaned;

  await ctx.editMessageText('The following track has been found on iTunes and will be scrobbled:\n\n' +
    `${artist}\n${nameCleaned}\n${albumCleaned}`,
      Telegraf.Extra.HTML().webPreview(false).inReplyTo(ctx.scene.state.messageIdToReply)
      .markup(Telegraf.Markup.inlineKeyboard([[
        Telegraf.Markup.callbackButton('Unclean name tags', 'UNCLEAN'),
      ], [
        Telegraf.Markup.callbackButton('Edit', 'EDIT'),
        Telegraf.Markup.callbackButton('OK', 'OK'),
        Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
      ]])));
});

searchTrackAppleScene.action('UNCLEAN', async (ctx) => {
  delete ctx.scene.state.trackCleaned;
  const { artist, name, album } = ctx.scene.state.track;

  await ctx.editMessageText('The following track has been found on iTunes and will be scrobbled:\n\n' +
    `${artist}\n${name}\n${album}`,
      Telegraf.Extra.HTML().webPreview(false).inReplyTo(ctx.scene.state.messageIdToReply)
      .markup(Telegraf.Markup.inlineKeyboard([[
        Telegraf.Markup.callbackButton('Clean name tags (Beta)', 'CLEAN'),
      ], [
        Telegraf.Markup.callbackButton('Edit', 'EDIT'),
        Telegraf.Markup.callbackButton('OK', 'OK'),
        Telegraf.Markup.callbackButton('Cancel', 'CANCEL'),
      ]])));
});

export default searchTrackAppleScene;

