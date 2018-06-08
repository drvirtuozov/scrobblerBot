import Telegraf from 'telegraf';
import { sendToAdmin, GLOBAL_KEYBOARD, requestError } from '../helpers/util';
import { createUserById } from '../helpers/dbmanager';
import { LASTFM_URL, LASTFM_KEY } from '../../config';
import { proxyGet } from '../helpers/proxy';


export async function start(ctx) {
  await createUserById(ctx.from.id);
  await ctx.reply(`Hello, ${ctx.from.first_name}!\n\n` +
    'This bot allows you to scrobble songs, albums and track lists in text mode. ' +
    'In order to use these features you have to grant access to your Last.fm account...',
    GLOBAL_KEYBOARD);
  await ctx.flow.enter('auth');
  await sendToAdmin(`We've got a new user! @${ctx.from.username}`);
}

export async function help(ctx) {
  await ctx.reply('To scrobble a track simply type its info in this format:\n\n' +
    'Artist\nTrack Name\nAlbum Title\n\n' +
    '<b>Note: Track scrobbling is enabled all the time by default.</b> ' +
    'So use the keyboard below for album and track list scrobbling.\n\n' +
    '/auth — grant access or change account\n' +
    '/recent — see recent scrobbled tracks from your account\n\n' +
    'If you have any ideas or improvements for the bot let us know via /wish command',
    Telegraf.Extra.HTML().load(GLOBAL_KEYBOARD));
}

export async function whoami(ctx) {
  ctx.flow.state.messageIdToEdit = (await ctx.reply('<i>Fetching data...</i>',
    Telegraf.Extra.HTML())).message_id;
  await ctx.telegram.editMessageText(ctx.chat.id, ctx.flow.state.messageIdToEdit, null,
    `You are logged in as <a href="https://www.last.fm/user/${ctx.user.account}">${ctx.user.account}</a>`,
    Telegraf.Extra.HTML().webPreview(false));
}

export async function recent(ctx) {
  ctx.flow.state.messageIdToEdit = (await ctx.reply('<i>Fetching data...</i>',
    Telegraf.Extra.HTML())).message_id;
  let res;

  try {
    res = await proxyGet(
      `${LASTFM_URL}?method=user.getrecenttracks&user=${ctx.user.account}&limit=15&api_key=${LASTFM_KEY}&format=json`);
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

  await ctx.telegram.editMessageText(ctx.chat.id, ctx.flow.state.messageIdToEdit, null,
    'Here are the very last 15 scrobbled tracks from your account:\n\n' +
    `${(tracks.map(track => `<a href="${
      encodeURI(`https://www.last.fm/music/${track.artist}`)
      }">${track.artist}</a> — <a href="${track.url}">${track.name}</a>`).join('\n'))}`,
    Telegraf.Extra.HTML().webPreview(false));
}
