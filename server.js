const http = require("http");

const fs = require("fs");

const path = require("path");

const { parseList } = require("./lib/parser");

const { checkProxy, runPool } = require("./lib/checker");

const { lookup } = require("./lib/geo");



const PORT = process.env.PORT || 3000;

const PUBLIC = path.join(__dirname, "public");

const MAX_PROXIES = 5000;

const MIME = {

  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",

  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"

};



function serveStatic(req, res) {

  let urlPath = decodeURIComponent(req.url.split("?")[0]);

  if (urlPath === "/") urlPath = "/index.html";

  const file = path.join(PUBLIC, path.normalize(urlPath));

  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }

  fs.readFile(file, (err, data) => {

    if (err) { res.writeHead(404); return res.end("404"); }

    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });

    res.end(data);

  });

}



function handleCheck(req, res) {

  let body = "";

  req.on("data", c => { body += c; if (body.length > 2e6) req.destroy(); });

  req.on("end", async () => {

    let opt;

    try { opt = JSON.parse(body); } catch { res.writeHead(400); return res.end(); }



    const protocol = ["http", "socks5", "socks4"].includes(opt.protocol) ? opt.protocol : "http";

    const concurrency = Math.min(Math.max(parseInt(opt.concurrency) || 50, 1), 200);

    const timeout = Math.min(Math.max(parseInt(opt.timeout) || 8000, 1000), 30000);

    const items = parseList(String(opt.list || ""), protocol).slice(0, MAX_PROXIES);



    res.writeHead(200, { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" });

    const send = obj => res.write(JSON.stringify(obj) + "\n");

    let aborted = false;

    res.on("close", () => { if (!res.writableEnded) aborted = true; });



    send({ type: "start", total: items.length });

    const alive = [];



    await runPool(items.map((p, id) => ({ p, id })), concurrency, async ({ p, id }) => {

      if (aborted) return;

      if (p.invalid) {

        return send({ type: "result", id, label: p.raw, alive: false, error: "invalide" });

      }

      const r = await checkProxy(p, timeout);

      if (aborted) return;

      send({ type: "result", id, label: p.host + ":" + p.port, copy: p.url, alive: r.alive, ping: r.ping, error: r.error });

      if (r.alive) alive.push({ id, host: p.host });

    });



    if (!aborted && alive.length) {

      const geo = await lookup(alive.map(a => a.host));

      alive.forEach(a => send({ type: "geo", id: a.id, country: geo[a.host] || "--" }));

    }

    send({ type: "done" });

    res.end();

  });

}



http.createServer((req, res) => {

  if (req.method === "POST" && req.url === "/api/check") return handleCheck(req, res);

  serveStatic(req, res);

}).listen(PORT, "0.0.0.0", () => console.log("SYSTÈME ZODYL PROXY → port " + PORT));



