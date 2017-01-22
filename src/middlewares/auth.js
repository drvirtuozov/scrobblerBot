import { branch } from 'telegraf';
import { isUserAuthorized } from '../helpers/dbmanager';

export default branch(isUserAuthorized, (ctx, next) => {
  next();
}, ctx => {
  ctx.flow.enter('auth');
});