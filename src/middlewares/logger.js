const TelegrafLogger = require('telegraf-logger');


const logger = new TelegrafLogger({
  format: '%updateType => *%sceneId* @%username %firstName %lastName (%fromId): <%updateSubType> %content',
});

module.exports = logger.middleware();
