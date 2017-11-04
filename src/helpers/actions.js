const { Extra } = require('telegraf');
const he = require('he');
const { sendToAdmin, GLOBAL_KEYBOARD } = require('./utils');
const { createUserById } = require('./dbmanager');
const { LASTFM_URL, LASTFM_KEY } = require('../../config');
const { proxyGet } = require('./requests');


async function start(ctx) {
  await createUserById(ctx.from.id);
  await ctx.reply(`Hello, ${ctx.from.first_name}!\n\n` +
    'This bot allows you to scrobble songs, albums and track lists in text mode. ' +
    'To take advantage of these opportunities you have to grant access to your Last.fm account...',
    GLOBAL_KEYBOARD);
  await ctx.flow.enter('auth');
  await sendToAdmin(`We've got a new user! @${ctx.from.username}`);
}

async function help(ctx) {
  await ctx.reply('To scrobble a track simply type its info in this format:\n\n' +
    'Artist\nTrack Name\nAlbum Title\n\n' +
    '<b>Note: Track scrobbling is enabled all the time by default.</b> ' +
    'So use the keyboard below for album and track list scrobbling.\n\n' +
    '/auth — grant access or change account\n' +
    '/recent — see recent scrobbled tracks from your account\n\n' +
    'If you have any ideas or improvements for the bot please tell us about them via /wish command',
  Extra.HTML().load(GLOBAL_KEYBOARD));
}

async function whoami(ctx) {
  ctx.flow.state.messageIdToEdit = (await ctx.reply('<i>Fetching data...</i>',
    Extra.HTML())).message_id;
  await ctx.telegram.editMessageText(ctx.chat.id, ctx.flow.state.messageIdToEdit, null,
    `You are logged in as <a href="https://www.last.fm/user/${ctx.user.account}">${ctx.user.account}</a>`,
      Extra.HTML().webPreview(false));
}

async function searchFromLastfmAndAnswerInlineQuery(ctx, type = 'track') {
  if (!ctx.inlineQuery.query) {
    await ctx.answerInlineQuery([{
      type: 'article',
      title: 'Type your query below...',
      id: ctx.inlineQuery.id,
      input_message_content: {
        message_text: 'Type your query below...',
      },
    }]);

    return;
  }

  const query = ctx.inlineQuery.query;
  const res = await proxyGet(encodeURI(he.decode(
    `${LASTFM_URL}?method=${type}.search&${type}=${query}&api_key=${LASTFM_KEY}&format=json`)));
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

  await ctx.answerInlineQuery(inlineResults);
}

async function recentTracks(ctx) {
  ctx.flow.state.messageIdToEdit = (await ctx.reply('<i>Fetching data...</i>',
    Extra.HTML())).message_id;
  const res = await proxyGet(
    `${LASTFM_URL}?method=user.getrecenttracks&user=${ctx.user.account}&limit=15&api_key=${LASTFM_KEY}&format=json`);
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

  await ctx.telegram.editMessageText(ctx.chat.id, ctx.flow.state.messageIdToEdit, null,
    'Here are the very last 15 scrobbled tracks from your account:\n\n' +
    `${(tracks.map(track => `<a href="${
      encodeURI(`https://www.last.fm/music/${track.artist}`)
      }">${track.artist}</a> — <a href="${track.url}">${track.name}</a>`).join('\n'))}`,
    Extra.HTML().webPreview(false));
}

module.exports = {
  start,
  help,
  whoami,
  searchFromLastfmAndAnswerInlineQuery,
  recentTracks,
};
