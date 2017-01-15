import axios from 'axios';
import { Extra, Markup } from 'telegraf';
import { Scene } from 'telegraf-flow';
import config from '../config';
import { scrobbleSong } from '../helpers/scrobble';
import { error } from '../helpers/utils';
import { findUserByIdAndUpdate, findUserByIdAndSetTrack } from '../helpers/dbmanager';


const searchSongScene = new Scene('search_song');

searchSongScene.on('inline_query', async ctx => {
  console.log('INLINE QUEEEERY', ctx.inlineQuery)
  if (!ctx.inlineQuery.query) return ctx.reply('Type your query below...');
  
  try {
    let res = await axios(`${config.lastfm.url}track.search&track=${encodeURI(ctx.inlineQuery.query)}&api_key=${config.lastfm.key}&format=json`),
      tracks = res.data.results.trackmatches.track;

    let results = tracks  
      .map((track, i) => {
        let photo_url = track.image[2]['#text'] || 'http://img2-ak.lst.fm/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png';
        
        return {
          type: 'article',
          id: String(i),
          thumb_url: photo_url,
          photo_width: 174,
          photo_height: 174,
          title: track.name,
          description: `${track.artist}`,
          input_message_content: {
            message_text: `${track.artist}\n${track.name}`
          }
        };
      });
  } catch (e) {
    console.log('SEARCH SONG EEERRROR', e);
    //error(ctx, e);
  }
});

searchSongScene.on('text', async ctx => {
  try {
    let parsedTrack = ctx.message.text.split('\n');
    
    if (parsedTrack.length > 2) {
      scrobbleSong(ctx);
    } else if (parsedTrack.length === 2) {
      let res = await axios(encodeURI(`${config.lastfm.url}track.getInfo&api_key=${config.lastfm.key}&artist=${parsedTrack[0]}&track=${parsedTrack[1]}&format=json`));
      
      if (res.data.error) 
        return scrobbleSong(message);
      
      let track = res.data.track || {};
        track.album = track.album || {};
      let artist = track.artist.name || '',
        name = track.name || '',
        album = track.album.title || '';
      
      let user = await findUserByIdAndSetTrack(ctx.from.id, { name, artist, album });
      track = user.track;
          
      if (track.album) {
        ctx.reply(`Last.fm has additional data about this track:\n\n${track.artist}\n${track.name}\n${track.album}\n\nWould you like to scrobble this track with the new data or leave it as is?`,
          Extra.webPreview(false).markup(Markup.inlineKeyboard([
            [
              Markup.callbackButton('Scr with new data', 'SCR'),
              Markup.callbackButton('Leave it as is', 'LEAVE')
            ], [ Markup.callbackButton('Cancel', 'CANCEL') ]
          ])
        ));
      } else {
        ctx.reply(`Last.fm has no album data about this track. Would you like to enter album title manually?`,
          Extra.webPreview(false).markup(Markup.inlineKeyboard([
            Markup.callbackButton('Yes', 'YES'),
            Markup.callbackButton('No', 'NO')
          ])
        ));
      }
    } else {
      ctx.reply('Format:\n\nArtist\nSong Name\nAlbum Title');
    }
  } catch (e) {
    error(ctx, e);
  }
});

searchSongScene.on('callback_query', async ctx => {
  switch (ctx.callbackQuery.data) {
    case 'SCR': scrobbleSong(ctx); break;
    case 'LEAVE': scrobbleSong(query, false); break;
    case 'YES': 
      await ctx.reply('Send me album title please.');
      ctx.flow.enter('edit_track_album');
      break;
    case 'NO': scrobbleSong(query, false); break;
    case 'CANCEL':
      ctx.editMessageText('Canceled.');
      ctx.flow.leave();
  }
});

export default searchSongScene;