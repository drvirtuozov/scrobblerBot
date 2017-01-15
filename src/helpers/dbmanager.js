import db from '../db';
import User from '../models/user';
import UserTrack from '../models/user_track';
import UserAlbum from '../models/user_album';
import AlbumTrack from '../models/album_track';


User.Album = User.hasOne(UserAlbum, { as: 'album' });
User.Track = User.hasOne(UserTrack, { as: 'track' });
UserAlbum.Tracks = UserAlbum.hasMany(AlbumTrack, { as: 'tracks' });

export async function findOrCreateUser(query) {
  let [ Instance, created ] = await User.findOrCreate(query);
  return { user: Instance.dataValues, created };
}

export async function findUserById(id) {
  let Instance = await User.findById(id);
  return Instance.dataValues;
}

export async function findUserByIdAndSetTrack(id, track) {
  let Instance = await User.findById(id, { include: [{ model: UserTrack, as: 'track' }] }),
    TrackInstance = await Instance.track.updateAttributes(track),
    user = Instance.dataValues;
  
  user.track = TrackInstance.dataValues;
  return user;
}

export async function findUserByIdWithTrack(id) {
  let Instance = await User.findById(id, { include: [{ model: UserTrack, as: 'track' }] });

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
        },
        track: {
          name: 'Dancing with Myself',
          artist: 'Billy Idol',
          album: 'Billy Idol'
        }
      }, {
        include: [
          {
            association: User.Album,
            include: [ UserAlbum.Tracks ]
          },
          {
            association: User.Track
          }
        ]
      });
    });
}