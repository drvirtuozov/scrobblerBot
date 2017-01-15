import db from '../db';


const UserAlbum = db.import('user_album', (db, DataTypes) => {
  const { STRING } = DataTypes;

  return db.define('user_album', {
    title: STRING,
    artist: STRING
  }, { 
    underscored: true,
    timestamps: false
  });
});

export default UserAlbum;