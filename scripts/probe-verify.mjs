// Verificación post-build vía CDP: fuentes cargadas, componentes en el DOM, errores de consola.
const CDP = "http://127.0.0.1:9222";
const PAGE = "http://localhost:8000/";

const targets = await (await fetch(`${CDP}/json`)).json();
const page = targets.find((t) => t.type === "page" && t.url.startsWith(PAGE));
if (!page) { console.error("sin pestaña"); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
let errores = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === "Runtime.exceptionThrown") errores.push("EXCEPCION: " + (m.params.exceptionDetails.text ?? ""));
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errores.push("console.error: " + m.params.args.map(a => a.value ?? a.description ?? "").join(" ").slice(0, 200));
};
await new Promise((r) => (ws.onopen = r));
await send("Runtime.enable");
await send("Page.enable");
await send("Page.bringToFront");

// Escucha errores mientras se reproduce una maniobra
await new Promise((r) => setTimeout(r, 1500));

const res = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `JSON.stringify({
    archivo: document.fonts.check('16px "Archivo Variable"'),
    chakra: document.fonts.check('600 16px "Chakra Petch"'),
    jetbrains: document.fonts.check('16px "JetBrains Mono"'),
    bodyFont: getComputedStyle(document.body).fontFamily,
    motosEstacionadas: document.querySelectorAll('.moto-figura').length,
    baysOcupadas: [...document.querySelectorAll('svg text')].filter(t => /^E\\d\\d$/.test(t.textContent)).length
  })`,
});
console.log("== DOM ==");
console.log(res.result.result.value);
console.log("== errores de consola durante la maniobra ==");
console.log(errores.length ? errores.join("\n") : "ninguno");
ws.close();
process.exit(0);
