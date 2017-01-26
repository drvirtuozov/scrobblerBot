import express from 'express';
import config from './src/config';
import bot from './src/bot';
import db from './src/db';
import { sendToAdmin } from './src/helpers/utils';


const app = express();

app.use(bot.webhookCallback(`/${config.token}`));

if (config.NODE_ENV === 'production') {
  bot.setWebhook(`${config.SCROBBLERBOT_HOST}/${config.token}`)
    .then(() => {
      sendToAdmin(`Webhook was set on ${config.SCROBBLERBOT_HOST}`);
    });

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