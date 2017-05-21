const { findUserById } = require('../helpers/dbmanager');
const { error } = require('../helpers/utils');


module.exports = async (ctx, next) => {
  try {
    const user = await findUserById(ctx.from.id);
    ctx.user = user;
    next();
  } catch (e) {
    error(ctx, e);
  }
};
