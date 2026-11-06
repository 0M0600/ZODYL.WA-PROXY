const https = require("https");

const { HttpsProxyAgent } = require("https-proxy-agent");

const { SocksProxyAgent } = require("socks-proxy-agent");



// Le proxy est "vivant" s'il laisse passer une requête vers cette adresse

const TEST_URL = "https://api.ipify.org?format=json";



function checkProxy(p, timeout) {

  return new Promise(resolve => {

    const start = Date.now();

    let done = false, timer, req;

    const finish = r => {

      if (done) return;

      done = true;

      clearTimeout(timer);

      resolve(r);

    };



    let agent;

    try {

      agent = p.proto.startsWith("socks") ? new SocksProxyAgent(p.url) : new HttpsProxyAgent(p.url);

    } catch {

      return finish({ alive: false, error: "config" });

    }



    timer = setTimeout(() => {

      if (req) req.destroy();

      finish({ alive: false, error: "timeout" });

    }, timeout);



    try {

      req = https.get(TEST_URL, { agent }, res => {

        res.resume();

        res.on("end", () => {

          const ok = res.statusCode >= 200 && res.statusCode < 400;

          finish({ alive: ok, ping: Date.now() - start, error: ok ? null : "HTTP " + res.statusCode });

        });

      });

      req.on("error", () => finish({ alive: false, error: "erreur" }));

    } catch {

      finish({ alive: false, error: "erreur" });

    }

  });

}



// Lance "limit" tests en même temps

async function runPool(items, limit, worker) {

  let i = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {

    while (i < items.length) {

      const item = items[i++];

      await worker(item);

    }

  });

  await Promise.all(runners);

}



module.exports = { checkProxy, runPool };



