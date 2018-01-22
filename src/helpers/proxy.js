const proxyLists = require('proxy-lists');
const HttpsProxyAgent = require('https-proxy-agent');
const { httpPost, httpGet, sendToAdmin } = require('./utils');
const config = require('../../config');


let checkedProxies = [];
let isProxyEnabled = false;

function setProxyEnabled(value) {
  if (typeof value === 'undefined') {
    isProxyEnabled = !isProxyEnabled;
    return isProxyEnabled;
  }

  isProxyEnabled = !!value;
  return isProxyEnabled;
}

function getDefaultProxyOpts(proxy = {}) {
  return {
    redirect: 'error',
    follow: 0,
    timeout: 15000,
    agent: new HttpsProxyAgent({
      host: proxy.host || proxy.ipAddress,
      port: proxy.port,
      secureProxy: true,
    }),
  };
}

function getRandomChekedProxy() {
  if (checkedProxies.length) {
    const proxy = checkedProxies[Math.floor(Math.random() * checkedProxies.length)];
    return {
      host: proxy.ipAddress,
      port: proxy.port,
    };
  }

  return null;
}

function proxyGet(url = '') {
  if (isProxyEnabled) {
    const proxy = getRandomChekedProxy();
    return httpGet(url, getDefaultProxyOpts(proxy));
  }

  return httpGet(url);
}

function proxyPost(url = '', data = {}) {
  if (isProxyEnabled) {
    const proxy = getRandomChekedProxy();
    return httpPost(url, data, getDefaultProxyOpts(proxy));
  }

  return httpPost(url, data);
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
      await httpPost(config.LASTFM_URL, null, getDefaultProxyOpts(proxy));
    } catch (e) {
      if (e.response && e.response.status === 400) { // normal behavior
        checkedProxies.push(proxy);
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
  proxyGet,
  setProxyEnabled,
};
