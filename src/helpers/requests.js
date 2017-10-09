const axios = require('axios');
const { getRandomChekedProxy } = require('./proxy');


async function proxyPost(url, data) {
  let error;
  const proxy = getRandomChekedProxy();

  try {
    // throw { message: 'mock error', config: { data } };
    const res = await axios.post(url, data, {
      proxy: proxy.host ? proxy : null,
      timeout: 5000,
      maxRedirects: 0,
      validateStatus(status) {
        return status === 200;
      },
    });

    return Promise.resolve(res);
  } catch (e) {
    try { // try again without proxy
      // throw { message: 'mock error', config: { data } };
      const res = await axios.post(url, data);
      return Promise.resolve(res);
    } catch (err) {
      error = err;
    }
  }

  return Promise.reject(error);
}

async function proxyGet(url) {
  let error;
  const proxy = getRandomChekedProxy();

  try {
    const res = await axios(url, {
      proxy: proxy.host ? proxy : null,
      timeout: 5000,
      maxRedirects: 0,
      validateStatus(status) {
        return status === 200;
      },
    });

    return Promise.resolve(res);
  } catch (e) {
    try { // try again without proxy
      const res = await axios(url);
      return Promise.resolve(res);
    } catch (err) {
      error = err;
    }
  }

  return Promise.reject(error);
}

module.exports = {
  proxyPost,
  proxyGet,
};
