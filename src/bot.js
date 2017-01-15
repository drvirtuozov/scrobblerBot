import Bot from 'telegraf';
import { sendToAdmin } from './helpers/utils';
import { whoami, help } from './helpers/actions';
import { scrobbleSong } from './helpers/scrobble';
import config from './config';

import reportScene from './scenes/report';
import wishScene from './scenes/wish';
import authScene from './scenes/auth';
import scrobbleScene from './scenes/scrobble';

import TelegrafFlow from 'telegraf-flow';

const flow = new TelegrafFlow();


const bot = new Bot(config.token);

import { sync, findOrCreateUser, isUserAuthorized } from './helpers/dbmanager';

flow.command('sync', ctx => {
  sync();
});

flow.command('start', async ctx => {
  let data = await findOrCreateUser({ where: { id: ctx.from.id }});
  
  if (data.created) {
    await ctx.reply(`Hello, ${ctx.from.first_name}!\n\nThis bot provides you ability to scrobble songs, albums or song lists in text mode. To take advantage of these opportunities you have to grant access to your Last.fm account...`);
    ctx.flow.enter('auth');
    await sendToAdmin(`We've got a new user! @${ctx.from.username}`);
  } else {
    ctx.reply('user already exists');
  }
})


/*
bot.on('/alert', (message, next) => {
  if (message.from.id === 1501719) {
    message.echo('Type an alert... /cancel')
    .then(() => {
      bot.setUserMilestone('alert', message.from.id);
    });
  } else {
    next();
  }
});

bot.milestone('album_chosen', albumChosenMilestone);
bot.milestone('alert', alertMilestone);
bot.milestone('edit_album', editAlbumMilestone);
bot.milestone('edit_track_album', editTrackAlbumMilestone);
bot.milestone('no_info', noInfoMilestone);
bot.milestone('scrobble', scrobbleMilestone)
bot.milestone('search_album', searchAlbumMilestone);
bot.milestone('search_song', searchSongMilestone);
bot.milestone('set_tracks', setTracksMilestone);
bot.milestone('song_list', songListMilestone);


bot.milestones.on('command', message => {
  message.echo('If you are confused type /help.');
});*/

flow.command('scrobble', async ctx => {
  let yes = await isUserAuthorized(ctx.from.id);
  yes ? ctx.flow.enter('scrobble') : ctx.flow.enter('auth');
});

flow.command('auth', ctx => {
  ctx.flow.enter('auth');
});

flow.command('wish', ctx => {
  ctx.flow.enter('wish');
});

flow.command('report', (ctx) => {
  ctx.flow.enter('report');
});

flow.command('whoami', async ctx => {
  let yes = await isUserAuthorized(ctx.from.id);
  yes ? whoami(ctx) : ctx.flow.enter('auth');
});

flow.command('help', help);

/*bot.on('text', async ctx => {
  let yes = await isUserAuthorized(ctx.from.id);
  yes ? scrobbleSong(ctx) : ctx.flow.enter('auth');
});*/

flow.register(reportScene);
flow.register(wishScene);
flow.register(authScene);
flow.register(scrobbleScene);

bot.use(Bot.memorySession());
bot.use(flow.middleware());

export default bot;