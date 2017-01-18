import { Markup, Extra } from 'telegraf';
import { Scene } from 'telegraf-flow';
import axios from 'axios';
import config from '../config';
import { error } from '../helpers/utils';
import { nextAlbum } from '../helpers/actions';
import { 
  scrobbleAlbum, successfulScrobble, unsuccessfulScrobble
} from '../helpers/scrobble';
import { findUserByIdAndSetAlbum, findUserByIdAndSetAlbumTracks, findUserByIdAndUpdate } from '../helpers/dbmanager'; 

const searchAlbumScene = new Scene('search_album');

searchAlbumScene.enter(async ctx => {
  await ctx.editMessageText('Ok. In order to start searching an album click the button below. Or you can type album info in this format manually:\n\nArtist\nAlbum Title',
    Markup.inlineKeyboard([
      Markup.switchToCurrentChatButton('Search...', ''),
      Markup.callbackButton('Cancel', 'CANCEL')
  ]).extra());
});

searchAlbumScene.on('inline_query', async ctx => {
  try {
    if (!ctx.inlineQuery.query) return ctx.reply('Type your query below...');
    
    let res = await axios(encodeURI(`${config.lastfm.url}album.search&album=${query.query}&api_key=${config.lastfm.key}&format=json`)),
      albums = res.data.results.albummatches.album;
        
    let results = albums
      .filter(album => album.name !== '(null)')
      .map((album, i) => {
        let photo_url = album.image[2]['#text'] || 'http://img2-ak.lst.fm/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png';
        
        return {
          type: 'article',
          id: String(i),
          thumb_url: photo_url,
          photo_width: 174,
          photo_height: 174,
          title: album.name,
          description: album.artist,
          input_message_content: {
            message_text: `${album.artist}\n${album.name}`
          }
        };
    });

    ctx.answerInlineQuery(results);
  } catch (e) {
    error(ctx, e);
  }
});

searchAlbumScene.on('text', async ctx => {
  try {
    let parsedAlbum = ctx.message.text.split('\n'),
      parsedTitle = parsedAlbum[1],
      parsedArtist = parsedAlbum[0],
      foundOn = '',
      discogsResults = [],
      tracks = [];
      
    if (parsedAlbum.length < 2) return ctx.reply('Format:\n\nArtist\nAlbum Title');
    
    await findUserByIdAndSetAlbum(ctx.from.id, { title: parsedTitle, artist: parsedArtist });

    let results = await Promise.all([
      axios(encodeURI(`https://api.discogs.com/database/search?artist=${parsedArtist}&release_title=${parsedTitle}&type=release&key=${config.discogs.key}&secret=${config.discogs.secret}`)),
      axios(encodeURI(`${config.lastfm.url}album.getinfo&api_key=${config.lastfm.key}&artist=${parsedArtist}&album=${parsedTitle}&format=json`))
    ]);

    if (results[0].data.results[0]) {
      let id = results[0].data.results[0].id;

      discogsResults = results[0].data.results;
      discogsResults.unshift({});

      await findUserByIdAndUpdate(ctx.from.id, { discogs_results: discogsResults }); // implement this function in future

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

    let user = await findUserByIdAndSetAlbumTracks(ctx.from.id, tracks), // implement this function in future
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
    
    ctx.reply(`You are about to scrobble [${name}](${encodeURI(`http://www.last.fm/music/${artist}/${name}`)}) by [${artist}](${encodeURI(`http://www.last.fm/music/${artist}`)}). The following tracks have been found on ${foundOn} and will be scrobbled:\n\n${album.tracks.map(track => track.name).join('\n')}${foundOn === 'Discogs.com' ? 
      `\n\nResults: 1 of ${discogsResults.length - 1}` : ''}`, 
      Extra.markdown().webPreview(false).markup(inlineKeyboard)
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