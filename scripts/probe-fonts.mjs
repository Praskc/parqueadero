// Diagnóstico de fuentes en la pestaña viva + recarga dura.
const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = targets.find((t) => t.type === "page" && t.url.startsWith("http://localhost:8000"));
if (!page) { console.error("sin pestaña"); process.exit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
const send = (m, p = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
await send("Runtime.enable");
await send("Page.enable");
await send("Page.bringToFront");
await send("Page.reload", { ignoreCache: true });
await new Promise((r) => setTimeout(r, 6000));

const r = await send("Runtime.evaluate", {
  returnByValue: true,
  awaitPromise: true,
  expression: `(async () => {
    // ¿El documento tiene reglas @font-face de Barlow?
    let reglasBarlow = 0, reglasTotal = 0;
    for (const hoja of document.styleSheets) {
      try { for (const regla of hoja.cssRules) { reglasTotal++; if (regla instanceof CSSFontFaceRule && regla.style.getPropertyValue('font-family').includes('Barlow')) reglasBarlow++; } } catch {}
    }
    await document.fonts.load('16px Barlow');
    await document.fonts.ready;
    const caras = [...document.fonts].map(f => f.family + ' [' + f.weight + '] ' + f.status);
    return JSON.stringify({
      reglasBarlow, reglasTotal,
      check: document.fonts.check('16px Barlow'),
      barlowCargadas: caras.filter(c => c.startsWith('Barlow') && c.endsWith('loaded')).length,
      muestra: caras.filter(c => c.startsWith('Barlow')).slice(0, 3),
      bodyFont: getComputedStyle(document.body).fontFamily,
      tituloFont: getComputedStyle(document.querySelector('h1')).fontFamily
    });
  })()`,
});
console.log(r.result.result.value);
ws.close();
process.exit(0);
