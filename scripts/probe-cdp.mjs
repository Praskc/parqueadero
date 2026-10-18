// Sonda de rendimiento por CDP: mide FPS reales, gaps de frame y long tasks
// en la página, en el navegador real (con GPU). Uso: node scripts/probe-cdp.mjs <url> [segundos]
const CDP = "http://127.0.0.1:9222";
const pageUrl = (process.argv[2] ?? "http://localhost:8000/").replace(/\/$/, "");
const DUR_S = Number(process.argv[3] ?? 10);

const targets = await (await fetch(`${CDP}/json`)).json();
const page = targets.find((t) => t.type === "page" && t.url.replace(/\/$/, "") === pageUrl)
  ?? targets.find((t) => t.type === "page");
if (!page) { console.error("No hay pestaña con", pageUrl); process.exit(1); }

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

// Instala la sonda en la página
await send("Runtime.evaluate", {
  expression: `(() => {
    if (!window.__probe) {
      window.__probe = { frames: [], longTasks: [] };
      const tick = (t) => { window.__probe.frames.push(t); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__probe.longTasks.push(Math.round(e.duration));
      }).observe({ entryTypes: ["longtask"] });
    }
    window.__probe.frames.length = 0;
    window.__probe.longTasks.length = 0;
    return "probe listo en " + location.href;
  })()`,
  returnByValue: true,
}).then((r) => console.log(r.result.result.value));

console.log(`midiendo ${DUR_S}s...`);
await new Promise((r) => setTimeout(r, DUR_S * 1000));

const res = await send("Runtime.evaluate", {
  expression: `(() => {
    const f = window.__probe.frames;
    if (f.length < 10) return JSON.stringify({ error: "pocos frames", n: f.length });
    const span = (f[f.length - 1] - f[0]) / 1000;
    const deltas = [];
    for (let i = 1; i < f.length; i++) deltas.push(f[i] - f[i - 1]);
    deltas.sort((a, b) => a - b);
    const pct = (p) => Math.round(deltas[Math.floor(deltas.length * p)] * 100) / 100;
    return JSON.stringify({
      url: location.href,
      fps: Math.round(f.length / span),
      spans: span.toFixed(1) + "s",
      frameP50ms: pct(0.5),
      frameP95ms: pct(0.95),
      frameP99ms: pct(0.99),
      frameMaxms: pct(0.999),
      longTasks: window.__probe.longTasks,
    }, null, 1);
  })()`,
  returnByValue: true,
});
console.log(res.result.result.value);
ws.close();
process.exit(0);
