import User from '../models/user';


export async function findOrCreateUserById(id) {
  let user = await User.findById(id);
  
  if (user) {
    return { user, created: false };
  } else {
    user = await User.create({ _id: id });
    return { user, created: true };
  }
}

export function findUserById(id, query) {
  return User.findById(id, query);
}

export function findUserByIdAndUpdate(id, updates, opts) {
  return User.findByIdAndUpdate(id, updates, opts);
}

export async function isUserAuthorized(id) {
  let user = await User.findById(id);
  user = user || {};
  return user.key ? true : false;
}