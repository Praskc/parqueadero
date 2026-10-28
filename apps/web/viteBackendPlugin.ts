import type { Plugin } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import type { Estado, Snapshot, EventoEspacio } from "@parq/shared";

interface FilaEspacio {
  espacio: string;
  estado: Estado;
  ts: number;
}

interface FilaOcupacion {
  id: number;
  lote: string;
  espacio: string;
  estado: Estado;
  nodo: string;
  ts: number;
}

export function backendPlugin(): Plugin {
  const lote = "lote_unisucre";
  const ids = Array.from({ length: 30 }, (_, i) => `E${String(i + 1).padStart(2, "0")}`);
  const estadosMap = new Map<string, FilaEspacio>();
  const ocupacionList: FilaOcupacion[] = [];
  let nextId = 1;

  // Ocupación inicial distribuida en los tres estamentos (18 ocupadas, 12 libres)
  const initialOccupied = new Set([
    "E02", "E05", "E07", "E09",
    "E11", "E12", "E14", "E16", "E18", "E20",
    "E21", "E22", "E23", "E25", "E26", "E28", "E29", "E30",
  ]);
  const now = Date.now();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const estado: Estado = initialOccupied.has(id) ? "OCUPADO" : "LIBRE";
    const ts = now - (4000 + ((i * 1700) % 28000));
    estadosMap.set(id, { espacio: id, estado, ts });
    ocupacionList.push({
      id: nextId++,
      lote,
      espacio: id,
      estado,
      nodo: "porteria",
      ts,
    });
  }

  function getSnapshot(): Snapshot {
    const espacios = ids.map((id) => {
      const row = estadosMap.get(id);
      return row
        ? { espacio: row.espacio, estado: row.estado, ts: row.ts }
        : { espacio: id, estado: "LIBRE" as const, ts: null };
    });
    return {
      lote,
      disponibles: espacios.filter((e) => e.estado === "LIBRE").length,
      espacios,
    };
  }

  return {
    name: "parq-backend-plugin",
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });

      server.httpServer?.on("upgrade", (req, socket, head) => {
        if (req.url === "/ws") {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
          });
        }
      });

      wss.on("connection", (ws) => {
        ws.send(JSON.stringify({ snapshot: getSnapshot() }));
      });

      function broadcast(event: EventoEspacio) {
        const payload = JSON.stringify(event);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        });
      }

      // Middlewares para interceptar /api/*
      server.middlewares.use((req, res, next) => {
        const url = req.url ? new URL(req.url, "http://localhost") : null;
        if (!url || !url.pathname.startsWith("/api")) {
          return next();
        }

        res.setHeader("Content-Type", "application/json");

        if (url.pathname === "/api/estado" && req.method === "GET") {
          res.statusCode = 200;
          return res.end(JSON.stringify(getSnapshot()));
        }

        if (url.pathname === "/api/sesion" && req.method === "GET") {
          const token = req.headers["x-admin-token"];
          if (token && typeof token === "string" && token.length >= 3) {
            res.statusCode = 200;
            return res.end(JSON.stringify({ ok: true }));
          }
          res.statusCode = 401;
          return res.end(JSON.stringify({ error: "no autorizado" }));
        }

        if (url.pathname.startsWith("/api/historial/") && req.method === "GET") {
          const espacio = url.pathname.replace("/api/historial/", "");
          const hist = ocupacionList
            .filter((o) => o.espacio === espacio)
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 50)
            .map((o) => ({ estado: o.estado, ts: o.ts }));
          res.statusCode = 200;
          return res.end(JSON.stringify(hist));
        }

        if (url.pathname === "/api/analitica/hoy" && req.method === "GET") {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          const minTs = d.getTime();
          const hoy = ocupacionList
            .filter((o) => o.ts >= minTs)
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 1000)
            .map((o) => ({
              espacio: o.espacio,
              estado: o.estado,
              nodo: o.nodo || "desconocido",
              ts: o.ts,
            }));
          res.statusCode = 200;
          return res.end(JSON.stringify(hoy));
        }

        if (url.pathname.startsWith("/api/espacios/") && req.method === "POST") {
          const id = url.pathname.replace("/api/espacios/", "");
          let bodyStr = "";
          req.on("data", (chunk) => {
            bodyStr += chunk;
          });
          req.on("end", () => {
            try {
              const body = JSON.parse(bodyStr || "{}");
              const estado: Estado = body.estado === "OCUPADO" ? "OCUPADO" : "LIBRE";
              const nodo: string = typeof body.nodo === "string" ? body.nodo : "operador";
              const ts = Date.now();

              estadosMap.set(id, { espacio: id, estado, ts });
              ocupacionList.push({ id: nextId++, lote, espacio: id, estado, nodo, ts });

              broadcast({
                type: "espacio",
                lote,
                espacio: id,
                estado,
                nodo,
                ts,
              });

              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "bad request" }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}
