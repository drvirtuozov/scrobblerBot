import bot from '../bot';
import { cancelQuery } from '../helpers/utils';


export default function (milestone) {
  milestone.on('callback_query', query => {
    if (query.data === 'YES') {
      bot.editMessageText({
        chat_id: query.from.id,
        message_id: query.message.message_id,
        text: 'Just send me song names of the album separated by new lines.',
        reply_markup: {
          inline_keyboard: [[
            { text: 'Cancel', callback_data: 'CANCEL' }
          ]]
        }
      })
      .then(() => {
        bot.setUserMilestone('set_tracks', query.from.id);
      });
    } else if (query.data === 'CANCEL') {
      cancelQuery(query);
    }
  });
}