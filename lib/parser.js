// Formats acceptés (séparés par retour à la ligne, virgule, point-virgule ou espace) :

//   ip:port

//   ip:port:socks5

//   socks5://ip:port

//   http://user:pass@ip:port

const PROTO = /^(https?|socks4a?|socks5h?)$/i;



function parseOne(raw, defProto) {

  let proto = defProto, rest = raw, auth = "";

  const m = raw.match(/^(https?|socks4a?|socks5h?):\/\/(.+)$/i);

  if (m) { proto = m[1].toLowerCase(); rest = m[2]; }



  const at = rest.lastIndexOf("@");

  if (at !== -1) { auth = rest.slice(0, at); rest = rest.slice(at + 1); }



  const parts = rest.split(":");

  if (parts.length === 3 && PROTO.test(parts[2])) { proto = parts[2].toLowerCase(); parts.pop(); }

  if (parts.length !== 2) return null;



  const host = parts[0], port = Number(parts[1]);

  if (!/^[\w.-]+$/.test(host) || !Number.isInteger(port) || port < 1 || port > 65535) return null;



  return {

    raw, proto, host, port, auth,

    key: proto + "://" + auth + "@" + host + ":" + port,

    url: proto + "://" + (auth ? auth + "@" : "") + host + ":" + port

  };

}



function parseList(text, defProto = "http") {

  const out = [], seen = new Set();

  for (const raw of text.split(/[\s,;]+/).filter(Boolean)) {

    const p = parseOne(raw, defProto);

    if (!p) { out.push({ raw, invalid: true }); continue; }

    if (seen.has(p.key)) continue;

    seen.add(p.key);

    out.push(p);

  }

  return out;

}



module.exports = { parseList };



