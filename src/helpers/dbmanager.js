import db from '../db';
import User from '../models/user';
import Album from '../models/album';
import Track from '../models/track';

User.Album = User.hasOne(Album);
Album.Tracks = Album.hasMany(Track);

export async function createUser(query) {
  let data = await User.create(query);
  console.log(data);
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