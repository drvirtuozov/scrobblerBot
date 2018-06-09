import Telegram from 'telegraf';
import Scene from 'telegraf/scenes/base';
import { scrobbleTracklist } from '../helpers/scrobbler';


const tracklistScene = new Scene('tracklist');

tracklistScene.enter(async (ctx) => {
  const text = `OK. Send me a track list with the following syntax:\n\n${
    new Array(3).fill('Artist | Track Name | Album Title').join('\n')}`;
  const extra = Telegram.Markup.inlineKeyboard([
    Telegram.Markup.callbackButton('Cancel', 'CANCEL'),
  ]).extra();

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, extra);
    return;
  }

  await ctx.reply(text, extra);
});

tracklistScene.on('text', async (ctx) => {
  await scrobbleTracklist(ctx);
  await ctx.scene.leave();
});

export default tracklistScene;
