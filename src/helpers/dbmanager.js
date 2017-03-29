const User = require('../models/user');


async function findOrCreateUserById(id) {
  let user = await User.findById(id);

  if (user) {
    return { user, created: false };
  }

  user = await User.create({ _id: id });
  return { user, created: true };
}

function findUserById(id, query) {
  return User.findById(id, query);
}

function findUserByIdAndUpdate(id, updates, opts) {
  return User.findByIdAndUpdate(id, updates, opts);
}

async function isUserAuthorized(ctx) {
  let user = await User.findById(ctx.from.id);
  user = user || {};
  return user.key ? true : false;
}

module.exports = {
  findOrCreateUserById,
  findUserById,
  findUserByIdAndUpdate,
  isUserAuthorized,
};
