const axios = require('axios');
const { getRandomChekedProxy } = require('./proxy');


async function proxyPost(url, data) {
  let err = {};

  for (let i = 0; i < 3; i++) { // 3 attempts
    const proxy = getRandomChekedProxy();

    try {
      const res = await axios.post(url, data, {
        proxy: proxy.host ? proxy : null,
        timeout: 6000,
      });

      return Promise.resolve(res);
    } catch (e) {
      err = e;
    }
  }

  return Promise.reject(err);
}

module.exports = {
  proxyPost,
};
