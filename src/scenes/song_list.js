import { Markup } from 'telegraf';
import { Scene } from 'telegraf-flow';
import { scrobbleSongs, successfulScrobble } from '../helpers/scrobble';
import { findUserById } from '../helpers/dbmanager';


const songListScene = new Scene('song_list');

songListScene.enter(async ctx => {
  await ctx.editMessageText('Ok. Send me a song list with the following syntax:\n\nArtist | Song Name | Album Title\nArtist | Song Name | Album Title\nArtist | Song Name | Album Title',
    Markup.inlineKeyboard([
      Markup.callbackButton('Cancel', 'CANCEL')
  ]).extra());
});

songListScene.on('text', async ctx => {
  try {
    let tracks = ctx.message.text.split('\n')
      .map(string => {
        if (string.split('|').length < 2) {
          return ctx.reply('Please, send me valid data with this syntax:\n\nArtist | Song Name | Album Title');
        }
        
        let track = string.split('|');
        
        return {
          name: track[1],
          artist: track[0],
          album: track[2] || '',
          duration: 300
        };
      }),
      parts = [];
      
    while (tracks[0]) {
      parts.push(tracks.slice(0, 50));
      tracks = tracks.slice(50);
    }
    
    let user = await findUserById(ctx.from.id),
      results = await Promise.all(parts.map(part => scrobbleSongs(part, user.key))),
      ignored = [];
        
    results.forEach(result => {
      result.data.scrobbles.scrobble
        .filter(scrobble => scrobble.ignoredMessage.code === '1')
        .forEach(scr => ignored.push(scr));
    });
    
    if (ignored.length)
      return successfulScrobble(ctx, `Success, but...\nThe following tracks have been ignored:\n\n${ignored.map(track => `${track.artist['#text']} | ${track.track['#text']} | ${track.album['#text']}`).join('\n')}`);
    
    successfulScrobble(ctx);
  } catch (e) {
    error(ctx, e);
  }
});

songListScene.on('callback_query', async ctx => {
  switch (ctx.callbackQuery.data) {
    case 'CANCEL': 
      await ctx.editMessageText('Canceled.'); 
      ctx.flow.leave(); 
      break;
  }
});

export default songListScene;