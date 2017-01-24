import crypto from 'crypto';
import bot from '../bot';
import songs from '../songs';
import { Extra } from 'telegraf';


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

export async function error(ctx, e) {
  console.log('ERROR!!!', e);
  
  if (e.response && e.response.data) {
    let error = e.response.data.error;

    if (error === 14 || error === 4 || error === 9) {
      await ctx.telegram.sendMessage(ctx.from.id, 
        'Access has not been granted. Please re-authenticate.');
      return ctx.flow.enter('auth');
    } else if (error === 29) {
      await ctx.telegram.sendMessage(ctx.from.id, 
        'Unfortunately, Last.fm\'s server restrictions don\'t allow us sending too many requests. Retry after a while.',
        Extra.webPreview(false));
      sendToAdmin('Rate limit exceeded - Your IP has made too many requests in a short period.');
    }
  }
  
  await ctx.telegram.sendMessage(ctx.from.id,
    'Oops, something went wrong. Please try again later.\nIf it goes on constantly please let us know via /report command.');
  ctx.flow.leave();
}

export function utf8(text) {
  return decodeURI(decodeURIComponent(text));
}