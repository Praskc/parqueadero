// Verifica estamentos, salida y rotunda.
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
await new Promise((r) => setTimeout(r, 4500));
const r = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => {
    const mapa = [...document.querySelectorAll('svg')].find(s => s.getAttribute('viewBox')?.startsWith('0 0 1000'));
    const labels = [...(mapa?.querySelectorAll('text') ?? [])].map(t => t.textContent.trim()).filter(t => t.length > 0);
    const salida = mapa?.querySelector('#senal-salida-colombia');
    const salidaTr = salida?.closest('g')?.getAttribute('transform') || salida?.getAttribute('transform');
    const rotonda = mapa?.querySelector('#rotonda-porteria') !== null;
    const salidaEnCalle = salidaTr?.includes('196');
    return JSON.stringify({
      estamentos: labels.filter(l => /ESTUDIANTES|DOCENTES|ADMINISTRATIVOS/.test(l)),
      cupos: labels.filter(l => /cupos/.test(l)),
      salidaTransform: salidaTr,
      salidaEnCalle,
      rotonda
    });
  })()`,
});
console.log(r.result.result.value);
ws.close();
process.exit(0);
