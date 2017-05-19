const User = require('../models/user');


async function findOrCreateUserById(id) {
  let user = await User.findById(id);

  if (user) {
    return { user, created: false };
  }

  user = await User.create({ _id: id });
  return { user, created: true };
}

function findUserById(id) {
  return User.findById(id);
}

function findUserByIdAndUpdate(id, updates, opts) {
  return User.findByIdAndUpdate(id, updates, opts);
}

module.exports = {
  findOrCreateUserById,
  findUserById,
  findUserByIdAndUpdate,
};
