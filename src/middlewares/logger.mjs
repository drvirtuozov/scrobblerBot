import TelegrafLogger from 'telegraf-logger';


const logger = new TelegrafLogger({
  format: '%ut => *%si* @%u %fn %ln (%fi): <%ust> %c',
});

export default logger.middleware();
