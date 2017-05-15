const axios = require('axios');
const { getRandomChekedProxy } = require('./proxy');


async function proxyPost(url, data) {
  const proxy = getRandomChekedProxy();
  console.log('Request via', proxy.host, proxy.port);
  return axios.post(url, data, {
    proxy: proxy.host ? proxy : null,
  });
}

module.exports = {
  proxyPost,
};
