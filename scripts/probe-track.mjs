// Rastrea TODOS los elementos de moto animada (transform por rAF) en el build
// actual: recarga la página con caché ignorada antes de instalar el rastreador.
// Uso: node scripts/probe-track.mjs [url] [segundosEscucha]
const CDP = "http://127.0.0.1:9222";
const PAGE = (process.argv[2] ?? "http://localhost:8000/").replace(/\/$/, "");
const LISTEN_S = Number(process.argv[3] ?? 12);

const targets = await (await fetch(`${CDP}/json`)).json();
const page = targets.find((t) => t.type === "page" && t.url.replace(/\/$/, "") === PAGE)
  ?? targets.find((t) => t.type === "page");
if (!page) { console.error("sin pestaña", PAGE); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
await new Promise((r) => (ws.onopen = r));
await send("Runtime.enable");
await send("Page.enable");
await send("Page.bringToFront");

// Recarga dura para garantizar el build vigente
await send("Page.reload", { ignoreCache: true });
await new Promise((r) => setTimeout(r, 3500));

await send("Runtime.evaluate", {
  expression: `
    window.__track = [];
    (function rec(){
      const motos = [...document.querySelectorAll('svg g[filter]')]
        .map(g => ({ label: (g.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 18),
                     tr: g.getAttribute('transform') }))
        .filter(m => /ASIGNADA|SALIENDO|ESPERANDO/.test(m.label))
        .map(m => m.label + ' @ ' + m.tr);
      const t = Math.round(performance.now());
      if (motos.length || window.__track.length) window.__track.push([t, ...motos]);
      if (window.__track.length < 20000) requestAnimationFrame(rec);
    })();
    'tracker-instalado';
  `,
});

console.log(`rastreador instalado; escuchando ${LISTEN_S}s…`);
await new Promise((r) => setTimeout(r, LISTEN_S * 1000));

const res = await send("Runtime.evaluate", {
  expression: `JSON.stringify(window.__track)`,
  returnByValue: true,
});
const track = JSON.parse(res.result.result.value);
const t0 = track.length ? track[0][0] : 0;
console.log(`muestras: ${track.length}`);
for (let i = 0; i < track.length; i += 8) {
  const [t, ...motos] = track[i];
  console.log(`${String(t - t0).padStart(5)}ms  ${motos.join("   |   ")}`);
}
if (track.length) {
  const last = track[track.length - 1];
  console.log(`${String(last[0] - t0).padStart(5)}ms  ${last.slice(1).join("   |   ")}  (último)`);
}
ws.close();
process.exit(0);
