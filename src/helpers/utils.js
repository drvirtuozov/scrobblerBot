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

export async function error(ctx, e) {
  console.log('ERROR!!!', e);

  if (e.response && e.response.data) {
    let error = e.response.data.error;

    if (error === 14 || error === 4 || error === 9) {
      await ctx.editMessageText('Access has not been granted. Please re-authenticate.')
      return ctx.flow.enter('auth');
    }
  }
  
  await ctx.reply('Oops, something went wrong. Please try again later.\nIf it goes on constantly please let us know via /report command.');
  ctx.flow.leave();
}

export function utf8(text) {
  return decodeURI(decodeURIComponent(text));
}