const axios = require('axios');


const proxy = {
  host: null,
  port: null,
};

async function changeProxy() {
  console.log('Changing proxy...');
  const res = await axios('https://gimmeproxy.com/api/getProxy?post=true&http=true&maxCheckPeriod=300');
  proxy.host = res.data.ip;
  proxy.port = res.data.port;
  console.log(`New proxy ${proxy.host}:${proxy.port}`);
  return Promise.resolve();
}

changeProxy();
setInterval(changeProxy, 60000 * 5);

module.exports = {
  proxy,
  changeProxy,
};
