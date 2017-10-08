const mongoose = require('mongoose');
const config = require('../config');


const db = mongoose.connection;

mongoose.Promise = Promise;
mongoose.connect(config.MONGODB_URL, {
  useMongoClient: true,
  keepAlive: 1,
  connectTimeoutMS: 10000,
}).catch(() => {});

db.on('connecting', () => {
  console.log('Connecting to database...');
});

db.on('disconnected', () => {
  console.log('Disconnected from database');
});

db.on('error', (err) => {
  console.log('Failed to connect to database server:', err.message);
  setTimeout(() => {
    db.openUri(config.MONGODB_URL).catch(() => {});
  }, 10000);
});

db.on('open', () => {
  console.log('Connection to database established!');
});

module.exports = db;

