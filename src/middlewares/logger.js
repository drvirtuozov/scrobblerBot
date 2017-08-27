const TelegrafLogger = require('telegraf-logger');


const logger = new TelegrafLogger();

module.exports = logger.middleware();
