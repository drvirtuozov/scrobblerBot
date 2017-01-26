const config = {
  token: process.env.SCROBBLERBOT,
  lastfm: {
    url: 'http://ws.audioscrobbler.com/2.0/?method=',
    key: process.env.SCROBBLERBOT_LASTFM_KEY,
    secret: process.env.SCROBBLERBOT_LASTFM_SECRET
  },
  discogs: {
    key: process.env.SCROBBLERBOT_DISCOGS_KEY,
    secret: process.env.SCROBBLERBOT_DISCOGS_SECRET,
  },
  NODE_ENV: process.env.NODE_ENV,
  IP: process.env.IP,
  PORT: process.env.PORT,
  SCROBBLERBOT_HOST: process.env.SCROBBLERBOT_HOST,
  MONGODB: process.env.MONGODB
};

const vars = [
  'SCROBBLERBOT', 'SCROBBLERBOT_LASTFM_KEY', 'SCROBBLERBOT_LASTFM_SECRET',
  'SCROBBLERBOT_DISCOGS_KEY', 'SCROBBLERBOT_DISCOGS_SECRET'
];

let undefineds = 0,
  step = 0;

function checkUndefineds(obj) {
  let keys = Object.keys(obj);

  for (let i = 0; i < keys.length; i++) {
    if (typeof obj[keys[i]] === 'undefined') {
      if (!step) throw new Error(`Scrobbler bot requires ${keys[i]} env variable.`);
      undefineds++;
    } else if (typeof obj[keys[i]] === 'object') {
      checkUndefineds(obj[keys[i]]);
    } else {
      vars.splice(vars.indexOf(keys[i]), 1);
    }
  }
}

checkUndefineds(config);
if (undefineds) throw new Error(`Scrobbler bot requires all the environment variables: ${vars.join(', ')}`);

export default config;