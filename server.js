import express from 'express';
import config from './src/config';
import bot from './src/bot';
import db from './src/db';


const app = express();

app.use(bot.webhookCallback(`/${config.token}`));

if (config.NODE_ENV === 'production') {
  app.listen(config.PORT, () => {
    console.log(`Server listening at ${config.IP}:${config.PORT}`);
  });
} else if (config.NODE_ENV === 'development') {
  const https = require('https'),
    fs = require('fs'),
    sslOptions = {
      key: fs.readFileSync('key.key'),
      cert: fs.readFileSync('cert.pem'),
      passphrase: 'test'
    };

  https.createServer(sslOptions, app)
    .listen(config.PORT, () => {
      console.log(`Server listening at ${config.IP}:${config.PORT}`);
    });
}