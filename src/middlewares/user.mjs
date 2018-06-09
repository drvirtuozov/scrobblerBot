import { findUserById } from '../helpers/dbmanager';


export default async (ctx, next) => {
  if (ctx.inlineQuery) {
    return next();
  } else if (ctx.callbackQuery) {
    switch (ctx.callbackQuery.data) {
      case 'CANCEL':
      case 'REPEAT':
        return next();
      default: // pass
    }
  }

  ctx.user = await findUserById(ctx.from.id);
  return next();
};
