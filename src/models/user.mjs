import mongoose from 'mongoose';


const userSchema = mongoose.Schema({
  _id: { type: Number, required: true },
  username: String,
  key: String,
  account: String,
  token: String,
  scrobbles: { type: Number, default: 0 },
  timestamp: { type: Date, default: () => new Date() },
  last_scrobble: Date,
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
}, { collection: 'scrobbler_users' });

export default mongoose.model('User', userSchema);
