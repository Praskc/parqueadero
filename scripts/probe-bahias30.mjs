// Verifica el mapa de 30 bahías segmentadas + accesibilidad fuera de cards.
const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = targets.find((t) => t.type === "page" && t.url.startsWith("http://localhost:8000"));
if (!page) { console.error("sin pestaña en :8000"); process.exit(1); }
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
await new Promise((r) => setTimeout(r, 4000));

const r = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `JSON.stringify({
    bahias: [...document.querySelectorAll('svg text')].filter(t => /^E\\d\\d$/.test(t.textContent)).length,
    separadores: [...document.querySelectorAll('svg line')].filter(l => l.getAttribute('stroke') === '#facc15' && Number(l.getAttribute('y1')) === 80).length,
    accesibilidadDentroDeCard: !!document.querySelector('header [aria-label="Opciones de accesibilidad"]'),
    accesibilidadEnPagina: !!document.querySelector('[aria-label="Opciones de accesibilidad"]'),
    pictogramaBanner: !!document.querySelector('[role="status"] svg'),
    h1Font: getComputedStyle(document.querySelector('h1')).fontFamily.split(',')[0],
    jergaSqlite: (document.body.textContent || '').includes('SQLite'),
    jergaBuffer: (document.body.textContent || '').includes('buffer'),
    pulsos: document.querySelectorAll('.animate-pulse, .animate-ping').length
  })`,
});
console.log(r.result.result.value);

// Prueba de la escala al 200%
const r2 = await send("Runtime.evaluate", {
  returnByValue: true,
  awaitPromise: true,
  expression: `(async () => {
    document.querySelector('[aria-label="Opciones de accesibilidad"]').click();
    await new Promise(r => setTimeout(r, 400));
    const dialogo = document.querySelector('[role="dialog"]');
    const btnA200 = [...(dialogo?.querySelectorAll('button') ?? [])].find(b => b.textContent.trim() === 'A+++');
    btnA200?.click();
    await new Promise(r => setTimeout(r, 300));
    const t = document.documentElement.style.fontSize;
    const restaurar = [...(dialogo?.querySelectorAll('button') ?? [])].find(b => b.textContent.includes('Restablecer'));
    restaurar?.click();
    return JSON.stringify({ escala200: t });
  })()`,
});
console.log("accesibilidad 200%:", r2.result.result.value);
ws.close();
process.exit(0);
