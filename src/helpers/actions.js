const { Extra } = require('telegraf');
const { sendToAdmin, GLOBAL_KEYBOARD } = require('./utils');
const { findOrCreateUserById } = require('./dbmanager');
const { LASTFM_URL, LASTFM_KEY } = require('../../config');
const { proxyGet } = require('./requests');


async function start(ctx, next) {
  const res = await findOrCreateUserById(ctx.from.id);

  if (res.created) {
    await ctx.reply(`Hello, ${ctx.from.first_name}!
    
This bot allows you to scrobble songs, albums and tracklists in text mode. \
To take advantage of these opportunities you have to grant access to your Last.fm account...`, GLOBAL_KEYBOARD);
    ctx.flow.enter('auth');
    return sendToAdmin(ctx, `We've got a new user! @${ctx.from.username}`);
  }

  return next();
}

function help(ctx) {
  ctx.reply(`To scrobble a track you can simply type its info in this format:
  
Artist\nTrack Name\nAlbum Title

Use the keyboard below for album and tracklist scrobbling.

/auth — grant access or change account
/recent — see recent scrobbled tracks from your account

If you have any ideas or improvements for the bot please tell us about them via /wish command`, GLOBAL_KEYBOARD);
}

async function whoami(ctx) {
  return ctx.reply(`You are logged in as <a href="http://www.last.fm/user/${ctx.user.account}">${ctx.user.account}</a>`,
    Extra.HTML().webPreview(false));
}

async function searchFromLastfmAndAnswerInlineQuery(ctx, type = 'track') {
  if (!ctx.inlineQuery.query) {
    return ctx.answerInlineQuery([{
      type: 'article',
      title: 'Type your query below...',
      id: ctx.inlineQuery.id,
      input_message_content: {
        message_text: 'Type your query below...',
      },
    }]);
  }

  const query = ctx.inlineQuery.query;
  const res = await proxyGet(encodeURI(
    `${LASTFM_URL}?method=${type}.search&${type}=${query}&api_key=${LASTFM_KEY}&format=json`));
  const results = res.data.results[`${type}matches`][`${type}`];
  const inlineResults = results
    .filter(item => item.name !== '(null)')
    .map((item, i) => {
      const photoUrl = item.image[2]['#text'] || 'http://img2-ak.lst.fm/i/u/174s/c6f59c1e5e7240a4c0d427abd71f3dbb.png';

      return {
        type: 'article',
        id: String(i),
        thumb_url: photoUrl,
        photo_width: 174,
        photo_height: 174,
        title: item.name,
        description: `${item.artist}`,
        input_message_content: {
          message_text: `${item.artist}\n${item.name}`,
        },
      };
    });

  return ctx.answerInlineQuery(inlineResults);
}

async function recentTracks(ctx) {
  const res = await proxyGet(`${LASTFM_URL}?method=user.getrecenttracks&user=${ctx.user.account}&limit=15&api_key=${LASTFM_KEY}&format=json`);
  const tracks = res.data.recenttracks.track
    .filter((track) => {
      if (track['@attr']) {
        return !track['@attr'].nowplaying;
      }

      return true;
    })
    .map(track => ({
      artist: track.artist['#text'],
      name: track.name,
      album: track.album['#text'],
      url: track.url,
    }));

  return ctx.reply(`Here are the very last 15 scrobbled tracks from your account:
  
${(tracks.map(track => `<a href="${encodeURI(`http://www.last.fm/music/${track.artist}`)}">${track.artist}</a> — \
<a href="${track.url}">${track.name}</a>`)
    .join('\n'))}`,
      Extra.HTML().webPreview(false));
}

module.exports = {
  start,
  help,
  whoami,
  searchFromLastfmAndAnswerInlineQuery,
  recentTracks,
};
