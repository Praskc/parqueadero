// Verifica: 30 bahías en patio, no en calle. Mapa con viewBox original.
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
    const vb = mapa.getAttribute('viewBox');
    const bahiasText = [...mapa.querySelectorAll('text')].filter(t => /^E\\d\\d$/.test(t.textContent));
    const posiciones = bahiasText.map(t => {
      const tr = t.closest('g');
      const m = tr?.getAttribute('transform')?.match(/translate\\(([\\d.]+),\\s*([\\d.]+)\\)/);
      return m ? { id: t.textContent, x: Number(m[1]), y: Number(m[2]) } : null;
    }).filter(Boolean);
    const enPatio = posiciones.filter(p => p.x >= 240 && p.x <= 990 && p.y >= 42 && p.y <= 518).length;
    const enCalle = posiciones.filter(p => p.x < 240).length;
    const zonas = [...mapa.querySelectorAll('text')].filter(t => /ZONA [ABC]/.test(t.textContent)).map(t => t.textContent);
    const pasillos = [...mapa.querySelectorAll('rect')].filter(r => r.getAttribute('fill') === '#475569').length;
    const mapaRect = mapa.getBoundingClientRect();
    return JSON.stringify({ viewBox: vb, bahias: posiciones.length, enPatio, enCalle, zonas, pasillos, mapaPx: { w: Math.round(mapaRect.width), h: Math.round(mapaRect.height) },
      muestra: posiciones.slice(0, 5).map(p => p.id + ":(" + p.x + "," + p.y + ")") });
  })()`,
});
console.log(r.result.result.value);
ws.close();
process.exit(0);
