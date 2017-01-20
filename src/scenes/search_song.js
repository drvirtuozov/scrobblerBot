import axios from 'axios';
import { Extra, Markup } from 'telegraf';
import { Scene } from 'telegraf-flow';
import config from '../config';
import { scrobbleSong } from '../helpers/scrobble';
import { error } from '../helpers/utils';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';


const searchSongScene = new Scene('search_song');

searchSongScene.enter(async ctx => {
  await ctx.editMessageText('Ok. In order to start searching a song click the button below. Or you can type song info in this format manually:\n\nArtist\nSong Name\nAlbum Title',
    Markup.inlineKeyboard([
      Markup.switchToCurrentChatButton('Search...', ''),
      Markup.callbackButton('Cancel', 'CANCEL')
  ]).extra());
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
      
      let user = await findUserByIdAndUpdate(ctx.from.id, { track: { name, artist, album }});
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