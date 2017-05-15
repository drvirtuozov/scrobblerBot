const proxyLists = require('proxy-lists');


let uncheckedProxies = [];

async function getUncheckedProxies() {
  const results = [];
  const gettingProxies = proxyLists.getProxies({
    countries: null,
    protocols: ['http'],
    ipTypes: ['ipv4'],
  });

  return new Promise((resolve) => {
    gettingProxies.on('data', (proxies) => {
      results.push(...proxies);
    });

    gettingProxies.on('error', (err) => {
      console.log('Getting proxy error:', err.message);
    });

    gettingProxies.once('end', () => {
      console.log('Done getting proxies\n');
      resolve(results);
    });
  });
}

getUncheckedProxies()
  .then((proxies) => {
    uncheckedProxies = proxies;
  })
  .catch((err) => {
    console.log('Getting unchecked proxies error:', err.message);
  });

function getRandomChekedProxy() {
  if (uncheckedProxies.length) {
    const proxy = uncheckedProxies[Math.floor(Math.random() * uncheckedProxies.length)];
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

module.exports = {
  getRandomChekedProxy,
};
