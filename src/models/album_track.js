import db from '../db';

const AlbumTrack = db.import('album_track', (db, DataTypes) => {
  const { STRING, INTEGER } = DataTypes;

  return db.define('album_track', {
    name: STRING,
    duration: {
      type: INTEGER,
      defaultValue: 300,
      set: function(duration) { 
        duration = duration || 300;
        this.setDataValue('duration', duration < 30 ? 30 : duration); 
      }
    }
  }, { 
    underscored: true,
    timestamps: false
  });
});

export default AlbumTrack;