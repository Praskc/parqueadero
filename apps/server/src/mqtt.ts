import mqtt from "mqtt";
import { PayloadEstadoSchema, RE_TOPIC_ESTADO, topicDisponibles } from "@parq/shared";
import { config } from "./config.ts";
import type { Registro } from "./db.ts";

export function startMqtt(handlers: {
  onEstado: (r: Registro) => void;
  disponibles: () => number;
}) {
  const mq = mqtt.connect(config.mqttUrl, {
    username: config.mqttUser,
    password: config.mqttPass,
    reconnectPeriod: 2000,
  });

  mq.on("connect", () => {
    console.log("[mqtt] conectado a", config.mqttUrl);
    mq.subscribe("parq/+/+/espacios/+/estado", { qos: 1 });
  });
  mq.on("error", (e) => console.error("[mqtt]", e.message));

  mq.on("message", (topic, buf) => {
    const m = RE_TOPIC_ESTADO.exec(topic);
    if (!m) return;
    let raw: unknown;
    try {
      raw = JSON.parse(buf.toString());
    } catch {
      return;
    }
    const p = PayloadEstadoSchema.safeParse(raw);
    if (!p.success) return;
    const [, lote, nodo, espacio] = m;
    // Solo el lote configurado y nodos bien formados (evita eventos cruzados/injectados)
    if (lote !== config.lote) return;
    if (!/^[\w-]{1,32}$/.test(nodo)) return;
    if (!config.espacios.includes(espacio)) return;

    handlers.onEstado({ lote, espacio, estado: p.data.estado, nodo, ts: Date.now() });
    mq.publish(topicDisponibles(lote), JSON.stringify({ v: 1, n: handlers.disponibles() }),
      { qos: 1, retain: true });
  });

  return mq;
}
