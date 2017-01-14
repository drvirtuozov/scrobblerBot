import db from '../db';

const Album = db.import('album', (db, DataTypes) => {
  const { STRING } = DataTypes;

  return db.define('album', {
    title: STRING,
    artist: STRING
  }, { 
    underscored: true,
    timestamps: false
  });
});

export default Album;