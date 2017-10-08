const fs = require('fs');
const { NODE_ENV, PORT, SCROBBLERBOT_TOKEN } = require('./config');
const bot = require('./src/bot');


if (NODE_ENV === 'production') {
  bot.startWebhook(`/${SCROBBLERBOT_TOKEN}`, null, PORT);
} else if (NODE_ENV === 'development') {
  const tlsOptions = {
    key: fs.readFileSync('key.key'),
    cert: fs.readFileSync('cert.pem'),
  };

  bot.startWebhook(`/${SCROBBLERBOT_TOKEN}`, tlsOptions, PORT);
}

console.log(`Server is listening to localhost:${PORT}`);
