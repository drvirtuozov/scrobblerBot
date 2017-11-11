const { findUserById } = require('../helpers/dbmanager');


module.exports = async (ctx, next) => {
  if (ctx.inlineQuery) {
    await next();
    return;
  } else if (ctx.callbackQuery) {
    switch (ctx.callbackQuery.data) {
      case 'CANCEL':
      case 'REPEAT':
        await next();
        return;
      default: // pass
    }
  }

  ctx.user = await findUserById(ctx.from.id);
  await next();
};
