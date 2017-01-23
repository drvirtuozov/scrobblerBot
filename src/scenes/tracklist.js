import { Markup } from 'telegraf';
import { Scene } from 'telegraf-flow';
import { scrobbleTracklist, successfulScrobble } from '../helpers/scrobbler';
import { findUserById } from '../helpers/dbmanager';


const tracklistScene = new Scene('tracklist');

tracklistScene.enter(async ctx => {
  await ctx.editMessageText(`Ok. Send me a tracklist with the following syntax:\n\n${new Array(3).fill('Artist | Track Name | Album Title').join('\n')}`,
    Markup.inlineKeyboard([
      Markup.callbackButton('Cancel', 'CANCEL')
  ]).extra());
});

tracklistScene.on('text', async ctx => {
  scrobbleTracklist(ctx);
});

export default tracklistScene;