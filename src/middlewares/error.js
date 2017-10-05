const { error } = require('../helpers/utils');


module.exports = async (ctx, next) => {
  try {
    await next();
  } catch (e) {
    await error(ctx, e);
  }
};
