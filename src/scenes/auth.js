const { Markup, Extra } = require('telegraf');
const { Scene } = require('telegraf-flow');
const axios = require('axios');
const { findUserByIdAndUpdate } = require('../helpers/dbmanager');
const { md5, getRandomFavSong, error, requestError } = require('../helpers/utils');
const { LASTFM_URL, LASTFM_KEY, LASTFM_SECRET } = require('../../config');


const authScene = new Scene('auth');

authScene.enter(async (ctx) => {
  try {
    const res = await axios(`${LASTFM_URL}?method=auth.gettoken&api_key=${LASTFM_KEY}&format=json`);
    const token = res.data.token;

    await ctx.reply('Please, click the link below to grant access to your Last.fm account and then click OK button',
      Markup.inlineKeyboard([
        Markup.urlButton('Grant access...', `http://www.last.fm/api/auth?api_key=${LASTFM_KEY}&token=${token}`),
        Markup.callbackButton('OK', 'ACCESS_GRANTED'),
      ]).extra());
    await findUserByIdAndUpdate(ctx.from.id, { token }, { upsert: true });
  } catch (e) {
    error(ctx, e);
  }
});

authScene.action('ACCESS_GRANTED', async (ctx) => {
  try {
    const token = ctx.user.token;
    const sig = md5(`api_key${LASTFM_KEY}methodauth.getsessiontoken${token}${LASTFM_SECRET}`);
    const song = getRandomFavSong();
    let res = null;

    try {
      res = await axios(`${LASTFM_URL}?method=auth.getsession&format=json&token=${token}&api_key=${LASTFM_KEY}&api_sig=${sig}`);
    } catch (e) {
      return requestError(ctx, e);
    }

    const { name: account, key } = res.data.session;
    await findUserByIdAndUpdate(ctx.from.id, { account, key });
    await ctx.editMessageText(
      `Glad to see you, <a href="http://www.last.fm/user/${account}">${account}</a>!

Now you can scrobble your first song. To do it just type artist name, song name and album title separated by new lines. \
Example:\n\n${song.artist}\n${song.name}\n${song.album} <i>(optional)</i>\n\nType /help for more info`,
      Extra.HTML().webPreview(false));

    return ctx.flow.leave();
  } catch (e) {
    return error(ctx, e);
  }
});

module.exports = authScene;
