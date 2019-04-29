import Telegram from 'telegraf';
import he from 'he';
import {
  httpGet, requestError, successfulScrobble, scrobbleError, multipleArray,
} from '../helpers/util';
import { LASTFM_URL, LASTFM_KEY } from '../config';
import { scrobbleTracks, scrobbleTracksByParts } from '../helpers/scrobbler';
import { findSucceededMessageById, findFailedMessageById } from '../helpers/dbmanager';


export async function cancel(ctx) {
  await ctx.scene.leave();
  await ctx.editMessageText('Canceled');
}

export async function searchFromLastfmAndAnswerInlineQuery(ctx, type = 'track') {
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

  const query = encodeURIComponent(he.decode(ctx.inlineQuery.query));
  let res;

  try {
    res = await httpGet(`${LASTFM_URL}?method=${type}.search&${type}=${query}&api_key=${LASTFM_KEY}&format=json`);
  } catch (e) {
    await requestError(ctx, e);
    return;
  }

  const results = res.results[`${type}matches`][`${type}`];
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

export async function retry(ctx) {
  ctx.session.messageIdToEdit = (await ctx.editMessageText('<i>Scrobbling...</i>',
    Telegram.Extra.HTML())).message_id;
  const messageId = ctx.callbackQuery.message.message_id;
  const message = await findFailedMessageById(messageId);

  if (!message) {
    await ctx.editMessageText('Expired');
    return;
  }

  try {
    await scrobbleTracks(message.tracks, undefined, ctx.session.user.key);
  } catch (e) {
    await scrobbleError(ctx, e, message.tracks);
    return;
  }

  await successfulScrobble(ctx);
}

export async function repeat(ctx) {
  const messageId = ctx.callbackQuery.message.message_id;
  const message = await findSucceededMessageById(messageId);

  if (!message) {
    await ctx.editMessageText('Expired');
    return;
  }

  await ctx.editMessageText('How many times do you want to scrobble this again?',
    Telegram.Markup.inlineKeyboard([
      [
        Telegram.Markup.callbackButton('1', 'REPEAT:1'),
        Telegram.Markup.callbackButton('2', 'REPEAT:2'),
        Telegram.Markup.callbackButton('3', 'REPEAT:3'),
        Telegram.Markup.callbackButton('4', 'REPEAT:4'),
        Telegram.Markup.callbackButton('5', 'REPEAT:5'),
      ],
      [
        Telegram.Markup.callbackButton('6', 'REPEAT:6'),
        Telegram.Markup.callbackButton('7', 'REPEAT:7'),
        Telegram.Markup.callbackButton('8', 'REPEAT:8'),
        Telegram.Markup.callbackButton('9', 'REPEAT:9'),
        Telegram.Markup.callbackButton('10', 'REPEAT:10'),
      ],
    ]).extra());
}

export async function repeatMany(ctx) {
  ctx.session.messageIdToEdit = (await ctx.editMessageText('<i>Scrobbling...</i>',
    Telegram.Extra.HTML())).message_id;
  const messageId = ctx.callbackQuery.message.message_id;
  const message = await findSucceededMessageById(messageId);

  if (!message) {
    await ctx.editMessageText('Expired');
    return;
  }

  const count = ctx.callbackQuery.data.split(':')[1];
  const tracks = multipleArray(message.tracks, count);

  try {
    await scrobbleTracksByParts(ctx, tracks);
  } catch (e) {
    await scrobbleError(ctx, e, tracks);
    return;
  }

  await successfulScrobble(ctx, undefined, message.tracks);
}
