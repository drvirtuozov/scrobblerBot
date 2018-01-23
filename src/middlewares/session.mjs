import RedisSession from 'telegraf-session-redis';
import { REDIS_URL } from '../../config';


const session = new RedisSession({
  store: {
    url: REDIS_URL,
  },
  getSessionKey(ctx) {
    return ctx.from.id;
  },
});

export default session.middleware();
