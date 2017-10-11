const proxyLists = require('proxy-lists');
const axios = require('axios');
const config = require('../../config');


let checkedProxies = [];

async function getUncheckedProxies() {
  const result = [];
  const gettingProxies = proxyLists.getProxies({
    protocols: ['https'],
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

async function startCheckingProxies(proxies) {
  console.log('Started checking proxies...');
  checkedProxies = [];

  for (const proxy of proxies) {
    try {
      await axios.post(config.LASTFM_URL, null, {
        timeout: 3000,
        maxRedirects: 0,
        proxy: {
          host: proxy.ipAddress,
          port: proxy.port,
        },
      });
    } catch (e) {
      if (e.response && e.response.status === 400) { // normal behavior
        checkedProxies.push(proxy);
      }
    }
  }

  console.log('Proxies checked. Working count:', checkedProxies.length);
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

if (config.NODE_ENV === 'production') {
  setImmediate(async () => {
    startCheckingProxies(await getUncheckedProxies());
  });
}

module.exports = {
  getUncheckedProxies,
  getRandomChekedProxy,
  startCheckingProxies,
};
