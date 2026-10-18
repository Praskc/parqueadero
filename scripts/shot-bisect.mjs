// Captura screenshots (	CDP Page.captureScreenshot) durante un ingreso real por UI.
// Uso: node scripts/shot-bisect.mjs <token> [url] [outDir]
const CDP = "http://127.0.0.1:9222";
const TOKEN = process.argv[2];
const PAGE = (process.argv[3] ?? "http://localhost:8000/").replace(/\/$/, "");
const OUT = process.argv[4] ?? "scripts/out";
import { mkdirSync, writeFileSync } from "node:fs";

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

const evaljs = (expr) =>
  send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })
    .then((r) => r.result?.result?.value);

// Semilla del token antes de abrir la consola (evita el prompt bloqueante)
console.log("seed token:", await evaljs(`sessionStorage.setItem("token", ${JSON.stringify(TOKEN)}); "ok"`));

const clickByText = (txt) => evaljs(`(() => {
  const el = [...document.querySelectorAll("button")].find((b) => b.textContent.includes(${JSON.stringify(txt)}));
  if (el) { el.click(); return true; }
  return false;
})()`);

console.log("abrir consola:", await clickByText("Consola de Vigilancia"));
await new Promise((r) => setTimeout(r, 900));
console.log("click INGRESO CALLE NORTE:", await clickByText("INGRESO CALLE NORTE"));

mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
for (let i = 0; i < 22; i++) {
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${OUT}/shot_${String(i).padStart(2, "0")}.png`, Buffer.from(shot.result.data, "base64"));
  const el = Date.now() - t0;
  const wait = Math.max(0, (i + 1) * 250 - el);
  await new Promise((r) => setTimeout(r, wait));
}
console.log("22 shots capturados en", OUT);
ws.close();
process.exit(0);
