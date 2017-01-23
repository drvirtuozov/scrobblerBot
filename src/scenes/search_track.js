import axios from 'axios';
import { Extra, Markup } from 'telegraf';
import { Scene } from 'telegraf-flow';
import config from '../config';
import { scrobbleTrack } from '../helpers/scrobbler';
import { error } from '../helpers/utils';
import { findUserByIdAndUpdate } from '../helpers/dbmanager';
import { searchFromLastfmAndAnswerInlineQuery } from '../helpers/actions';


const searchTrackScene = new Scene('search_track');

searchTrackScene.enter(async ctx => {
  await ctx.editMessageText('Ok. In order to start searching a track click the button below. Or you can type song info in this format manually:\n\nArtist\nTrack Name\nAlbum Title',
    Markup.inlineKeyboard([
      Markup.switchToCurrentChatButton('Search...', ''),
      Markup.callbackButton('Cancel', 'CANCEL')
  ]).extra());
});

searchTrackScene.on('inline_query', ctx => {
  searchFromLastfmAndAnswerInlineQuery(ctx, 'track');
});

searchTrackScene.on('text', async ctx => {
  try {
    let parsedTrack = ctx.message.text.split('\n');
    
    if (parsedTrack.length > 2) {
      scrobbleTrack(ctx);
    } else if (parsedTrack.length === 2) {
      let res = await axios(encodeURI(`${config.lastfm.url}track.getInfo&api_key=${config.lastfm.key}&artist=${parsedTrack[0]}&track=${parsedTrack[1]}&format=json`));
      
      if (res.data.error) 
        return scrobbleTrack(message);
      
      let track = res.data.track || {};
        track.album = track.album || {};
      let artist = track.artist.name || '',
        name = track.name || '',
        album = track.album.title || '';
      
      let user = await findUserByIdAndUpdate(ctx.from.id, { track: { name, artist, album }});
          
      if (track.album) {
        ctx.reply(`Last.fm has additional data about this track:\n\n${artist}\n${name}\n${album}\n\nWould you like to scrobble this track with the new data or leave it as is?`,
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

searchTrackScene.on('callback_query', async ctx => {
  switch (ctx.callbackQuery.data) {
    case 'SCR': scrobbleTrack(ctx); break;
    case 'LEAVE': scrobbleTrack(ctx, false); break;
    case 'YES': ctx.flow.enter('edit_track_album'); break;
    case 'NO': scrobbleTrack(ctx, false); break;
    case 'CANCEL':
      ctx.editMessageText('Canceled.');
      ctx.flow.leave();
  }
});

export default searchTrackScene;