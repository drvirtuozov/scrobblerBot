import Telegraf from 'telegraf';
import { isUserAuthorized } from '../helpers/util';


export default Telegraf.branch(isUserAuthorized,
  (ctx, next) => next(),
  ctx => ctx.scene.enter('auth'));
