const { branch } = require('telegraf');
const { isUserAuthorized } = require('../helpers/dbmanager');


module.exports = branch(isUserAuthorized, (ctx, next) => {
  next();
}, (ctx) => {
  ctx.flow.enter('auth');
});
