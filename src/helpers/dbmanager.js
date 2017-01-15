import db from '../db';
import User from '../models/user';
import Album from '../models/album';
import Track from '../models/track';

User.Album = User.hasOne(Album);
Album.Tracks = Album.hasMany(Track);

export async function findOrCreateUser(query) {
  let [ Instance, created ] = await User.findOrCreate(query);
  return { user: Instance.dataValues, created };
}

export async function findUserById(id) {
  let Instance = await User.findById(id);
  return Instance.dataValues;
}

export async function findUserByIdAndUpdate(id, updates) {
  let Instance = await User.findById(id),
   UpdatedInstance = await Instance.update(updates);

  return UpdatedInstance.dataValues;
}

export async function findUserByIdAndIncrement(id, query) {
  let Instance = await User.findById(id),
   UpdatedInstance = await Instance.increment(query);

  return UpdatedInstance.dataValues;
}

export async function isUserAuthorized(id) {
  let user = await findUserById(id);
  user = user || {};
  return user.key ? true : false;
}

export function sync() {
  return db.sync({ force: true })
    .then(() => {
      return User.create({
        id: 1501719,
        username: 'drvirtuozov',
        album: {
          title: 'Recovery',
          artist: 'Eminem',
          tracks: [
            {
              name: 'Not Afraid',
              duration: 345
            },
            {
              name: 'Space Bound',
              duration: 13
            }
          ]
        }
      }, {
        include: {
          association: User.Album,
          include: [ Album.Tracks ]
        }
      });
    });
}