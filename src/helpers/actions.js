import axios from 'axios';
import { error } from './utils';
import { findUserById, findUserByIdAndUpdate } from './dbmanager';
import { Extra, Markup } from 'telegraf';
import config from '../config';


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

      user = await findUserByIdAndUpdate(ctx.from.id, { 'album.tracks': tracks }, { new: true });
    } else {
      user = await findUserByIdAndUpdate(ctx.from.id, { 
        'album.tracks': [ 'There are no any tracks in this result.' ] 
      }, { new: true });
    }

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

export async function searchFromLastfmAndAnswerInlineQuery(ctx) {
  if (!ctx.inlineQuery.query) 
    return ctx.answerInlineQuery([{
      type: 'article',
      title: 'Type your query below...',
      id: ctx.inlineQuery.id,
      input_message_content: {
        message_text: 'Type your query below...'
      }
    }]);

  let query = ctx.inlineQuery.query,
    results = await Promise.all([
      axios(`${config.lastfm.url}track.search&track=${encodeURI(query)}&api_key=${config.lastfm.key}&format=json`),
      axios(encodeURI(`${config.lastfm.url}album.search&album=${query}&api_key=${config.lastfm.key}&format=json`))
    ]),
    sum = results[0].data.results.trackmatches.track.slice(0, 5);
  
  results[1].data.results.albummatches.album.slice(0, 15).forEach(el => sum.push(el))

  let inlineResults = sum
    .filter(item => item.name !== '(null)')  
    .map((item, i) => {
      let photo_url = item.image[2]['#text'] || 'http://img2-ak.lst.fm/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png';
      
      return {
        type: 'article',
        id: String(i),
        thumb_url: photo_url,
        photo_width: 174,
        photo_height: 174,
        title: item.name,
        description: `${item.artist}`,
        input_message_content: {
          message_text: `${item.artist}\n${item.name}`
        }
      };
    });

  ctx.answerInlineQuery(inlineResults);
}

export async function recentTracks(ctx) {
  let user = await findUserById(ctx.from.id),
    res = await axios(`${config.lastfm.url}user.getrecenttracks&user=${user.account}&limit=15&api_key=${config.lastfm.key}&format=json`),
    tracks = res.data.recenttracks.track
      .filter(track => {
        if (track['@attr']) {
          return !track['@attr'].nowplaying;
        } else {
          return true;
        }
      })
      .map(track => {
        return {
          artist: track.artist['#text'],
          name: track.name,
          album: track.album['#text'],
          url: track.url
        }
      });

  ctx.reply(`Here are the very last 15 scrobbled tracks from your account:\n\n${(tracks.map(track => `<a href="${encodeURI(`http://www.last.fm/music/${track.artist}`)}">${track.artist}</a> — <a href="${track.url}">${track.name}</a>`)
    .join('\n'))}`,
    Extra.HTML().webPreview(false));
} 