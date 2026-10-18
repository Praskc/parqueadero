// Lista las fuentes cargadas en el documento y qué cara renderiza el contador del kiosco.
const CDP = "http://127.0.0.1:9222";
const targets = await (await fetch(`${CDP}/json`)).json();
const page = targets.find((t) => t.type === "page" && t.url.startsWith("http://localhost:8000"));
if (!page) { console.error("sin pestaña"); process.exit(1); }

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

const res = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `JSON.stringify({
    caras: [...document.fonts].map(f => f.family + ' [' + f.weight + '] -> ' + f.status),
    bigNumFont: getComputedStyle(document.querySelector('.font-tech') ?? document.body).fontFamily
  })`,
});
console.log(res.result.result.value);
ws.close();
process.exit(0);
