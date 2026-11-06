const http = require("http");

const cache = new Map();



function postJSON(url, data) {

  return new Promise((resolve, reject) => {

    const u = new URL(url);

    const body = JSON.stringify(data);

    const req = http.request({

      hostname: u.hostname, path: u.pathname + u.search, method: "POST", timeout: 8000,

      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }

    }, res => {

      let buf = "";

      res.on("data", c => buf += c);

      res.on("end", () => { try { resolve(JSON.parse(buf)); } catch (e) { reject(e); } });

    });

    req.on("error", reject);

    req.on("timeout", () => req.destroy(new Error("timeout")));

    req.end(body);

  });

}



// Renvoie { ip: "FR", ... } pour les adresses IPv4 (service gratuit ip-api.com)

async function lookup(hosts) {

  const ips = [...new Set(hosts)].filter(h => /^\d{1,3}(\.\d{1,3}){3}$/.test(h));

  const need = ips.filter(ip => !cache.has(ip));

  for (let i = 0; i < need.length; i += 100) {

    try {

      const data = await postJSON("http://ip-api.com/batch?fields=query,countryCode", need.slice(i, i + 100));

      data.forEach(d => cache.set(d.query, d.countryCode || "--"));

    } catch { /* pays affiché "--" */ }

  }

  const out = {};

  ips.forEach(ip => out[ip] = cache.get(ip) || "--");

  return out;

}



module.exports = { lookup };



