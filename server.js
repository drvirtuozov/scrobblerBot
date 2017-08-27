const fs = require('fs');
const { NODE_ENV, PORT, SCROBBLERBOT_TOKEN, NOW_LOGS_SECRET } = require('./config');
const bot = require('./src/bot');
const nowLogs = require('now-logs');
require('./src/db');


if (NODE_ENV === 'production') {
  nowLogs(NOW_LOGS_SECRET);
  bot.startWebhook(`/${SCROBBLERBOT_TOKEN}`, null, PORT);
} else if (NODE_ENV === 'development') {
  const sslOptions = {
    key: fs.readFileSync('key.key'),
    cert: fs.readFileSync('cert.pem'),
  };

  bot.startWebhook(`/${SCROBBLERBOT_TOKEN}`, sslOptions, PORT);
}

console.log(`Server is listening to localhost:${PORT}`);
