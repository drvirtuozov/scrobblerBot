import RedisSession from 'telegraf-session-redis';
import { REDIS_HOST, REDIS_PORT } from '../config';


const session = new RedisSession({
  store: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
  getSessionKey(ctx) {
    return ctx.from.id;
  },
});

export default session.middleware();
