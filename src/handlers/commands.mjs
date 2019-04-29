import Telegram from 'telegraf';
import { sendToAdmin, GLOBAL_KEYBOARD, requestError, httpGet } from '../helpers/util';
import { createUserById } from '../helpers/dbmanager';
import { LASTFM_URL, LASTFM_KEY } from '../config';


export async function start(ctx) {
  await createUserById(ctx.from.id);
  await ctx.reply(`Hello, ${ctx.from.first_name}!\n\n` +
    'This bot allows you to scrobble songs, albums and track lists in text mode. ' +
    'In order to use these features you have to grant access to your Last.fm account...',
    GLOBAL_KEYBOARD);
  await ctx.scene.enter('auth');
  await sendToAdmin(`We've got a new user! @${ctx.from.username}`);
}

export async function help(ctx) {
  await ctx.reply('To scrobble a track simply type its info in this format:\n\n' +
    'Artist\nTrack Name\nAlbum Title\n\n' +
    '<b>Note: Track scrobbling is enabled all the time by default.</b> ' +
    'So use the keyboard below for album and track list scrobbling.\n\n' +
    '/auth — grant access or change account\n' +
    '/recent — see recent scrobbled tracks from your account\n\n' +
    '<b>Update:</b>\nYou can scrobble tracks by sending audio files to the bot. ' +
    'It will take some time to download and parse audio tags from the file. ' +
    'Be sure to check the tags before sending it.\n\n' +
    '<b>Q/A:</b>\n\n — Why don\'t you let us to scrobble with the specific time and date?\n\n' +
    '<i>The main goal we created this bot was our wish to scrobble "here and now", wherever you are ' +
    'by using your phone. There are some third-party scrobblers for this purpose exist. ' +
    'Also, we don\'t want to complicate the bot by adding inconvenient features. ' +
    'If there\'ll be many more requests we will think about it.</i>\n\n' +
    'If you have any ideas or improvements for the bot let us know via /wish command',
      Telegram.Extra.HTML().load(GLOBAL_KEYBOARD));
}

export async function whoami(ctx) {
  const username = ctx.session.user.account;
  ctx.session.messageIdToEdit = (await ctx.reply('<i>Fetching data...</i>',
    Telegram.Extra.HTML())).message_id;
  await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.messageIdToEdit, null,
    `You are logged in as <a href="https://www.last.fm/user/${username}">${username}</a>`,
      Telegram.Extra.HTML().webPreview(false));
}

export async function recent(ctx) {
  ctx.session.messageIdToEdit = (await ctx.reply('<i>Fetching data...</i>',
    Telegram.Extra.HTML())).message_id;
  let res;

  try {
    const username = ctx.session.user.account;
    res = await httpGet(
      `${LASTFM_URL}?method=user.getrecenttracks&user=${username}&limit=15&api_key=${LASTFM_KEY}&format=json`);
  } catch (e) {
    await requestError(ctx, e);
    return;
  }

  const tracks = res.recenttracks.track
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

  await ctx.telegram.editMessageText(ctx.chat.id, ctx.session.messageIdToEdit, null,
    'Here are the very last 15 scrobbled tracks from your account:\n\n' +
    `${(tracks.map(track => `<a href="${
      encodeURI(`https://www.last.fm/music/${track.artist}`)
      }">${track.artist}</a> — <a href="${track.url}">${track.name}</a>`).join('\n'))}`,
        Telegram.Extra.HTML().webPreview(false));
}
