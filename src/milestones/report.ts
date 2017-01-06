import bot from '../bot';
import { sendToAdmin } from '../helpers/utils';


export default function (milestone) {
  milestone.on('text', message => {
    sendToAdmin(`A report from @${message.from.username}: ${message.text}`)
      .then(() => {
        return message.echo('Thanks! We have successfully received your bug report.');
      })
      .then(() => {
        bot.setUserMilestone('source', message.from.id);
      });
  });
  
  milestone.on('/cancel', message => {
    message.echo('Canceled.')
      .then(() => {
        bot.setUserMilestone('source', message.from.id);
      });
  });
}