import mongoose from 'mongoose';


const userSchema = mongoose.Schema({
  _id: { type: Number, required: true },
  username: String,
  key: String,
  account: String,
  token: String,
  scrobbles: { type: Number, default: 0 },
  timestamp: { type: Number, default: Date.now },
  lastScrobble: Number,
  album: {
    title: String,
    artist: String,
    tracks: [{
      name: String,
      duration: { 
        type: Number, 
        default: 300, 
        set: function(duration) { 
          duration = duration || 300;
          return duration < 30 ? 30 : duration; 
        }
      }
    }]
  },
  track: {
    name: String,
    artist: String,
    album: String
  },
  discogsResults: Array
}, {collection: 'scrobbler-users'});

export default mongoose.model('User', userSchema);