import { findUserById } from '../helpers/dbmanager';


export default async (ctx, next) => {
  if (ctx.session.user) {
    return next();
  }

  ctx.session.user = await findUserById(ctx.from.id);
  return next();
};
