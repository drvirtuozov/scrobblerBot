const { findUserById } = require('../helpers/dbmanager');


module.exports = async (ctx, next) => {
  if (ctx.inlineQuery) {
    await next();
    return;
  }

  ctx.user = await findUserById(ctx.from.id);
  await next();
};
