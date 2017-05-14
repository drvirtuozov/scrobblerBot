const axios = require('axios');


const proxy = {
  host: null,
  port: null,
};

async function changeProxy() {
  proxy.host = null;
  proxy.port = null;
  const res = await axios('https://gimmeproxy.com/api/getProxy?post=true&http=true&maxCheckPeriod=300');
  proxy.host = res.data.ip;
  proxy.port = res.data.port;
  return Promise.resolve();
}

setInterval(() => {
  console.log('Changing proxy...');
  changeProxy()
    .then(() => {
      console.log(`New proxy ${proxy.host}:${proxy.port}`);
    })
    .catch(e => console.log('Change proxy error:', e.message));
}, 60000 * 5);

module.exports = {
  proxy,
  changeProxy,
};
