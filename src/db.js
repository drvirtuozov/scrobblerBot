import mongoose from 'mongoose';
import Promise from 'bluebird';
import config from './config';


const db = mongoose.connection;

mongoose.Promise = Promise;
mongoose.connect(config.MONGODB);

db.on('error', err => {
  console.log('Failed to connect to database server:', err);
});

db.once('open', () => {
  console.log('Connection to database established!');
});

module.exports = db;