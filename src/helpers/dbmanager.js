const User = require('../models/user');
const SucceededMessage = require('../models/succeededMessage');
const FailedMessage = require('../models/failedMessage');


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

function createSucceededMessage(id, tracks) {
  return SucceededMessage.findByIdAndUpdate(id, {
    tracks,
    timestamp: new Date(),
  }, { upsert: true });
}

function findSucceededMessageById(id) {
  return SucceededMessage.findById(id);
}

function createFailedMessage(id, tracks) {
  return FailedMessage.findByIdAndUpdate(id, {
    tracks,
    timestamp: new Date(),
  }, { upsert: true });
}

function findFailedMessageById(id) {
  return FailedMessage.findById(id);
}

module.exports = {
  findOrCreateUserById,
  findUserById,
  findUserByIdAndUpdate,
  createSucceededMessage,
  findSucceededMessageById,
  createFailedMessage,
  findFailedMessageById,
};
