// Re-verificación: fuentes cargadas + accesibilidad con awaitPromise.
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

const r1 = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `JSON.stringify({
    barlow: [...document.fonts].filter(f => f.family === 'Barlow').map(f => f.family + ' [' + f.weight + '] ' + f.status).slice(0, 5),
    check: document.fonts.check('16px Barlow')
  })`,
});
console.log("fuentes:", r1.result.result.value);

const r2 = await send("Runtime.evaluate", {
  returnByValue: true,
  awaitPromise: true,
  expression: `(async () => {
    document.querySelector('[aria-label="Opciones de accesibilidad"]').click();
    await new Promise(r => setTimeout(r, 400));
    const dialogo = document.querySelector('[role="dialog"]');
    const btnA = [...(dialogo?.querySelectorAll('button') ?? [])].find(b => b.textContent.trim() === 'A+');
    const btnContraste = [...(dialogo?.querySelectorAll('[role="switch"]') ?? [])][0];
    btnA?.click();
    btnContraste?.click();
    await new Promise(r => setTimeout(r, 400));
    const tamanio = document.documentElement.style.fontSize;
    const contraste = document.documentElement.classList.contains('alto-contraste');
    const persistido = localStorage.getItem('accesibilidad:escala');
    const restaurar = [...(dialogo?.querySelectorAll('button') ?? [])].find(b => b.textContent.includes('Restablecer'));
    restaurar?.click();
    await new Promise(r => setTimeout(r, 300));
    const restaurado = document.documentElement.style.fontSize === '' && !document.documentElement.classList.contains('alto-contraste');
    return JSON.stringify({ tamanio, contraste, persistido, restaurado });
  })()`,
});
console.log("accesibilidad:", r2.result.result.value);
ws.close();
process.exit(0);
