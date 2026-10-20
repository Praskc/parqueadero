// Reproduce una salida y registra el ángulo visual de la talanquera.
// Requiere ADMIN_TOKEN en el entorno. Uso: node scripts/probe-exit.mjs [url]
const token = process.env.ADMIN_TOKEN;
if (!token) {
  console.error("Define ADMIN_TOKEN para desbloquear la consola");
  process.exit(1);
}

const CDP = "http://127.0.0.1:9222";
const pageUrl = process.argv[2] ?? "http://localhost:5173/";
const accion = process.argv[3] ?? "SALIDA DE MOTO";
const targets = await (await fetch(`${CDP}/json`)).json();
const page = targets.find((t) => t.type === "page");
if (!page) {
  console.error("No hay pestaña CDP disponible");
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const errores = [];
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
  if (m.method === "Runtime.exceptionThrown") errores.push(m.params.exceptionDetails?.text ?? "exception");
};
await new Promise((r) => (ws.onopen = r));
await send("Page.enable");
await send("Runtime.enable");
const evalJs = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
  return r.result.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: pageUrl });
await sleep(1500);
await evalJs("localStorage.clear(); sessionStorage.clear(); true");
await send("Page.reload", { ignoreCache: true });
await sleep(2200);

// Abrir consola y desbloquear
await evalJs(`(() => { [...document.querySelectorAll('button')].find(b => /Vigilancia/.test(b.textContent))?.click(); return true; })()`);
await sleep(500);
await evalJs(`(() => {
  const inp = document.getElementById("token-operador");
  if (!inp) throw new Error("sin input de token");
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(inp, ${JSON.stringify(token)});
  inp.dispatchEvent(new Event("input", { bubbles: true }));
  document.querySelector("form")?.requestSubmit();
  return true;
})()`);
await sleep(1500);

const tabs = await evalJs(`(() => [...document.querySelectorAll("button")].map(b => b.textContent.trim()).filter(t => /Control de Portería/.test(t)))()`);
console.log("tabs:", tabs);
await evalJs(`(() => { [...document.querySelectorAll("button")].find(b => /Control de Portería/.test(b.textContent))?.click(); return true; })()`);
await sleep(500);

const botones = await evalJs(`(() => [...document.querySelectorAll("button")].map(b => b.textContent.trim().replace(/\\s+/g," ")).filter(Boolean))()`);
console.log("botones:", JSON.stringify(botones, null, 2));

const disparado = await evalJs(`(() => {
  const b = [...document.querySelectorAll("button")].find(x => x.textContent.includes(${JSON.stringify(accion)}));
  if (!b) return false;
  b.click();
  return true;
})()`);
console.log("disparado:", disparado);
if (!disparado) {
  console.log("errores:", errores);
  process.exit(1);
}

// Cerrar la consola para ver el plano y muestrear la talanquera
await evalJs(`(() => { [...document.querySelectorAll("button")].find(b => /Cerrar Consola/i.test(b.textContent))?.click(); return true; })()`);
await sleep(150);

const muestras = [];
const t0 = Date.now();
let capturadoAbierto = false;
for (let i = 0; i < 100; i++) {
  const v = await evalJs(`(() => {
    const g = document.querySelector("#talanquera-unisucre g");
    const motos = [...document.querySelectorAll("g[filter]")].map(x => x.getAttribute("transform"));
    return {
      attr: g?.getAttribute("transform") ?? null,
      computed: g ? getComputedStyle(g).transform : null,
      motos,
      estado: document.body.innerText.match(/Talanquera[^\\n]*\\n?([^\\n]*)/i)?.[0] ?? null,
    };
  })()`);
  muestras.push({ t: Date.now() - t0, ...v });
  if (!capturadoAbierto && /rotate\(90/.test(v.attr ?? "")) {
    capturadoAbierto = true;
    // Esperar a que termine la transición CSS antes de fotografiar el brazo.
    await sleep(700);
    const { writeFileSync, mkdirSync } = await import("node:fs");
    mkdirSync("scripts/out-newfront", { recursive: true });
    const prefijo = /SALIDA/i.test(accion) ? "exit" : "entry";
    const s = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`scripts/out-newfront/${prefijo}-abierta.png`, Buffer.from(s.result.data, "base64"));
  }
  await sleep(50);
}

// Imprimir solo cambios del atributo o del matrix
let anterior = "";
for (const m of muestras) {
  const clave = `${m.attr}|${m.computed}`;
  if (clave !== anterior) {
    console.log(`${String(m.t).padStart(5)}ms  attr=${m.attr}  matrix=${m.computed}`);
    anterior = clave;
  }
}

const { writeFileSync, mkdirSync } = await import("node:fs");
mkdirSync("scripts/out-newfront", { recursive: true });
const shot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("scripts/out-newfront/exit-talanquera.png", Buffer.from(shot.result.data, "base64"));
console.log("errores:", errores.length ? errores : "ninguno");
ws.close();
