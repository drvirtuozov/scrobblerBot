const { deleteOldMessages } = require('./dbmanager');
const { getCheckedProxies, setCheckedProxies } = require('./proxy');


setInterval(async () => {
  await deleteOldMessages();
}, 60000 * 60 * 24); // every 24 hours

setInterval(async () => {
  setCheckedProxies(await getCheckedProxies());
}, 60000 * 60); // every hour
