// Verificación del harness de prototipos: picker, mapa, cero jerga.
const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = targets.find((t) => t.type === "page" && t.url.includes("/prototypes"))
  ?? targets.find((t) => t.type === "page" && t.url.startsWith("http://localhost:5173"));
if (!page) { console.error("sin pestaña"); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
const send = (m, p = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
const r = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `JSON.stringify({
    url: location.pathname,
    picker: document.querySelector(".proto-picker") !== null,
    botones: [...document.querySelectorAll(".proto-picker-item")].map(b => b.textContent),
    mapaSvg: document.querySelector("svg") !== null,
    jergaMqtt: (document.body.textContent || "").includes("Telemetría MQTT"),
    jergaTelemetria: (document.body.textContent || "").includes("telemetría en"),
    titulo: document.querySelector("h1")?.textContent?.trim()
  })`,
});
console.log(r.result.result.value);
ws.close();
process.exit(0);
