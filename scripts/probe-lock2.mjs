// Confirma el mensaje de error con token incorrecto (limpia sesión primero).
const CDP = "http://127.0.0.1:9222";
const targets = await (await fetch(`${CDP}/json`)).json();
const page = targets.find((t) => t.type === "page" && t.url.startsWith("http://localhost:8000"));
if (!page) { console.error("sin pestaña"); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
await new Promise((r) => (ws.onopen = r));
await send("Runtime.enable");
await send("Page.enable");
await send("Page.bringToFront");
const evaluar = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  return r.result.result.value;
};

await evaluar("sessionStorage.clear(); 'limpio'");
await send("Page.reload", { ignoreCache: true });
await new Promise((r) => setTimeout(r, 2500));
await evaluar("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Consola de Vigilancia')).click(); 'ok'");
await new Promise((r) => setTimeout(r, 600));
await evaluar(`
  (() => {
    const inp = document.querySelector('#token-operador');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, 'otro-token-falso');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    return 'valor puesto';
  })()
`);
await new Promise((r) => setTimeout(r, 400));
await evaluar("document.querySelector('form button[type=submit]').click(); 'clic'");
await new Promise((r) => setTimeout(r, 2500));
console.log(await evaluar(`JSON.stringify({
  bloqueado: document.querySelector('#token-operador') !== null,
  mensajes: [...document.querySelectorAll('p')].map(p => p.textContent).filter(t => /token|invalid/i.test(t))
})`));
ws.close();
process.exit(0);
