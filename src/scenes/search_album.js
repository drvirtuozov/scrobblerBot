import Bot, { Markup, Extra } from 'telegraf';
import { Scene } from 'telegraf-flow';
import axios from 'axios';
import config from '../config';
import { error } from '../helpers/utils';
import { nextAlbum } from '../helpers/actions';
import { 
  scrobbleAlbum, successfulScrobble, unsuccessfulScrobble
} from '../helpers/scrobble';
import { findUserByIdAndUpdate } from '../helpers/dbmanager'; 
import toTitleCase from 'to-title-case';


const searchAlbumScene = new Scene('search_album');

searchAlbumScene.enter(async ctx => {
  await ctx.editMessageText('Ok. In order to start searching an album click the button below. Or you can type album info in this format manually:\n\nArtist\nAlbum Title',
    Markup.inlineKeyboard([
      Markup.switchToCurrentChatButton('Search...', ''),
      Markup.callbackButton('Cancel', 'CANCEL')
  ]).extra());
});

searchAlbumScene.on('text', async ctx => {
  try {
    let parsedAlbum = ctx.message.text.split('\n'),
      parsedTitle = toTitleCase(parsedAlbum[1]),
      parsedArtist = toTitleCase(parsedAlbum[0]),
      foundOn = '',
      discogsResults = [],
      tracks = [];
      
    if (parsedAlbum.length < 2) return ctx.reply('Format:\n\nArtist\nAlbum Title');
    
    await findUserByIdAndUpdate(ctx.from.id, { $set: { album: { title: parsedTitle, artist: parsedArtist }}});

    let results = await Promise.all([
      axios(encodeURI(`https://api.discogs.com/database/search?artist=${parsedArtist}&release_title=${parsedTitle}&type=release&key=${config.discogs.key}&secret=${config.discogs.secret}`)),
      axios(encodeURI(`${config.lastfm.url}album.getinfo&api_key=${config.lastfm.key}&artist=${parsedArtist}&album=${parsedTitle}&format=json`))
    ]);

    if (results[0].data.results[0]) {
      let id = results[0].data.results[0].id;

      discogsResults = results[0].data.results;
      discogsResults.unshift({});

      await findUserByIdAndUpdate(ctx.from.id, { discogs_results: discogsResults.map(result => ({ id: result.id })) });

      let res = await axios(`https://api.discogs.com/releases/${id}`);
      
      if (res.data.tracklist.length) { //strange place
        tracks = res.data.tracklist
          .map(track => { 
            let dur = track.duration.split(':'); 
            return { name: track.title, duration: dur[0] * 60 + +dur[1] };
          });
        
        foundOn = 'Discogs.com'; 
      }
    } else if (results[1].data.album && results[1].data.album.tracks.track.length) {
      tracks = results[1].data.album.tracks.track.map(track => { 
        return { name: track.name, duration: track.duration };
      });
        
      foundOn = 'Last.fm';
    } else {
      ctx.flow.enter('no_info');
    }

    let user = await findUserByIdAndUpdate(ctx.from.id, { 'album.tracks': tracks }, { new: true }),
      album = user.album,
      name = album.title,
      artist = album.artist,
      inlineKeyboard = foundOn === 'Discogs.com' ? 
        Markup.inlineKeyboard([[
          Markup.callbackButton('Edit', 'EDIT'),
          Markup.callbackButton('⬅️', 'PREV'),
          Markup.callbackButton('➡️', 'NEXT'),
          Markup.callbackButton('Cancel', 'CANCEL'),
        ], [ Markup.callbackButton('OK', 'OK') ]]) : 
        Markup.inlineKeyboard([
          Markup.callbackButton('OK', 'OK'),
          Markup.callbackButton('Edit', 'EDIT'),
          Markup.callbackButton('Cancel', 'CANCEL')
        ]);
    
    ctx.reply(`You are about to scrobble <a href="${encodeURI(`http://www.last.fm/music/${artist}/${name}`)}">${name}</a> by <a href="${encodeURI(`http://www.last.fm/music/${artist}`)}">${artist}</a>. The following tracks have been found on ${foundOn} and will be scrobbled:\n\n${album.tracks
      .map(track => track.name).join('\n')}${foundOn === 'Discogs.com' ? 
        `\n\nResults: 1 of ${discogsResults.length - 1}` : ''}`, 
      Extra.HTML().webPreview(false).markup(inlineKeyboard)
    );
  } catch (e) {
    error(ctx, e);
  }
});

searchAlbumScene.on('callback_query', async ctx => {
  switch (ctx.callbackQuery.data) {
    case 'OK': 
      try {
        await scrobbleAlbum(ctx);
        successfulScrobble(ctx);
      } catch (e) {
        unsuccessfulScrobble(ctx, e);
      }

      break;

    case 'EDIT': ctx.flow.enter('edit_album'); break;
    case 'PREV': nextAlbum(ctx, 'PREV'); break;
    case 'NEXT': nextAlbum(ctx, 'NEXT'); break;
    case 'CANCEL': 
      await ctx.editMessageText('Canceled.');
      ctx.flow.leave();
  }
});

export default searchAlbumScene;