// Verificación del kiosco promovido (Sereno + Barlow + accesibilidad).
const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = targets.find((t) => t.type === "page" && t.url.startsWith("http://localhost"));
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
await send("Page.navigate", { url: "http://localhost:8000/" });
await new Promise((r) => setTimeout(r, 3500));
const r = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `JSON.stringify({
    bodyFont: getComputedStyle(document.body).fontFamily,
    barlowCargada: document.fonts.check('16px Barlow'),
    jergaMqtt: (document.body.textContent || '').includes('Telemetría MQTT'),
    jergaTelemetria: (document.body.textContent || '').includes('telemetría en'),
    botonAccesibilidad: !!document.querySelector('[aria-label="Opciones de accesibilidad"]'),
    cuposUnaVez: [...document.querySelectorAll('body *')].filter(el => /Cupos libres|Aforo completo/.test(el.textContent || '') && el.children.length === 0).length,
    tarjetasBahia: (document.body.textContent.match(/Ocupada\\n?/g) || []).length,
    planoSvg: !!document.querySelector('svg'),
    h1: document.querySelector('h1')?.textContent?.trim(),
    numeroGrande: !!document.querySelector('.font-tech')
  })`,
});
console.log(r.result.result.value);

// Escala de texto de accesibilidad: probar A+
const r2 = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(async () => {
    document.querySelector('[aria-label="Opciones de accesibilidad"]').click();
    await new Promise(r => setTimeout(r, 300));
    const btns = [...document.querySelectorAll('[role="dialog"] button')].filter(b => b.textContent.trim() === 'A+');
    btns[0]?.click();
    await new Promise(r => setTimeout(r, 300));
    return JSON.stringify({ rootFont: document.documentElement.style.fontSize });
  })()`,
});
console.log("accesibilidad:", r2.result.result.value);
ws.close();
process.exit(0);
