import bot from '../bot';
import { cancelQuery } from '../helpers/utils';


export default function (milestone) {
  milestone.on('callback_query', query => {
    if (query.data === 'SONG') {
      bot.editMessageText({
        text: 'Ok. In order to start searching a song click the button below. Or you can type song info in this format manually:\n\nArtist\nSong Name\nAlbum Title',
        chat_id: query.from.id,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [[
            { text: 'Search...', switch_inline_query_current_chat: '' },
            { text: 'Cancel', callback_data: 'CANCEL' }
          ]]
        }
      })
      .then(() => {
        bot.setUserMilestone('search_song', query.from.id);
      });
    } else if (query.data === 'LIST') {
      bot.editMessageText({
        text: 'Ok. Send me a song list with the following syntax:\n\nArtist | Song Name | Album Title\nArtist | Song Name | Album Title\nArtist | Song Name | Album Title',
        chat_id: query.from.id,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [[
            { text: 'Cancel', callback_data: 'CANCEL' }
          ]]
        }
      })
      .then(() => {
        bot.setUserMilestone('song_list', query.from.id);
      });
    } else if (query.data === 'ALBUM') {
      bot.editMessageText({
        text: 'Ok. In order to start searching an album click the button below. Or you can type album info in this format manually:\n\nArtist\nAlbum Title',
        chat_id: query.from.id,
        message_id: query.message.message_id,
        reply_markup: {
          inline_keyboard: [[
            { text: 'Search...', switch_inline_query_current_chat: '' },
            { text: 'Cancel', callback_data: 'CANCEL' }
          ]]
        }
      })
      .then(() => {
        bot.setUserMilestone('search_album', query.from.id);
      });
    } else if (query.data === 'CANCEL') {
      cancelQuery(query);
    }
  });
}