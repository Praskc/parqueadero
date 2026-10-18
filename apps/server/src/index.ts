import { topicEstado } from "@parq/shared";
import { config } from "./config.ts";
import { save, snapshot, historial, eventosHoy } from "./db.ts";
import { attach, broadcast } from "./realtime.ts";
import { startMqtt } from "./mqtt.ts";
import { buildApp } from "./http.ts";

const snap = () => snapshot(config.lote, [...config.espacios]);

// La única vía de escritura es MQTT: el admin publica y todo se actualiza
// cuando el mensaje vuelve del broker (lazo completo probado sin ESP32).
const mq = startMqtt({
  onEstado: (r) => {
    save(r);
    broadcast({ type: "espacio", ...r });
  },
  disponibles: () => snap().disponibles,
});

const app = await buildApp({
  snapshot: snap,
  historial: (id) => historial(config.lote, id),
  eventosHoy: () => eventosHoy(config.lote),
  publicarEstado: (espacio, estado, nodo) =>
    mq.publish(topicEstado(config.lote, nodo ?? config.nodoAdmin, espacio),
      JSON.stringify({ v: 1, estado, ts: Date.now() }), { qos: 1, retain: true }),
  onConexion: (sock) => {
    attach(sock);
    sock.send(JSON.stringify({ snapshot: snap() }));
  },
});

await app.listen({ port: config.port, host: config.host });
