const { findUserById } = require('../helpers/dbmanager');


module.exports = async (ctx, next) => {
  ctx.user = await findUserById(ctx.from.id);
  await next();
};
