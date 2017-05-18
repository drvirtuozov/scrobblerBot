const { findUserById } = require('../helpers/dbmanager');


module.exports = async (ctx, next) => {
  const user = await findUserById(ctx.from.id);
  ctx.user = user;
  next();
};
