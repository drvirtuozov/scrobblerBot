const { Extra, Markup } = require('telegraf');
const axios = require('axios');
const { sendToAdmin } = require('./utils');
const { findUserById, findUserByIdAndUpdate, findOrCreateUserById } = require('./dbmanager');
const { LASTFM_URL, LASTFM_KEY } = require('../../config');


async function start(ctx, next) {
  const res = await findOrCreateUserById(ctx.from.id);

  if (res.created) {
    await ctx.reply(`Hello, ${ctx.from.first_name}!\n\nThis bot provides you the ability to scrobble songs, albums or tracklists in text mode. To take advantage of these opportunities you have to grant access to your Last.fm account...`);
    ctx.flow.enter('auth');
    return sendToAdmin(`We've got a new user! @${ctx.from.username}`);
  }

  return next();
}

function help(ctx) {
  ctx.reply('To scrobble a single track just type its info in this format:\n\nArtist\nTrack Name\nAlbum Title\n\nIf you want to scrobble an album or a tracklist use our guide via /scrobble command.\n\nGrant access or change account - /auth\nGet recent scrobbled tracks from your account - /recent\n\nIf you have any ideas or improvements for the bot please tell us about them via /wish command.');
}

async function whoami(ctx) {
  const user = await findUserById(ctx.from.id);
  return ctx.reply(`You are logged in as <a href="http://www.last.fm/user/${user.account}">${user.account}</a>.`, Extra.HTML().webPreview(false));
}

async function nextAlbum(ctx, which) {
  const pages = ctx.callbackQuery.message.text.slice(ctx.callbackQuery.message.text.search(/\d?\d of \d\d/)).split(' of ');
  const i = which === 'NEXT'
    ? +pages[0] + 1 > +pages[1] ? 1 : +pages[0] + 1
    : +pages[0] - 1 < 1 ? +pages[1] : +pages[0] - 1;

  let user = await findUserById(ctx.from.id);
  const id = user.discogs_results[i].id;
  const res = await axios(`https://api.discogs.com/releases/${id}`);

  if (res.data.tracklist.length) {
    const tracks = res.data.tracklist
      .map((track) => {
        const dur = track.duration.split(':');
        return { name: track.title, duration: (dur[0] * 60) + +dur[1] };
      });

    user = await findUserByIdAndUpdate(ctx.from.id, { 'album.tracks': tracks }, { new: true });
  } else {
    user = await findUserByIdAndUpdate(ctx.from.id, {
      'album.tracks': ['There are no any tracks in this result.'],
    }, { new: true });
  }

  const title = user.album.title;
  const artist = user.album.artist;

  return ctx.editMessageText(
    `You are about to scrobble [${title}](${encodeURI(
    `http://www.last.fm/music/${artist}/${title}`)}) by [${artist}](${encodeURI(
    `http://www.last.fm/music/${artist}`)}). The following tracks have been found on Discogs.com and will be scrobbled:\n\n${user.album.tracks.map(track => track.name).join('\n')}\n\nResults: ${i} of ${user.discogs_results.length - 1}`,
    Extra.markdown().webPreview(false).markup(Markup.inlineKeyboard([[
      Markup.callbackButton('Edit', 'EDIT'),
      Markup.callbackButton('⬅️', 'PREV'),
      Markup.callbackButton('➡️', 'NEXT'),
      Markup.callbackButton('Cancel', 'CANCEL'),
    ], [Markup.callbackButton('OK', 'OK')],
    ])));
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
  const res = await axios(encodeURI(
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
  const user = await findUserById(ctx.from.id);
  const res = await axios(`${LASTFM_URL}?method=user.getrecenttracks&user=${user.account}&limit=15&api_key=${LASTFM_KEY}&format=json`);
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

  return ctx.reply(`Here are the very last 15 scrobbled tracks from your account:\n\n${(tracks.map(track => `<a href="${encodeURI(`http://www.last.fm/music/${track.artist}`)}">${track.artist}</a> — <a href="${track.url}">${track.name}</a>`)
    .join('\n'))}`,
      Extra.HTML().webPreview(false));
}

module.exports = {
  start,
  help,
  whoami,
  nextAlbum,
  searchFromLastfmAndAnswerInlineQuery,
  recentTracks,
};
