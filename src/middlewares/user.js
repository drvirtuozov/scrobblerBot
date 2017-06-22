const { findUserById } = require('../helpers/dbmanager');
const { error } = require('../helpers/utils');


module.exports = async (ctx, next) => {
  try {
    ctx.user = await findUserById(ctx.from.id);
    next();
  } catch (e) {
    error(ctx, e);
  }
};
