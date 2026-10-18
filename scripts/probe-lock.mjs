// E2E de la pantalla de bloqueo de la consola:
// 1) abrir consola sin token -> candado, sin tabs
// 2) token malo -> error inline, sigue bloqueado
// 3) token bueno -> desbloquea y aparecen las tabs
const CDP = "http://127.0.0.1:9222";
const targets = await (await fetch(`${CDP}/json`)).json();
const page = targets.find((t) => t.type === "page" && t.url.startsWith("http://localhost:8000"));
if (!page) { console.error("sin pestaña"); process.exit(1); }

const tok = process.argv[2];
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
await send("Page.reload", { ignoreCache: true }); // sin sessionStorage: fresco
await new Promise((r) => setTimeout(r, 2500));

const evaluar = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  return r.result.result.value;
};

// 1) Abrir la consola
console.log("== 1) abrir consola sin token ==");
console.log(await evaluar(`
  [...document.querySelectorAll('button')].find(b => b.textContent.includes('Consola de Vigilancia')).click();
  'clic hecho'
`));
await new Promise((r) => setTimeout(r, 600));
console.log(await evaluar(`JSON.stringify({
  candado: document.querySelector('#token-operador') !== null,
  inputVisible: document.querySelector('#token-operador')?.offsetParent !== null,
  tabsVisibles: [...document.querySelectorAll('button')].some(b => b.textContent.includes('Gráficos y Analítica') && b.offsetParent !== null),
  botonesControl: [...document.querySelectorAll('button')].some(b => b.textContent.includes('INGRESO CALLE NORTE'))
})`));

// 2) Token malo
console.log("== 2) token incorrecto ==");
console.log(await evaluar(`
  (() => {
    const inp = document.querySelector('#token-operador');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, 'token-falso-123');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('form button[type=submit]').click();
    return 'enviado';
  })()
`));
await new Promise((r) => setTimeout(r, 1200));
console.log(await evaluar(`JSON.stringify({
  sigueBloqueado: document.querySelector('#token-operador') !== null,
  error: document.querySelector('p.text-red-600')?.textContent ?? '(sin error)'
})`));

// 3) Token bueno
console.log("== 3) token correcto ==");
console.log(await evaluar(`
  (() => {
    const inp = document.querySelector('#token-operador');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, '${tok}');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('form button[type=submit]').click();
    return 'enviado';
  })()
`));
await new Promise((r) => setTimeout(r, 1500));
console.log(await evaluar(`JSON.stringify({
  desbloqueado: document.querySelector('#token-operador') === null,
  tabsVisibles: [...document.querySelectorAll('button')].some(b => b.textContent.includes('Gráficos y Analítica') && b.offsetParent !== null),
  botonIngreso: [...document.querySelectorAll('button')].some(b => b.textContent.includes('INGRESO CALLE NORTE'))
})`));
ws.close();
process.exit(0);
