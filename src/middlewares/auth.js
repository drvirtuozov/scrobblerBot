const { branch } = require('telegraf');
const { isUserAuthorized } = require('../helpers/utils');


module.exports = branch(isUserAuthorized,
  (ctx, next) => next(),
  ctx => ctx.flow.enter('auth'));
