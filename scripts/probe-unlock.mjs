// Requiere ADMIN_TOKEN en el entorno; no se guarda ninguna clave en el repo.
const token = process.env.ADMIN_TOKEN;
if (!token) {
  console.error("Define ADMIN_TOKEN para probar el desbloqueo");
  process.exit(1);
}

const CDP = "http://127.0.0.1:9222";
const targets = await (await fetch(`${CDP}/json`)).json();
const page = targets.find((t) => t.type === "page");
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
  return r.result.result.value;
};
const shot = async (name) => {
  const s = await send("Page.captureScreenshot", { format: "png" });
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync("scripts/out-newfront", { recursive: true });
  writeFileSync(`scripts/out-newfront/${name}.png`, Buffer.from(s.result.data, "base64"));
};

await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "http://localhost:5173/" });
await new Promise((r) => setTimeout(r, 1500));
await evalJs("localStorage.setItem('accesibilidad:escala','100'); localStorage.setItem('accesibilidad:contraste','0'); sessionStorage.clear(); true");
await send("Page.reload", { ignoreCache: true });
await new Promise((r) => setTimeout(r, 2200));

await evalJs(`(() => { [...document.querySelectorAll('button')].find(b => /Vigilancia/.test(b.textContent))?.click(); return true; })()`);
await new Promise((r) => setTimeout(r, 600));
const llenado = await evalJs(`(() => {
  const inp = document.getElementById("token-operador");
  if (!inp) return "sin input";
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(inp, ${JSON.stringify(token)});
  inp.dispatchEvent(new Event("input", { bubbles: true }));
  return "(definido)";
})()`);
console.log("input:", llenado);
await new Promise((r) => setTimeout(r, 200));
await evalJs(`(() => { document.querySelector('form')?.requestSubmit(); return true; })()`);
await new Promise((r) => setTimeout(r, 1500));

const estado = await evalJs(`(() => {
  const tabs = [...document.querySelectorAll("button")].map(b => b.textContent.trim().replace(/\\s+/g," ")).filter(t => /Gráficos|Control|Sensores|Libro/.test(t));
  return {
    desbloqueado: !document.getElementById("token-operador"),
    tabs,
    tokenSesion: !!sessionStorage.getItem("token"),
    tokenLocal: !!localStorage.getItem("token"),
    texto: document.querySelector('[role="dialog"]')?.innerText?.slice(0, 400),
  };
})()`);
console.log(JSON.stringify(estado, null, 2));
await shot("operador-desbloqueado");

// abrir control de portería
await evalJs(`(() => { [...document.querySelectorAll("button")].find(b => /Control de Portería/.test(b.textContent))?.click(); return true; })()`);
await new Promise((r) => setTimeout(r, 500));
const control = await evalJs(`(() => {
  const btns = [...document.querySelectorAll("button")].map(b => b.textContent.trim().replace(/\\s+/g," ")).filter(Boolean);
  return { botones: btns.slice(0, 40) };
})()`);
console.log("=== control ===");
console.log(JSON.stringify(control, null, 2));
await shot("operador-control");
console.log("errores:", errores.length ? errores : "ninguno");
ws.close();
