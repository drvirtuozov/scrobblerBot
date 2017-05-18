const mongoose = require('mongoose');


const userSchema = mongoose.Schema({
  _id: { type: Number, required: true },
  username: String,
  key: String,
  account: String,
  token: String,
  scrobbles: { type: Number, default: 0 },
  timestamp: { type: Number, default: Date.now },
  last_scrobble: Number,
  album: {
    title: String,
    artist: String,
    tracks: [{
      name: String,
      duration: {
        type: Number,
        default: 300,
        set(duration) {
          const dur = duration || 300;
          return dur < 30 ? 30 : dur;
        },
      },
    }],
  },
  track: {
    name: String,
    artist: String,
    album: String,
  },
  discogs_results: Array,
  failed: [{
    message_id: Number,
    data: String,
  }],
}, { collection: 'scrobbler-users' });

module.exports = mongoose.model('User', userSchema);
