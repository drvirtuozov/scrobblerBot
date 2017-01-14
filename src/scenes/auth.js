import { Scene } from 'telegraf-flow';
import { Markup } from 'telegraf';
import config from '../config';
import axios from 'axios';
import User from '../models/user';
import { md5, getRandomFavSong } from '../helpers/utils';


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
    await User.findByIdAndUpdate(ctx.from.id, { token });
  } catch (e) {
    console.log('AUTH ERROR!!!', e)
    //error(message, err);
  }
});

authScene.on('callback_query', async ctx => {
  try {
    if (ctx.callbackQuery.data === 'ACCESS_GRANTED') {
      let user = await User.findById(ctx.from.id),
        token = user.token,
        sig = md5(`api_key${config.lastfm.key}methodauth.getsessiontoken${token}${config.lastfm.secret}`),
        song = getRandomFavSong(),
        res = await axios(`${config.lastfm.url}auth.getsession&format=json&token=${token}&api_key=${config.lastfm.key}&api_sig=${sig}`),
        username = res.data.session.name;
              
      await User.findByIdAndUpdate(ctx.from.id, {
        account: res.data.session.name, 
        key: res.data.session.key
      });

      await ctx.editMessageText(
        ctx.from.id, 
        ctx.message.message_id, 
        null, 
        `Glad to see you, <a href="http://www.last.fm/user/${username}">${username}</a>!\n\nNow you can scrobble your first song. To do it just type artist name, song name and album title separated by new lines. Example:\n\n${song.artist}\n${song.name}\n${song.album}\n\nType /help for more info.`
      );
      
      ctx.flow.leave();
    }
  } catch (e) {
    console.log('AUTH ERROR!!!', e)
    //return error(query, err);
  }
});

/*

bot.editMessageText({
  message_id: query.message.message_id,
  text: `Glad to see you, <a href="http://www.last.fm/user/${username}">${username}</a>!\n\nNow you can scrobble your first song. To do it just type artist name, song name and album title separated by new lines. Example:\n\n${song.artist}\n${song.name}\n${song.album}\n\nType /help for more info.`,
  chat_id: query.from.id,
  parse_mode: 'HTML',
  disable_web_page_preview: true
});


bot.sendMessage({
  text: 'Please click the link below to grant access to your Last.fm account and then click OK button.',
  chat_id: message.from.id,
  disable_web_page_preview: true,
  reply_markup: {
    inline_keyboard: [[
      {text: 'Grant access...', url: `http://www.last.fm/api/auth?api_key=${config.lastfm.key}&token=${token}`}, 
      {text: 'OK', callback_data: 'ACCESS_GRANTED'}
    ]]
  }
});
 */

export default authScene;