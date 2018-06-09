import Telegraf from 'telegraf';
import { isUserAuthorized } from '../helpers/util';


export default Telegraf.branch(isUserAuthorized, async (ctx, next) => {
  await next();
}, async (ctx) => {
  await ctx.scene.enter('auth');
});
