// Navega fresco y mide el mapa vertical.
const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
const send = (m, p = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
await send("Runtime.enable"); await send("Page.enable"); await send("Page.bringToFront");
await send("Page.navigate", { url: `http://localhost:8000/?fresh=${Date.now()}` });
await new Promise((r) => setTimeout(r, 5000));
const r = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `JSON.stringify({
    svg: document.querySelector('svg')?.getBoundingClientRect(),
    bahias: [...document.querySelectorAll('svg text')].filter(t => /^E\\d\\d$/.test(t.textContent)).length,
    zonas: (document.body.textContent || '').match(/ZONA [ABC]/g)?.length ?? 0,
    fabPos: getComputedStyle(document.querySelector('[aria-label="Opciones de accesibilidad"]').closest('.fixed')).position
  })`,
});
console.log(r.result.result.value);
ws.close();
process.exit(0);
