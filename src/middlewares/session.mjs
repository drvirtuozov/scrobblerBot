import Telegraf from 'telegraf';
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

// This is a wrapper for a session middleware to store updated session data after throwing an error
export default Telegraf.compose([async (ctx, next) => {
  // wait for the session function
  await next();

  // if there's an error throw it for the error middleware to catch it
  if (ctx.state.error) {
    throw ctx.state.error;
  }
}, session.middleware(), async (ctx, next) => {
  // setting default session state
  if (ctx.session && !ctx.session.state) {
    ctx.session.state = {};
  }

  // try to catch an error
  try {
    await next();
  } catch (e) {
    // if there's an error pass it to the context state
    // in order to session.middleware thought that it's "allright" and stored yourself
    ctx.state.error = e;
  }
}]);
