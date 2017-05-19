const axios = require('axios');
const { getRandomChekedProxy } = require('./proxy');


async function proxyPost(url, data) {
  let err = {};
  const proxy = getRandomChekedProxy();

  try {
    const res = await axios.post(url, data, {
      proxy: proxy.host ? proxy : null,
      timeout: 8000,
      maxRedirects: 0,
      validateStatus(status) {
        return status === 200;
      },
    });

    return Promise.resolve(res);
  } catch (e) {
    err = e;
  }

  return Promise.reject(err);
}

module.exports = {
  proxyPost,
};
