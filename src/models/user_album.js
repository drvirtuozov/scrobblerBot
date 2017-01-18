import db from '../db';
import toTitleCase from 'to-title-case';


const UserAlbum = db.import('user_album', (db, DataTypes) => {
  const { STRING } = DataTypes;

  return db.define('user_album', {
    title: {
      type: STRING,
      set: function(value) {
        this.setDataValue('title', toTitleCase(value));
      }
    },
    artist: {
      type: STRING,
      set: function(value) {
        this.setDataValue('artist', toTitleCase(value));
      }
    }
  }, { 
    underscored: true,
    timestamps: false
  });
});

export default UserAlbum;