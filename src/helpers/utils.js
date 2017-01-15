import crypto from 'crypto';
import bot from '../bot';
import songs from '../songs';


export function sendToAdmin(text) {
  return bot.telegram.sendMessage(1501719, text);
}

export function md5(text) {
  return crypto.createHash('md5').update(text, 'utf8').digest('hex');
}

export function getRandomFavSong() {
  let index = Math.floor(Math.random() * songs.length);
  
  return songs[index];
}

export async function error(ctx, err) {
  if (err) {
    if (ctx.callbackQuery) {
      if (err.data) {
        if (err.data.error === 14 || err.data.error === 4) {
          await ctx.editMessageText('Access has not been granted.')
          return ctx.flow.enter('auth');
        }
      }
      
      return ctx.reply('Oops, something went wrong. Please try again later.');  
    }
    
    console.log(err.data || err);
    ctx.reply('Oops, something went wrong. Please try again later.\nIf it goes on constantly please let us know via /report command.');
  }
}

/*export function utf8(text: string): string {
  return unescape(decodeURIComponent(text));
}*/

export function utf8(text) {
  return decodeURI(decodeURIComponent(text));
}