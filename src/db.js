const mongoose = require('mongoose');
const { MONGODB_URL } = require('../config');


const db = mongoose.connection;

mongoose.Promise = Promise;
mongoose.connect(MONGODB_URL, {
  useMongoClient: true,
  keepAlive: true,
  autoReconnect: true,
  reconnectTries: Number.MAX_VALUE,
  reconnectInterval: 1000,
});

db.on('connecting', () => {
  console.log('Connecting to database...');
});

db.on('disconnected', () => {
  console.log('Disconnected from database');
});

db.on('disconnected', () => {
  console.log('Reconnected to database');
});

db.on('error', (err) => {
  console.log('Failed to connect to database:', err.message);
});

db.on('open', () => {
  console.log('Connection to database established!');
});

module.exports = db;

