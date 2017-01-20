import Bot from 'telegraf';
import TelegrafFlow from 'telegraf-flow';
import Promise from 'bluebird';
import axios from 'axios';
import { sendToAdmin } from './helpers/utils';
import { whoami, help, searchFromLastfmAndAnswerInlineQuery, recentTracks } from './helpers/actions';
import { scrobbleSong } from './helpers/scrobble';
import { test } from './helpers/dbmanager';
import config from './config';
import reportScene from './scenes/report';
import wishScene from './scenes/wish';
import authScene from './scenes/auth';
import scrobbleScene from './scenes/scrobble';
import searchSongScene from './scenes/search_song';
import songListScene from './scenes/song_list';
import searchAlbumScene from './scenes/search_album';
import noAlbumInfoScene from './scenes/no_album_info';
import editAlbumScene from './scenes/edit_album';
import setTracksScene from './scenes/set_tracks';
import { findOrCreateUserById, isUserAuthorized } from './helpers/dbmanager';


const flow = new TelegrafFlow();
const bot = new Bot(config.token);

bot.on('inline_query', searchFromLastfmAndAnswerInlineQuery);

flow.command('start', async ctx => {
  let user = await findOrCreateUserById(ctx.from.id);
  
  if (user.created) {
    await ctx.reply(`Hello, ${ctx.from.first_name}!\n\nThis bot provides you ability to scrobble songs, albums or song lists in text mode. To take advantage of these opportunities you have to grant access to your Last.fm account...`);
    ctx.flow.enter('auth');
    await sendToAdmin(`We've got a new user! @${ctx.from.username}`);
  } else {
    ctx.reply('user already exists');
  }
});


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

flow.command('test', test);
flow.command('help', help);
flow.command('recent', recentTracks);

/*bot.on('text', async ctx => {
  let yes = await isUserAuthorized(ctx.from.id);
  yes ? scrobbleSong(ctx) : ctx.flow.enter('auth');
});*/

flow.register(reportScene);
flow.register(wishScene);
flow.register(authScene);
flow.register(scrobbleScene);
flow.register(searchSongScene);
flow.register(songListScene);
flow.register(searchAlbumScene);
flow.register(noAlbumInfoScene);
flow.register(editAlbumScene);
flow.register(setTracksScene);

bot.use(Bot.memorySession());
bot.use(flow.middleware());

export default bot;