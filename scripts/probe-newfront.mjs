// Sonda del frontend adoptado desde origin/main.
// Uso: node scripts/probe-newfront.mjs [url]
const CDP = "http://127.0.0.1:9222";
const pageUrl = process.argv[2] ?? "http://localhost:5173/";

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
  if (m.method === "Runtime.exceptionThrown") {
    errores.push(m.params.exceptionDetails?.text ?? "exception");
  }
  if (m.method === "Log.entryAdded" && m.params.entry.level === "error") {
    errores.push(`${m.params.entry.source}: ${m.params.entry.text}`);
  }
};
await new Promise((r) => (ws.onopen = r));
await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");

const medir = async (ancho, alto, etiqueta, oscuro = false) => {
  await send("Emulation.setDeviceMetricsOverride", {
    width: ancho,
    height: alto,
    deviceScaleFactor: 1,
    mobile: ancho < 600,
  });
  await send("Page.navigate", { url: pageUrl });
  await new Promise((r) => setTimeout(r, 1800));
  if (oscuro) {
    const r = await send("Runtime.evaluate", {
      expression: `(() => { const b=[...document.querySelectorAll('button')].find(x=>/modo oscuro/i.test(x.getAttribute('aria-label')||'')); b?.click(); return !!b; })()`,
      returnByValue: true,
    });
    if (!r.result.result.value) errores.push("no se encontró el toggle de tema");
    await new Promise((r2) => setTimeout(r2, 500));
  }
  await new Promise((r) => setTimeout(r, 1200));
  const ev = await send("Runtime.evaluate", {
    expression: `(() => {
      const svg = [...document.querySelectorAll("svg")].find(s => (s.getAttribute("viewBox") ?? "").startsWith("0 0 1000"));
      const ids = new Set([...svg.querySelectorAll("text")].map(t => t.textContent).filter(t => /^E\\d{2}$/.test(t)));
      const recursos = performance.getEntriesByType("resource").map(r => r.name);
      const externos = recursos.filter(u => !u.startsWith(location.origin) && !u.startsWith("data:"));
      const body = getComputedStyle(document.body);
      const botones = [...document.querySelectorAll("button")].map(b => ({
        texto: (b.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 40),
        aria: b.getAttribute("aria-label"),
        title: b.getAttribute("title"),
        w: Math.round(b.getBoundingClientRect().width),
        h: Math.round(b.getBoundingClientRect().height),
      }));
      return {
        h1: document.querySelector("h1")?.textContent?.trim(),
        cupos: document.querySelector(".font-headline")?.textContent?.trim(),
        de: [...document.querySelectorAll("*")].map(e => e.textContent?.trim()).find(t => /^de \\d+$/.test(t || "")),
        bahias: [...ids].sort().join(","),
        total: ids.size,
        viewBox: svg?.getAttribute("viewBox"),
        rotulos: [...svg.querySelectorAll("text")].map(t => t.textContent.trim()).filter(t => /DISPONIBLE|OCUPADO|EN ESPERA|PARQUEADERO|CAMPUS/i.test(t)).slice(0, 12),
        temaHtml: document.documentElement.className,
        bodyBg: body.backgroundColor,
        bodyColor: body.color,
        fuentes: {
          barlowCondensed: document.fonts.check('700 24px "Barlow Condensed"'),
          inter: document.fonts.check('400 16px "Inter"'),
          jetbrains: document.fonts.check('400 16px "JetBrains Mono"'),
        },
        externos,
        botones,
        fab: !!document.querySelector('[aria-label="Opciones de accesibilidad"]'),
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        ancho: innerWidth,
        alto: innerHeight,
      };
    })()`,
    returnByValue: true,
  });
  const v = ev.result.result.value;
  console.log(`\n=== ${etiqueta} (${ancho}x${alto}${oscuro ? ", oscuro" : ", claro"}) ===`);
  console.log(JSON.stringify(v, null, 2));
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync("scripts/out-newfront", { recursive: true });
  writeFileSync(`scripts/out-newfront/${etiqueta}.png`, Buffer.from(shot.result.data, "base64"));
};

await send("Page.navigate", { url: pageUrl });
await new Promise((r) => setTimeout(r, 1200));
await send("Runtime.evaluate", { expression: "localStorage.clear(); true", returnByValue: true });

await medir(1440, 900, "escritorio-claro");
await medir(1440, 900, "escritorio-oscuro", true);
await medir(390, 844, "movil-claro");
await medir(390, 844, "movil-oscuro", true);

console.log("\n=== errores de consola ===");
console.log(errores.length ? errores.join("\n") : "ninguno");
ws.close();
