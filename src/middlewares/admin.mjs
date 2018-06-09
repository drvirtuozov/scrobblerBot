import Telegraf from 'telegraf';
import { isUserAdmin } from '../helpers/util';


export default Telegraf.branch(isUserAdmin,
  (ctx, next) => next(),
  ctx => ctx.reply('You don\'t have any permissions to use this command'));
