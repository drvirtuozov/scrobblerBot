import Telegraf from 'telegraf';
import { isUserAdmin } from '../helpers/util';


export default Telegraf.branch(isUserAdmin, async (ctx, next) => {
  await next();
}, async (ctx) => {
  await ctx.reply('You don\'t have any permissions to use this command');
});
