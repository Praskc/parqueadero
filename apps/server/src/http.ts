import Fastify from "fastify";
import websocket from "@fastify/websocket";
import fstatic from "@fastify/static";
import { createHash, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { EstadoSchema, type Estado, type Snapshot } from "@parq/shared";
import { config } from "./config.ts";
import type { Sock } from "./realtime.ts";

export interface HttpDeps {
  snapshot: () => Snapshot;
  historial: (espacio: string) => unknown;
  eventosHoy: () => unknown;
  publicarEstado: (espacio: string, estado: Estado, nodo?: string) => void;
  onConexion: (sock: Sock) => void;
}

/** Comparación del token en tiempo constante (evita oráculo de timing). */
function tokenValido(recibido: unknown): boolean {
  if (typeof recibido !== "string") return false;
  const a = createHash("sha256").update(recibido).digest();
  const b = createHash("sha256").update(config.token).digest();
  return timingSafeEqual(a, b);
}

/** Origen del WS: se acepta sin Origin (clientes no-navegador) o el mismo host. */
function origenPermitido(origin: unknown, host: unknown): boolean {
  if (typeof origin !== "string") return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Limitador simple en memoria para el endpoint admin (anti-fuerza bruta / abuso). */
const intentosPorIp = new Map<string, { n: number; reinicio: number }>();
const LIMITE_POR_MINUTO = 120;

/** La verificación de sesión es un endpoint de autenticación: límite estricto. */
const intentosSesion = new Map<string, { n: number; reinicio: number }>();
const LIMITE_SESION_POR_MINUTO = 10;

function excede(map: Map<string, { n: number; reinicio: number }>, ip: string, limite: number): boolean {
  const rec = map.get(ip) ?? { n: 0, reinicio: Date.now() };
  if (Date.now() - rec.reinicio > 60_000) { rec.n = 0; rec.reinicio = Date.now(); }
  rec.n++;
  map.set(ip, rec);
  return rec.n > limite;
}

export async function buildApp(deps: HttpDeps) {
  const app = Fastify({ logger: true });
  await app.register(websocket);

  // Cabeceras de seguridad en todas las respuestas
  app.addHook("onSend", async (_req, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("Content-Security-Policy",
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'");
  });

  // En producción sirve el build de la web; en dev la sirve Vite (con proxy).
  const dist = path.join(import.meta.dirname, "../../web/dist");
  if (existsSync(dist)) await app.register(fstatic, { root: dist });

  app.get("/api/estado", () => deps.snapshot());

  /** Verificación del token de operador (cierra el circuito de la pantalla de bloqueo). */
  app.get("/api/sesion", (req, reply) => {
    if (excede(intentosSesion, req.ip, LIMITE_SESION_POR_MINUTO))
      return reply.code(429).send({ error: "demasiados intentos" });
    if (!tokenValido(req.headers["x-admin-token"]))
      return reply.code(401).send({ error: "no autorizado" });
    return { ok: true };
  });

  app.get<{ Params: { id: string } }>("/api/historial/:id", (req) =>
    deps.historial(req.params.id));

  /** Analítica del día (fuente real: tabla `ocupacion` en SQLite). */
  app.get("/api/analitica/hoy", () => deps.eventosHoy());

  app.post<{ Params: { id: string }; Body: { estado?: unknown; nodo?: unknown } }>(
    "/api/espacios/:id", (req, reply) => {
      if (excede(intentosPorIp, req.ip, LIMITE_POR_MINUTO))
        return reply.code(429).send({ error: "demasiadas solicitudes" });

      if (!tokenValido(req.headers["x-admin-token"]))
        return reply.code(401).send({ error: "no autorizado" });
      const estado = EstadoSchema.safeParse(req.body?.estado);
      const nodoRaw = req.body?.nodo;
      const nodo = typeof nodoRaw === "string" && /^[\w-]{1,32}$/.test(nodoRaw)
        ? nodoRaw
        : undefined;
      if (nodoRaw !== undefined && (!nodo || !config.nodosAdmin.includes(nodo)))
        return reply.code(400).send({ error: "nodo inválido" });
      if (!config.espacios.includes(req.params.id) || !estado.success)
        return reply.code(400).send({ error: "id o estado inválido" });
      deps.publicarEstado(req.params.id, estado.data, nodo);
      return { ok: true };
    });

  app.get("/ws", {
    websocket: true,
    preHandler: async (req, reply) => {
      if (!origenPermitido(req.headers.origin, req.headers.host)) {
        req.log.warn({ origin: req.headers.origin }, "WS rechazado por origen cruzado");
        return reply.code(403).send();
      }
    },
  }, (sock) => deps.onConexion(sock as unknown as Sock));

  return app;
}
