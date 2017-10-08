const fs = require('fs');
const dotenv = require('dotenv');


if (process.env.NODE_ENV === 'production') {
  dotenv.config();
} else if (process.env.NODE_ENV === 'development') {
  process.env = dotenv.parse(fs.readFileSync('.env.dev'));
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGODB_URL: process.env.MONGODB_URL,
  SCROBBLERBOT_TOKEN: process.env.SCROBBLERBOT_TOKEN,
  LASTFM_URL: process.env.LASTFM_URL,
  LASTFM_KEY: process.env.LASTFM_KEY,
  LASTFM_SECRET: process.env.LASTFM_SECRET,
  ADMIN_ID: process.env.ADMIN_ID,
  REDIS_URL: process.env.REDIS_URL,
};
