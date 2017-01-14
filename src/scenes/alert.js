import bot from '../bot';


export default function (milestone) {
  milestone.on('text', message => {
    alert(message);
    bot.setUserMilestone('source', message.from.id);
  });
  
  milestone.on('/cancel', message => {
    message.echo('Canceled.')
      .then(() => {
        bot.setUserMilestone('source', message.from.id);
      });
  });
  
  milestone.on('command', message => {
    alert(message);
    bot.setUserMilestone('source', message.from.id);
  });
}