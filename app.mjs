import fs from 'fs';
import { NODE_ENV, PORT, SCROBBLERBOT_TOKEN } from './config';
import { sendToAdmin } from './src/helpers/util';
import bot from './src/bot';


if (NODE_ENV === 'production') {
  bot.startWebhook(`/${SCROBBLERBOT_TOKEN}`, null, PORT);
} else {
  const tlsOptions = {
    key: fs.readFileSync('key.key'),
    cert: fs.readFileSync('cert.pem'),
  };

  bot.startWebhook(`/${SCROBBLERBOT_TOKEN}`, tlsOptions, PORT);
}

console.log(`Server is listening to localhost:${PORT}`);

process.on('unhandledRejection', (e) => {
  console.log(e);
  sendToAdmin(`Unhandled Rejection! ${e.message}`);
});

process.on('uncaughtException', (e) => {
  console.log(e);
  sendToAdmin(`Uncaught Exception! ${e.message}`);
});
