// Captura pasiva: conecta CDP a una pestaña y toma N screenshots a intervalo fijo.
// Uso: node scripts/shot-passive.mjs [url] [outDir] [nshots] [intervalMs]
const CDP = "http://127.0.0.1:9222";
const PAGE = (process.argv[2] ?? "http://localhost:8000/").replace(/\/$/, "");
const OUT = process.argv[3] ?? "scripts/out2";
const N = Number(process.argv[4] ?? 20);
const INTERVAL = Number(process.argv[5] ?? 250);
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
await send("Page.enable");

mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${OUT}/shot_${String(i).padStart(2, "0")}.png`, Buffer.from(shot.result.data, "base64"));
  const el = Date.now() - t0;
  await new Promise((r) => setTimeout(r, Math.max(0, (i + 1) * INTERVAL - el)));
}
console.log(`${N} shots en ${OUT}`);
ws.close();
process.exit(0);
