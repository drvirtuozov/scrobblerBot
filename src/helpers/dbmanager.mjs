import User from '../models/user';
import SucceededMessage from '../models/succeededMessage';
import FailedMessage from '../models/failedMessage';


export function createUserById(id) {
  return User.create({ _id: id });
}

export function findUserById(id) {
  return User.findById(id);
}

export function findUserByIdAndUpdate(id, updates) {
  return User.findByIdAndUpdate(id, updates, { upsert: true, new: true });
}

export function createSucceededMessage(id, tracks) {
  return SucceededMessage.findByIdAndUpdate(id, {
    tracks,
    timestamp: new Date(),
  }, { upsert: true });
}

export function findSucceededMessageById(id) {
  return SucceededMessage.findById(id);
}

export function createFailedMessage(id, tracks) {
  return FailedMessage.findByIdAndUpdate(id, {
    tracks,
    timestamp: new Date(),
  }, { upsert: true });
}

export function findFailedMessageById(id) {
  return FailedMessage.findById(id);
}

export async function deleteOldMessages() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  const opts = { timestamp: { $lte: date } };
  await SucceededMessage.deleteMany(opts);
  return FailedMessage.deleteMany(opts);
}
