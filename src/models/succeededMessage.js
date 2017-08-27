const mongoose = require('mongoose');


const succeededMessageSchema = mongoose.Schema({
  _id: {
    type: Number,
    required: true,
  },
  tracks: [{
    name: {
      type: String,
      required: true,
    },
    artist: {
      type: String,
      required: true,
    },
    album: String,
    duration: {
      type: Number,
      default: 300,
    },
  }],
  timestamp: {
    type: Date,
    default: () => new Date(),
  },
}, { collection: 'scrobbler_succeeded_messages' });

module.exports = mongoose.model('SucceededMessage', succeededMessageSchema);
