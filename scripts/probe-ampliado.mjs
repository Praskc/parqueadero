// Verifica el mapa expandido 1200×560 con estamentos y calles conectadas.
const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
const send = (m, p = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
await send("Runtime.enable"); await send("Page.enable"); await send("Page.bringToFront");
await send("Page.navigate", { url: "http://localhost:8000/?v=" + Date.now() });
await new Promise((r) => setTimeout(r, 5000));
const r = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => {
    const svgs = [...document.querySelectorAll('svg')];
    const mapa = svgs.find(s => s.getAttribute('viewBox')?.startsWith('0 0 1200')) || svgs.find(s => s.getAttribute('viewBox')?.startsWith('0 0 1000'));
    if (!mapa) return JSON.stringify({ error: 'sin mapa', svgCount: svgs.length, viewBoxes: svgs.map(s => s.getAttribute('viewBox')) });
    const vb = mapa.getAttribute('viewBox');
    const labels = [...mapa.querySelectorAll('text')].map(t => t.textContent.trim());
    const bahias = labels.filter(l => /^E\\d\\d$/.test(l));
    const posiciones = [...mapa.querySelectorAll('g')].filter(g => g.getAttribute('transform')?.startsWith('translate')).map(g => {
      const m = g.getAttribute('transform').match(/translate\\(([\\d.]+),\\s*([\\d.]+)\\)/);
      return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
    }).filter(p => p && p.x > 300);
    const islas = [...mapa.querySelectorAll('rect')].filter(r => r.getAttribute('fill') === '#334155' && Number(r.getAttribute('rx')) === 14);
    const calles = [...mapa.querySelectorAll('rect')].filter(r => r.getAttribute('fill') === '#475569');
    const rotonda = mapa.querySelector('#rotonda-porteria') !== null;
    const salida = mapa.querySelector('#senal-salida-colombia') !== null;
    const estamentos = labels.filter(l => /ESTUDIANTES|DOCENTES|ADMINISTRATIVOS/.test(l));
    const cupos = labels.filter(l => /cupos/.test(l));
    const mapaRect = mapa.getBoundingClientRect();
    const gapEntreBahias = posiciones.length > 1 ? Math.round(posiciones[1].x - posiciones[0].x) : 0;
    return JSON.stringify({ viewBox: vb, bahias: bahias.length, islas: islas.length, calles: calles.length,
      rotonda, salida, estamentos, cupos,
      gapEntreBahias,
      mapaPx: { w: Math.round(mapaRect.width), h: Math.round(mapaRect.height) },
      islaAncho: islas[0]?.getAttribute('width') });
  })()`,
});
console.log(r.result.result.value);
ws.close();
process.exit(0);
