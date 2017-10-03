const User = require('../models/user');
const SucceededMessage = require('../models/succeededMessage');
const FailedMessage = require('../models/failedMessage');


function createUserById(id) {
  return User.create({ _id: id });
}

function findUserById(id) {
  return User.findById(id);
}

function findUserByIdAndUpdate(id, updates) {
  return User.findByIdAndUpdate(id, updates, { upsert: true });
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

async function deleteOldMessages() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  const opts = { timestamp: { $lte: date } };
  await SucceededMessage.deleteMany(opts);
  return FailedMessage.deleteMany(opts);
}

module.exports = {
  createUserById,
  findUserById,
  findUserByIdAndUpdate,
  createSucceededMessage,
  findSucceededMessageById,
  createFailedMessage,
  findFailedMessageById,
  deleteOldMessages,
};
