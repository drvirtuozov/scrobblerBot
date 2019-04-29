import mongoose from 'mongoose';
import { MONGO_HOST, MONGO_PORT, MONGO_DBNAME, MONGO_USERNAME, MONGO_PASSWORD } from './config';


const db = mongoose.connection;

mongoose.Promise = Promise;
mongoose.connect(
  `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DBNAME}`,
  {
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

db.on('reconnected', () => {
  console.log('Reconnected to database');
});

db.on('error', (err) => {
  console.log('Failed to connect to database:', err.message);
});

db.on('open', () => {
  console.log('Connection to database established!');
});

export default db;

