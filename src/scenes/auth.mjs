import Telegram from 'telegraf';
import Scene from 'telegraf/scenes/base';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';
import { md5, getRandomFavSong, requestError, httpGet } from '../helpers/util';
import { LASTFM_URL, LASTFM_KEY, LASTFM_SECRET } from '../../config';


const authScene = new Scene('auth');

authScene.enter(async (ctx) => {
  let res;

  try {
    res = await httpGet(`${LASTFM_URL}?method=auth.gettoken&api_key=${LASTFM_KEY}&format=json`);
  } catch (e) {
    await requestError(ctx, e);
    await ctx.scene.leave();
    return;
  }

  const token = res.token;
  await ctx.reply('Please, click the link below to grant access to your Last.fm account and then push the OK button',
    Telegram.Markup.inlineKeyboard([
      Telegram.Markup.urlButton('Grant access...', `https://www.last.fm/api/auth?api_key=${LASTFM_KEY}&token=${token}`),
      Telegram.Markup.callbackButton('OK', 'ACCESS_GRANTED'),
    ]).extra());
  await findUserByIdAndUpdate(ctx.from.id, { token });
});

authScene.action('ACCESS_GRANTED', async (ctx) => {
  const token = ctx.user.token;
  const sig = md5(`api_key${LASTFM_KEY}methodauth.getsessiontoken${token}${LASTFM_SECRET}`);
  const song = getRandomFavSong();
  let res;

  try {
    res = await httpGet(
      `${LASTFM_URL}?method=auth.getsession&format=json&token=${token}&api_key=${LASTFM_KEY}&api_sig=${sig}`);
  } catch (e) {
    await requestError(ctx, e);
    await ctx.scene.leave();
    return;
  }

  const { name: account, key } = res.session;
  await findUserByIdAndUpdate(ctx.from.id, { account, key });
  await ctx.editMessageText(`Glad to see you, <a href="https://www.last.fm/user/${account}">${account}</a>!\n\n` +
    'You may scrobble your first song now. To do it just type artist name, song name and album title separated ' +
    `by new lines. Example:\n\n${song.artist}\n${song.name}\n${song.album} <i>(optional)</i>\n\nType /help for more info`,
      Telegram.Extra.HTML().webPreview(false));

  await ctx.scene.leave();
});

export default authScene;
