import db from '../db';


const UserTrack = db.import('user_track', (db, DataTypes) => {
  const { STRING } = DataTypes;

  return db.define('user_track', {
    name: STRING,
    artist: STRING,
    album: STRING
  }, { underscored: true, timestamps: false });
});

export default UserTrack;