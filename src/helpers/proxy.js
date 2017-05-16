const proxyLists = require('proxy-lists');
const axios = require('axios');
const config = require('../../config');


let uncheckedProxies = [];
let checkedProxies = [];

async function getUncheckedProxies() {
  const result = [];
  const gettingProxies = proxyLists.getProxies({
    protocols: ['http'],
    ipTypes: ['ipv4'],
  });

  return new Promise((resolve) => {
    gettingProxies.on('data', (proxies) => {
      result.push(...proxies);
    });

    gettingProxies.on('error', (err) => {
      console.log('Getting proxy error:', err.message);
    });

    gettingProxies.once('end', () => {
      console.log(`Done getting proxies. ${result.length} proxies found`);
      resolve(result);
    });
  });
}

async function getCheckedProxies() {
  let checkedCount = 0;
  const result = [];

  return new Promise((resolve) => {
    uncheckedProxies.forEach((proxy) => {
      axios.post(config.LASTFM_URL, null, {
        timeout: 3000,
      })
        .catch((err) => {
          if (err.response && err.response.status === 400) {
            result.push(proxy);
          }

          if (++checkedCount === uncheckedProxies.length) {
            console.log('Proxies checked. Working count:', result.length);
            resolve(result);
          }
        });
    });
  });
}

function getRandomChekedProxy() {
  if (checkedProxies.length) {
    const proxy = checkedProxies[Math.floor(Math.random() * checkedProxies.length)];
    return {
      host: proxy.ipAddress,
      port: proxy.port,
    };
  }

  return {
    host: null,
    port: null,
  };
}

getUncheckedProxies()
  .then((proxies) => {
    uncheckedProxies = proxies;
  })
  .then(() => getCheckedProxies())
  .then((result) => {
    checkedProxies = result;
  });

setInterval(async () => {
  checkedProxies = await getCheckedProxies();
}, 600000); // every 10 minutes

setInterval(async () => {
  uncheckedProxies = await getUncheckedProxies();
}, 3600000); // every 1 hour

module.exports = {
  getRandomChekedProxy,
};
