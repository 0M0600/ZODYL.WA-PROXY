const $ = id => document.getElementById(id);

let ctrl = null;

let rows = new Map();

let st, aliveList;



/* ===== EFFETS ===== */



// Machine à écrire

function typeText(el, speed = 70) {

  const text = el.textContent;

  el.textContent = "";

  el.classList.add("typing");

  let i = 0;

  const t = setInterval(() => {

    el.textContent = text.slice(0, ++i);

    if (i >= text.length) {

      clearInterval(t);

      setTimeout(() => el.classList.remove("typing"), 1500);

    }

  }, speed);

}



// Flash vert / rouge sur les bords de l'écran

function flash(type) {

  const f = $("flash");

  f.className = "";

  void f.offsetWidth;

  f.className = type;

}



// Compteurs qui montent chiffre par chiffre

function countTo(el, to, suffix = "") {

  cancelAnimationFrame(el._raf);

  const from = el._cur || 0;

  const t0 = performance.now(), dur = 400;

  (function step(t) {

    const p = Math.min((t - t0) / dur, 1);

    el._cur = Math.round(from + (to - from) * p);

    el.textContent = el._cur + suffix;

    if (p < 1) el._raf = requestAnimationFrame(step);

  })(t0);

}



// Petit "pop" sur une carte

function bump(el) {

  el.classList.remove("bump");

  void el.offsetWidth;

  el.classList.add("bump");

}



/* ===== ENTRÉE ===== */

const logoSub = $("logoSub");

const logoText = logoSub.textContent;

logoSub.textContent = "";

typeText($("introSub"), 60);



$("enter").onclick = () => {

  $("intro").classList.add("hide");

  logoSub.textContent = logoText;

  typeText(logoSub, 90);

};



/* ===== COMPTEUR DE LA ZONE DE TEXTE ===== */

$("list").addEventListener("input", () => {

  $("count").textContent = $("list").value.split(/[\s,;]+/).filter(Boolean).length;

});



/* ===== STATS ===== */

function resetStats() {

  st = { total: 0, alive: 0, dead: 0, pingSum: 0 };

  aliveList = [];

  rows = new Map();

  $("rows").innerHTML = "";

  $("barfill").style.width = "0";

  $("msg").textContent = "";

  render();

}



function render() {

  countTo($("sTotal"), st.total);

  countTo($("sAlive"), st.alive);

  countTo($("sDead"), st.dead);

  const sp = $("sSpeed");

  if (st.alive) {

    countTo(sp, Math.round(st.pingSum / st.alive), "ms");

  } else {

    cancelAnimationFrame(sp._raf);

    sp._cur = 0;

    sp.textContent = "--";

  }

  const done = st.alive + st.dead;

  $("barfill").style.width = (st.total ? (done / st.total) * 100 : 0) + "%";

}



function addRow(m) {

  const tr = document.createElement("div");

  tr.className = "tr " + (m.alive ? "ok" : "ko");

  const cells = [

    m.label,

    m.alive ? "● VIVANT" : "● MORT",

    m.alive ? m.ping + "ms" : (m.error || "erreur"),

    m.alive ? "…" : "--"

  ];

  cells.forEach(t => {

    const s = document.createElement("span");

    s.textContent = t;

    tr.appendChild(s);

  });

  $("rows").appendChild(tr);

  rows.set(m.id, tr);

}



function handle(m) {

  if (m.type === "start") {

    st.total = m.total;

    render();

  } else if (m.type === "result") {

    addRow(m);

    flash(m.alive ? "g" : "r");

    if (m.alive) {

      st.alive++;

      st.pingSum += m.ping;

      aliveList.push(m.copy);

      bump($("sAlive").parentElement);

    } else {

      st.dead++;

      bump($("sDead").parentElement);

    }

    render();

  } else if (m.type === "geo") {

    const tr = rows.get(m.id);

    if (tr) tr.children[3].textContent = m.country;

  } else if (m.type === "done") {

    $("msg").textContent = "Terminé : " + st.alive + " vivant(s), " + st.dead + " mort(s).";

  }

}



function setRunning(on) {

  $("go").disabled = on;

  $("stop").disabled = !on;

}



/* ===== LANCEMENT DU TEST ===== */

async function start() {

  if (!$("list").value.trim()) {

    $("msg").textContent = "Colle au moins un proxy.";

    return;

  }

  resetStats();

  setRunning(true);

  ctrl = new AbortController();

  try {

    const r = await fetch("/api/check", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      signal: ctrl.signal,

      body: JSON.stringify({

        list: $("list").value,

        protocol: $("proto").value,

        concurrency: Number($("conc").value),

        timeout: Number($("timeout").value) * 1000

      })

    });

    const reader = r.body.getReader();

    const dec = new TextDecoder();

    let buf = "";

    while (true) {

      const { value, done } = await reader.read();

      if (done) break;

      buf += dec.decode(value, { stream: true });

      let nl;

      while ((nl = buf.indexOf("\n")) >= 0) {

        const line = buf.slice(0, nl).trim();

        buf = buf.slice(nl + 1);

        if (line) handle(JSON.parse(line));

      }

    }

  } catch (e) {

    $("msg").textContent = e.name === "AbortError" ? "Test arrêté." : "Erreur : le serveur ne répond pas.";

  }

  setRunning(false);

}



$("go").onclick = start;

$("stop").onclick = () => { if (ctrl) ctrl.abort(); };

$("clear").onclick = resetStats;



$("copy").onclick = async () => {

  if (!aliveList.length) { $("msg").textContent = "Aucun proxy vivant à copier."; return; }

  const text = aliveList.join("\n");

  try {

    await navigator.clipboard.writeText(text);

  } catch {

    const t = document.createElement("textarea");

    t.value = text;

    document.body.appendChild(t);

    t.select();

    document.execCommand("copy");

    t.remove();

  }

  $("msg").textContent = aliveList.length + " proxy(s) vivant(s) copié(s).";

};



resetStats();


