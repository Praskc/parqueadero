// Sonda de verificación del revert a 10 puestos: cuenta bahías, valida tema
// claro Sereno y captura pantalla. Uso: node scripts/probe-revert.mjs [url]
const CDP = "http://127.0.0.1:9222";
const pageUrl = (process.argv[2] ?? "http://localhost:8000/").replace(/\/$/, "");

const targets = await (await fetch(`${CDP}/json`)).json();
const page = targets.find((t) => t.type === "page");
if (!page) { console.error("No hay pestaña CDP disponible"); process.exit(1); }

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
await send("Runtime.enable");

await send("Page.navigate", { url: pageUrl });
await new Promise((r) => setTimeout(r, 3500));

const ev = await send("Runtime.evaluate", {
  expression: `(() => {
    const svg = [...document.querySelectorAll("svg")].find(s => (s.getAttribute("viewBox") ?? "").startsWith("0 0 1000"));
    const ids = new Set([...svg.querySelectorAll("text")].map(t => t.textContent)
      .filter(t => /^E\\d{2}$/.test(t)));
    const cont = svg?.parentElement;
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    return {
      bahias: [...ids].sort().join(","),
      total: ids.size,
      viewBox: svg?.getAttribute("viewBox"),
      contClase: cont?.className,
      bodyBg,
      titulo: document.querySelector("h1")?.textContent?.trim(),
      cupos: document.querySelector(".font-tech")?.textContent?.trim(),
      de: [...document.querySelectorAll(".font-mono")].map(e => e.textContent).find(t => /de \\d+/.test(t)),
      letrero: [...svg.querySelectorAll("text")].some(t => t.textContent.includes("PARQUEADERO")),
      pictograma: !!document.querySelector('[role="status"] svg'),
      fumesJerga: [...document.querySelectorAll("*")].some(e => /telemetr|MQTT|SQLite|QoS/.test(e.childNodes?.[0]?.textContent ?? "")),
      fab: !!document.querySelector('[aria-label="Opciones de accesibilidad"]'),
    };
  })()`,
  returnByValue: true,
});
console.log(JSON.stringify(ev.result.result.value, null, 2));

const shot = await send("Page.captureScreenshot", { format: "png" });
const { writeFileSync } = await import("node:fs");
writeFileSync("scripts/out-revert/kiosco.png", Buffer.from(shot.result.data, "base64"));
console.log("captura: scripts/out-revert/kiosco.png");
ws.close();
