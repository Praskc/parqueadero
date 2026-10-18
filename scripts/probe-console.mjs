// Captura errores de consola y excepciones de la página por CDP durante N segundos.
// Uso: node scripts/probe-console.mjs [url] [segundos]
const CDP = "http://127.0.0.1:9222";
const PAGE = (process.argv[2] ?? "http://localhost:8000/").replace(/\/$/, "");
const DUR_S = Number(process.argv[3] ?? 15);

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
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === "Runtime.exceptionThrown") {
    console.log("EXCEPCIÓN:", JSON.stringify(m.params.exceptionDetails).slice(0, 800));
  }
  if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type)) {
    const txt = m.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
    console.log(`console.${m.params.type}:`, txt.slice(0, 500));
  }
  if (m.method === "Log.entryAdded") {
    const e = m.params.entry;
    if (["error", "warning"].includes(e.level)) console.log(`[${e.level}] ${e.text}`.slice(0, 300));
  }
};
await new Promise((r) => (ws.onopen = r));
await send("Runtime.enable");
await send("Log.enable");
console.log("escuchando consola/excepciones por", DUR_S, "s — dispara el evento ahora…");
await new Promise((r) => setTimeout(r, DUR_S * 1000));
console.log("fin de la escucha");
ws.close();
process.exit(0);
