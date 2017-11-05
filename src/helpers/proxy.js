const proxyLists = require('proxy-lists');
const HttpsProxyAgent = require('https-proxy-agent');
const { httpPost } = require('./utils');
const config = require('../../config');


let checkedProxies = [];

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

async function proxyPost(url = '', data = {}) {
  const proxy = getRandomChekedProxy();

  try {
    const res = await httpPost(url, data, {
      redirect: 'error',
      follow: 0,
      timeout: 3000,
      agent: new HttpsProxyAgent({
        host: proxy.host,
        port: proxy.port,
        secureProxy: true,
      }),
    });

    return res;
  } catch (e) {
    return httpPost(url, data);
  }
}

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
      await httpPost(config.LASTFM_URL, null, {
        redirect: 'error',
        follow: 0,
        timeout: 3000,
        agent: new HttpsProxyAgent({
          host: proxy.ipAddress,
          port: proxy.port,
          secureProxy: true,
        }),
      });
    } catch (e) {
      if (e.response && e.response.status === 400) { // normal behavior
        checkedProxies.push(proxy);
        continue;
      }
    }
  }

  console.log('Proxies checked. Working count:', checkedProxies.length);
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
  proxyPost,
};
