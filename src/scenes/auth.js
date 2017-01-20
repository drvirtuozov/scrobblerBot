import { Scene } from 'telegraf-flow';
import { Markup, Extra } from 'telegraf';
import config from '../config';
import axios from 'axios';
import { findUserById, findUserByIdAndUpdate } from '../helpers/dbmanager';
import { md5, getRandomFavSong, error } from '../helpers/utils';


const authScene = new Scene('auth');

authScene.enter(async ctx => {
  try {
    let res = await axios(`${config.lastfm.url}auth.gettoken&api_key=${config.lastfm.key}&format=json`),
      token = res.data.token;
    await ctx.reply('Please click the link below to grant access to your Last.fm account and then click OK button.',
      Markup.inlineKeyboard([
        Markup.urlButton('Grant access...', `http://www.last.fm/api/auth?api_key=${config.lastfm.key}&token=${token}`),
        Markup.callbackButton('OK', 'ACCESS_GRANTED')
      ]).extra());
    await findUserByIdAndUpdate(ctx.from.id, { token });
  } catch (e) {
    error(ctx, e);
  }
});

authScene.on('callback_query', async ctx => {
  try {
    if (ctx.callbackQuery.data === 'ACCESS_GRANTED') {
      let user = await findUserById(ctx.from.id),
        token = user.token,
        sig = md5(`api_key${config.lastfm.key}methodauth.getsessiontoken${token}${config.lastfm.secret}`),
        song = getRandomFavSong(),
        res = await axios(`${config.lastfm.url}auth.getsession&format=json&token=${token}&api_key=${config.lastfm.key}&api_sig=${sig}`),
        username = res.data.session.name;
              
      await findUserByIdAndUpdate(ctx.from.id, {
        account: res.data.session.name, 
        key: res.data.session.key
      });
      
      await ctx.editMessageText(
        `Glad to see you, <a href="http://www.last.fm/user/${username}">${username}</a>!\n\nNow you can scrobble your first song. To do it just type artist name, song name and album title separated by new lines. Example:\n\n${song.artist}\n${song.name}\n${song.album}\n\nType /help for more info.`,
        Extra.HTML().webPreview(false)
      );
      
      ctx.flow.leave();
    }
  } catch (e) {
    error(ctx, e);
  }
});

export default authScene;