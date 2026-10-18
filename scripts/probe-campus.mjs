// Verifica el campus de 3 zonas: bahías separadas, vías pintadas, FAB flotante.
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
await new Promise((r) => setTimeout(r, 4000));

const r = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `JSON.stringify({
    bahias: [...document.querySelectorAll('svg text')].filter(t => /^E\\d\\d$/.test(t.textContent)).length,
    zonas: (document.body.textContent || '').match(/ZONA [ABC]/g)?.length ?? 0,
    viasPasillo: [...document.querySelectorAll('svg rect')].filter(r => r.getAttribute('fill') === '#475569').length,
    flechas: [...document.querySelectorAll('svg path')].filter(p => (p.getAttribute('fill') || '') === '#facc15').length,
    fabFlotante: !!document.querySelector('.fixed.bottom-6'),
    fabFijo: getComputedStyle(document.querySelector('[aria-label="Opciones de accesibilidad"]').closest('.fixed')).position,
    fabVisible: document.querySelector('[aria-label="Opciones de accesibilidad"]').offsetParent !== null,
    mapaAlto: document.querySelector('svg').getBoundingClientRect().height
  })`,
});
console.log(r.result.result.value);

// Prueba del FAB: click → panel → A+++ → verificar que escala
const r2 = await send("Runtime.evaluate", {
  returnByValue: true,
  awaitPromise: true,
  expression: `(async () => {
    document.querySelector('[aria-label="Opciones de accesibilidad"]').click();
    await new Promise(r => setTimeout(r, 500));
    const dialogo = document.querySelector('[role="dialog"]');
    const btnA200 = [...(dialogo?.querySelectorAll('button') ?? [])].find(b => b.textContent.trim() === 'A+++');
    btnA200?.click();
    await new Promise(r => setTimeout(r, 300));
    const escala = document.documentElement.style.fontSize;
    const restaurar = [...(dialogo?.querySelectorAll('button') ?? [])].find(b => b.textContent.includes('Restablecer'));
    restaurar?.click();
    return JSON.stringify({ escalaAl200: escala });
  })()`,
});
console.log("FAB accesibilidad:", r2.result.result.value);
ws.close();
process.exit(0);
