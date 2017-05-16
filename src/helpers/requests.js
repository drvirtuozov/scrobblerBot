const axios = require('axios');
const { getRandomChekedProxy } = require('./proxy');


async function proxyPost(url, data) {
  const proxy = getRandomChekedProxy();
  return axios.post(url, data, {
    proxy: proxy.host ? proxy : null,
    timeout: 10000,
  });
}

module.exports = {
  proxyPost,
};
