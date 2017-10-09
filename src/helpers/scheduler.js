const { deleteOldMessages } = require('./dbmanager');
const { startCheckingProxies, getUncheckedProxies } = require('./proxy');


setInterval(async () => {
  await deleteOldMessages();
}, 3600000 * 24); // every 24 hours

setInterval(async () => {
  startCheckingProxies(await getUncheckedProxies());
}, 3600000 * 12); // every 12 hours
