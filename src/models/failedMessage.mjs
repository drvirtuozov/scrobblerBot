import mongoose from 'mongoose';


const failedMessageSchema = mongoose.Schema({
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
}, { collection: 'scrobbler_failed_messages' });

export default mongoose.model('FailedMessage', failedMessageSchema);
