import { deleteOldMessages } from './dbmanager';
import { startCheckingProxies, getUncheckedProxies } from './proxy';


setInterval(async () => {
  await deleteOldMessages();
}, 3600000 * 24); // every 24 hours

setInterval(async () => {
  startCheckingProxies(await getUncheckedProxies());
}, 3600000 * 24); // every 24 hours
