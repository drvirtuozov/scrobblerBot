const { findUserById } = require('../helpers/dbmanager');
const { error } = require('../helpers/utils');


module.exports = async (ctx, next) => {
  try {
    ctx.user = await findUserById(ctx.from.id);
    return next();
  } catch (e) {
    return error(ctx, e);
  }
};
