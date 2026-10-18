// Recarga dura y verifica las tres familias tras el rebuild.
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
await send("Page.enable");
await send("Page.bringToFront");
await send("Page.reload", { ignoreCache: true });
await new Promise((r) => setTimeout(r, 4000));

const res = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `JSON.stringify({
    reloj: getComputedStyle(document.querySelector('.font-mono')).fontFamily,
    jetCargada: document.fonts.check('16px "JetBrains Mono"'),
    archivoCargada: document.fonts.check('16px "Archivo Variable"'),
    chakraCargada: document.fonts.check('700 16px "Chakra Petch"')
  })`,
});
console.log(res.result.result.value);
ws.close();
process.exit(0);
