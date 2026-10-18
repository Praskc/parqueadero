// Verifica el campus de 3 islas separadas con calles.
const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
const send = (m, p = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
await send("Runtime.enable"); await send("Page.enable"); await send("Page.bringToFront");
await send("Page.navigate", { url: `http://localhost:8000/?v=${Date.now()}` });
await new Promise((r) => setTimeout(r, 5000));
const r = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => {
    const mapa = [...document.querySelectorAll('svg')].find(s => s.getAttribute('viewBox')?.startsWith('0 0 1000'));
    if (!mapa) return JSON.stringify({ error: 'sin mapa' });
    const bahias = [...mapa.querySelectorAll('text')].filter(t => /^E\\d\\d$/.test(t.textContent));
    const posiciones = bahias.map(t => {
      const tr = t.closest('g');
      const m = tr?.getAttribute('transform')?.match(/translate\\(([\\d.]+),\\s*([\\d.]+)\\)/);
      return m ? { id: t.textContent, x: Number(m[1]), y: Number(m[2]) } : null;
    }).filter(Boolean);
    const enPatio = posiciones.filter(p => p.x >= 290 && p.x <= 950).length;
    const enCalle = posiciones.filter(p => p.x < 290).length;
    const islas = [...mapa.querySelectorAll('rect')].filter(r => r.getAttribute('fill') === '#334155' && r.getAttribute('rx') === '10');
    const calles = [...mapa.querySelectorAll('rect')].filter(r => r.getAttribute('fill') === '#475569');
    const campus = [...mapa.querySelectorAll('rect')].filter(r => r.getAttribute('fill') === '#94a3b8');
    const rotonda = mapa.querySelector('#rotonda-porteria') !== null;
    const zonas = [...mapa.querySelectorAll('text')].filter(t => /ZONA [ABC]/.test(t.textContent)).map(t => t.textContent);
    return JSON.stringify({
      bahias: posiciones.length, enIsla: enPatio, enCalle,
      islas: islas.length, calles: calles.length, campus: campus.length, rotonda,
      zonas, mapaPx: { w: Math.round(mapa.getBoundingClientRect().width), h: Math.round(mapa.getBoundingClientRect().height) },
      muestra: posiciones.slice(0, 3).map(p => p.id + ":(" + p.x + "," + p.y + ")")
    });
  })()`,
});
console.log(r.result.result.value);
ws.close();
process.exit(0);
