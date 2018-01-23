import TelegrafLogger from 'telegraf-logger';


const logger = new TelegrafLogger({
  format: '%updateType => *%sceneId* @%username %firstName %lastName (%fromId): <%updateSubType> %content',
});

export default logger.middleware();
