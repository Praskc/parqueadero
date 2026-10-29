// Sonda de seguridad del backend: cabeceras, inyeccion SQL, autenticacion y
// aislamiento del WebSocket. No imprime secretos.
//
//   node scripts/security-check.mjs [http://127.0.0.1:8000]
//
// Sale con codigo 1 si algo falla, para poder usarla en CI.

import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const base = process.argv[2] ?? "http://127.0.0.1:8000";
const url = new URL(base);
let fallos = 0;
let pruebas = 0;

const ok = (nombre, condicion, detalle = "") => {
  pruebas++;
  if (!condicion) fallos++;
  const marca = condicion ? "OK  " : "FALLO";
  console.log(`  [${marca}] ${nombre}${detalle ? ` -> ${detalle}` : ""}`);
};

// Token del operador: se lee del .env y nunca se muestra.
function tokenAdmin() {
  for (const ruta of ["apps/server/.env", ".env"]) {
    if (!existsSync(ruta)) continue;
    const m = readFileSync(ruta, "utf8").match(/^ADMIN_TOKEN=(.*)$/m);
    if (m) return m[1].trim();
  }
  return "";
}

const TOKEN = tokenAdmin();

async function pedir(metodo, ruta, cabeceras = {}, cuerpo = null) {
  const r = await fetch(`${url.origin}${ruta}`, {
    method: metodo,
    headers: { ...cabeceras, ...(cuerpo ? { "content-type": "application/json" } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : null,
  });
  const texto = await r.text();
  return { status: r.status, headers: r.headers, texto };
}

// --------------------------------------------------------------- cabeceras
console.log("\n== Cabeceras de seguridad");
{
  const r = await pedir("GET", "/");
  const esperadas = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "no-referrer",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-embedder-policy": "require-corp",
    "cross-origin-resource-policy": "same-origin",
  };
  for (const [k, v] of Object.entries(esperadas))
    ok(`${k}: ${v}`, r.headers.get(k) === v, r.headers.get(k) ?? "ausente");
  const csp = r.headers.get("content-security-policy") ?? "";
  ok("CSP con default-src 'self'", csp.includes("default-src 'self'"), csp.slice(0, 60));
  ok("CSP con frame-ancestors 'none'", csp.includes("frame-ancestors 'none'"));
  ok("Permissions-Policy restrictiva", (r.headers.get("permissions-policy") ?? "").includes("camera=()"));
}

// ----------------------------------------------------------- inyeccion SQL
console.log("\n== Inyeccion SQL (parametrizacion en la frontera)");
const payloads = [
  "E01' OR '1'='1",
  "E01'; DROP TABLE espacios;--",
  "E01' UNION SELECT * FROM espacios--",
  "E01;--",
  "../../etc/passwd",
];
for (const p of payloads) {
  const r = await pedir("POST", `/api/espacios/${encodeURIComponent(p)}`, { "x-admin-token": TOKEN }, { estado: "LIBRE" });
  ok(`POST id="${p.slice(0, 28)}" rechazado`, r.status === 400, `HTTP ${r.status}`);
}
for (const estado of ["LIBRE' OR '1'='1", "LIBRE'; DROP TABLE espacios;--", "LIBRE' UNION SELECT 1--"]) {
  const r = await pedir("POST", "/api/espacios/E01", { "x-admin-token": TOKEN }, { estado });
  ok(`POST estado="${estado.slice(0, 28)}" rechazado`, r.status === 400, `HTTP ${r.status}`);
}
{
  const r = await pedir("POST", "/api/espacios/E01", { "x-admin-token": TOKEN }, { estado: "LIBRE", nodo: "x'; DROP TABLE espacios;--" });
  ok("POST nodo con payload rechazado", r.status === 400, `HTTP ${r.status}`);
  const h = await pedir("GET", "/api/historial/E01'%20OR%20'1'='1", { "x-admin-token": TOKEN });
  ok("GET historial con payload devuelve lista vacia", h.status === 200 && h.texto.trim() === "[]", `HTTP ${h.status}`);
}

// ---------------------------------------------------------- autenticacion
console.log("\n== Autenticacion y control de acceso");
{
  const sin = await pedir("GET", "/api/sesion");
  ok("GET /api/sesion sin token -> 401", sin.status === 401, `HTTP ${sin.status}`);
  const mal = await pedir("GET", "/api/sesion", { "x-admin-token": "corto" });
  ok("GET /api/sesion con token corto -> 401", mal.status === 401, `HTTP ${mal.status}`);
  const post = await pedir("POST", "/api/espacios/E01", {}, { estado: "LIBRE" });
  ok("POST /api/espacios sin token -> 401", post.status === 401, `HTTP ${post.status}`);
  const hist = await pedir("GET", "/api/historial/E01");
  ok("GET /api/historial sin token -> 401", hist.status === 401, `HTTP ${hist.status}`);
  const histOk = await pedir("GET", "/api/historial/E01", { "x-admin-token": TOKEN });
  ok("GET /api/historial con token -> 200", histOk.status === 200, `HTTP ${histOk.status}`);
  const ana = await pedir("GET", "/api/analitica/hoy");
  ok("GET /api/analitica/hoy sin token -> 401", ana.status === 401, `HTTP ${ana.status}`);
  const anaOk = await pedir("GET", "/api/analitica/hoy", { "x-admin-token": TOKEN });
  ok("GET /api/analitica/hoy con token -> 200", anaOk.status === 200, `HTTP ${anaOk.status}`);
  const estado = await pedir("GET", "/api/estado");
  ok("GET /api/estado es publico -> 200", estado.status === 200, `HTTP ${estado.status}`);
}

// -------------------------------------------------- aislamiento del WebSocket
console.log("\n== Aislamiento del WebSocket (origen cruzado)");
await new Promise((resolve) => {
  const req = http.request({
    hostname: url.hostname,
    port: url.port || 80,
    path: "/ws",
    headers: {
      Connection: "Upgrade",
      Upgrade: "websocket",
      "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
      "Sec-WebSocket-Version": "13",
      Origin: "http://evil.example",
    },
  });
  req.on("response", (res) => {
    ok("handshake con Origin ajeno -> 403", res.statusCode === 403, `HTTP ${res.statusCode}`);
    res.resume();
    resolve();
  });
  req.on("upgrade", (_res, socket) => {
    ok("handshake con Origin ajeno -> 403", false, "acepto el upgrade (101)");
    socket.destroy();
    resolve();
  });
  req.on("error", () => resolve());
  req.end();
});

// --------------------------------------------------------- integridad final
console.log("\n== Integridad de la base tras las pruebas");
{
  const r = await pedir("GET", "/api/estado");
  let n = 0;
  try {
    n = JSON.parse(r.texto).espacios.length;
  } catch {}
  ok("snapshot con las 30 plazas", n === 30, `${n} plazas`);
}

// ---------------------------------------------------------- MQTT anonimo
console.log("\n== Broker: acceso anonimo");
{
  const exe = ["mosquitto_pub", "C:\\Program Files\\Mosquitto\\mosquitto_pub.exe"].find((c) =>
    c.includes("\\") ? existsSync(c) : true);
  if (!exe) {
    console.log("  [AVISO] mosquitto_pub no encontrado; se omite la prueba");
  } else {
    await new Promise((resolve) => {
      const p = spawn(exe, ["-p", "1883", "-t", "parq/lote1/backend/comandos/healthcheck", "-m", "anonimo"], {
        stdio: "ignore",
      });
      p.on("close", (code) => {
        ok("publicar sin credenciales falla", code !== 0, `codigo ${code}`);
        resolve();
      });
      p.on("error", () => resolve());
    });
  }
}

console.log(`\n${fallos === 0 ? "TODO OK" : "FALLOS DETECTADOS"}: ${pruebas - fallos}/${pruebas} pruebas correctas`);
process.exit(fallos === 0 ? 0 : 1);
