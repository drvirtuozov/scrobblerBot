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

function getCheckedProxies(unchecked) {
  const result = [];
  const startTimestamp = Date.now();

  return new Promise(async (resolve) => {
    unchecked.forEach(async (proxy) => {
      try {
        await axios.post(config.LASTFM_URL, null, {
          timeout: 5000,
          maxRedirects: 0,
          proxy: {
            host: proxy.ipAddress,
            port: proxy.port,
          },
        });
      } catch (e) {
        if (e.response && e.response.status === 400) {
          result.push(proxy);
        }
      }
    });

    const interval = setInterval(() => {
      if (Date.now() - startTimestamp > 10000) {
        clearInterval(interval);
        console.log('Proxies checked. Working count:', result.length);
        resolve(result);
      }
    }, 1000);
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

if (config.NODE_ENV === 'production') {
  getUncheckedProxies()
    .then((unchecked) => {
      uncheckedProxies = unchecked;
      return getCheckedProxies(unchecked);
    })
    .then((checked) => {
      checkedProxies = checked;
    });
}

setInterval(async () => {
  checkedProxies = await getCheckedProxies(uncheckedProxies);
}, 600000); // every 10 minutes

setInterval(async () => {
  uncheckedProxies = await getUncheckedProxies();
}, 3600000); // every 1 hour

module.exports = {
  getRandomChekedProxy,
};
