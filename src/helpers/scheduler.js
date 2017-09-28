const { deleteOldMessages } = require('./dbmanager');


setInterval(async () => {
  await deleteOldMessages();
}, 60000 * 60 * 24); // every 24 hours
