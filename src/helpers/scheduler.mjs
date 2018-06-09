import { deleteOldMessages } from './dbmanager';


setInterval(async () => {
  await deleteOldMessages();
}, 3600000 * 24); // every 24 hours
