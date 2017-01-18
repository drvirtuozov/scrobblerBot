import axios from 'axios';
import { error } from './utils';
import { findUserById, findUserByIdAndSetAlbumTracks, findUserByIdWithAlbum } from './dbmanager';
import { Extra, Markup } from 'telegraf';

export function alert(message) {
  User.find({})
    .then(users => {
      return bot.alert({
        chat_ids: users.map(user => user.id),
        text: message.text
      });
    })
    .then(res => {
      message.echo(res.description);
    });
}

export function help(ctx) {
  ctx.reply(`To scrobble a single song just type its info in this format:\n\n
    Artist\nSong Name\nAlbum Title\n\nIf you want to find a song or scrobble either a song list or 
    an album use our guide via /scrobble command.\n\nGrant access or change account - /auth.\n\n
    If you have any ideas or improvements for the bot please tell us about them via /wish command.`);
}

export async function whoami(ctx) {
  let user = await findUserById(ctx.from.id);
  ctx.reply(`You are logged in as <a href="http://www.last.fm/user/${user.account}">${user.account}</a>.`, Extra.HTML().webPreview(false));
}

export async function nextAlbum(ctx, which) {
  try {
    let pages = ctx.callbackQuery.message.text.slice(ctx.callbackQuery.message.text.search(/\d?\d of \d\d/)).split(' of '),
      i = which === 'NEXT' ? 
        +pages[0] + 1 > +pages[1] ? 1 : +pages[0] + 1 :
        +pages[0] - 1 < 1 ? +pages[1] : +pages[0] - 1;
      
    let user = await findUserById(ctx.from.id),
      id = user.discogs_results[i].id;
        
    let res = await axios(`https://api.discogs.com/releases/${id}`);
    if (res.data.tracklist.length) {
      let tracks = res.data.tracklist
        .map(track => { 
          let dur = track.duration.split(':'); 
          return { name: track.title, duration: dur[0] * 60 + +dur[1] };
        });

      await findUserByIdAndSetAlbumTracks(ctx.from.id, tracks);
    } else {
      await findUserByIdAndSetAlbumTracks(ctx.from.id, []);
    }

    user = await findUserByIdWithAlbum(ctx.from.id);

    let title = user.album.title,
      artist = user.album.artist;
    
    ctx.editMessageText(`You are about to scrobble [${title}](${encodeURI(`http://www.last.fm/music/${artist}/${title}`)}) by [${artist}](${encodeURI(`http://www.last.fm/music/${artist}`)}). The following tracks have been found on Discogs.com and will be scrobbled:\n\n${user.album.tracks.map(track    => track.name).join('\n')}\n\nResults: ${i} of ${user.discogs_results.length - 1}`,
        Extra.markdown().webPreview(false).markup(Markup.inlineKeyboard([
          [
            Markup.callbackButton('Edit', 'EDIT'),
            Markup.callbackButton('⬅️', 'PREV'),
            Markup.callbackButton('➡️', 'NEXT'),
            Markup.callbackButton('Cancel', 'CANCEL'),
          ], [ Markup.callbackButton('OK', 'OK')]
      ]))
    );
  } catch (e) {
    error(ctx, e);
  }
}