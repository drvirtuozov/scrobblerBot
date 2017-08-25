const RedisSession = require('telegraf-session-redis');
const config = require('../../config');


const session = new RedisSession({
  store: {
    url: config.REDIS_URL,
  },
  getSessionKey(ctx) {
    return ctx.from.id;
  },
});

module.exports = {
  session,
  sessionMiddleware: session.middleware(),
};
