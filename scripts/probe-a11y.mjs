const CDP = "http://127.0.0.1:9222";
const targets = await (await fetch(`${CDP}/json`)).json();
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
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

await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "http://localhost:5173/" });
await new Promise((r) => setTimeout(r, 1200));
await evalJs("localStorage.clear(); true");
await send("Page.navigate", { url: "http://localhost:5173/" });
await new Promise((r) => setTimeout(r, 2500));

// oscuro + alto contraste
await evalJs(`(() => { [...document.querySelectorAll('button')].find(b => /modo oscuro/i.test(b.getAttribute('aria-label')||''))?.click(); return true; })()`);
await new Promise((r) => setTimeout(r, 400));
await evalJs(`(() => { document.querySelector('[aria-label="Opciones de accesibilidad"]')?.click(); return true; })()`);
await new Promise((r) => setTimeout(r, 400));
await evalJs(`(() => { document.querySelector('[role="switch"][aria-label="Alto contraste"]')?.click(); return true; })()`);
await new Promise((r) => setTimeout(r, 600));
const estado = await evalJs(`(() => {
  const body = getComputedStyle(document.body);
  const h1 = document.querySelector("h1");
  const panel = document.querySelector('[role="dialog"][aria-label="Accesibilidad"]');
  return {
    clases: document.documentElement.className,
    bodyBg: body.backgroundColor,
    bodyColor: body.color,
    h1Color: getComputedStyle(h1).color,
    h1Bg: getComputedStyle(h1.parentElement).backgroundColor,
    panelBg: panel ? getComputedStyle(panel).backgroundColor : null,
    panelColor: panel ? getComputedStyle(panel).color : null,
    escala: document.documentElement.style.fontSize || "16px (sin override)",
  };
})()`);
console.log("=== oscuro + alto contraste ===");
console.log(JSON.stringify(estado, null, 2));
await shot("oscuro-alto-contraste");

// volver a claro y probar escala 200%
await evalJs(`(() => { document.querySelector('[role="switch"][aria-label="Alto contraste"]')?.click(); document.querySelector('[aria-label="Opciones de accesibilidad"]')?.click(); [...document.querySelectorAll('button')].find(b => /modo claro/i.test(b.getAttribute('aria-label')||''))?.click(); return true; })()`);
await new Promise((r) => setTimeout(r, 500));
await evalJs(`(() => { document.querySelector('[aria-label="Opciones de accesibilidad"]')?.click(); return true; })()`);
await new Promise((r) => setTimeout(r, 300));
await evalJs(`(() => { const b=[...document.querySelectorAll('button')].find(x => x.textContent.trim() === "A+++"); b?.click(); return b?.textContent; })()`);
await new Promise((r) => setTimeout(r, 600));
const escala = await evalJs(`(() => {
  const h1 = document.querySelector("h1");
  const sub = document.querySelector("header p");
  const cupo = [...document.querySelectorAll("div")].find(d => /^de \\d+$/.test(d.textContent.trim()));
  return {
    htmlFontSize: getComputedStyle(document.documentElement).fontSize,
    h1: getComputedStyle(h1).fontSize,
    sub: sub ? getComputedStyle(sub).fontSize : null,
    cupo: cupo ? getComputedStyle(cupo).fontSize : null,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  };
})()`);
console.log("=== escala 200% ===");
console.log(JSON.stringify(escala, null, 2));
await shot("escala-200");

// persistencia tras recarga
await send("Page.navigate", { url: "http://localhost:5173/" });
await new Promise((r) => setTimeout(r, 2000));
const persistencia = await evalJs(`(() => ({
  htmlFontSize: getComputedStyle(document.documentElement).fontSize,
  escalaGuardada: localStorage.getItem("accesibilidad:escala"),
  contraste: localStorage.getItem("accesibilidad:contraste"),
  tema: localStorage.getItem("parq_tema_preferido"),
}))()`);
console.log("=== persistencia tras recarga ===");
console.log(JSON.stringify(persistencia, null, 2));
ws.close();
