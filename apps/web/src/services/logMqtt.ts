/**
 * Registro en vivo de mensajes MQTT (evidencia del pipeline real).
 *
 * - IN: cada evento que el backend reenvía por el WebSocket (origen: broker).
 * - OUT: cada publicación que esta misma HMI hace vía REST → MQTT.
 *
 * Es un buffer circular en memoria (los últimos 100 mensajes); la tabla
 * `ocupacion` en SQLite conserva el historial completo para la analítica.
 */
import { reactive } from "vue";
import type { Estado } from "@parq/shared";
import { topicEstado } from "@parq/shared";
import { onMensaje } from "./realtime";

export interface EntradaLogMqtt {
  id: number;
  ts: number;
  topic: string;
  estado: Estado;
  /** 1 en este sistema (los topics de estado se publican con QoS 1). */
  qos: 1;
  retained: boolean;
  direccion: "in" | "out";
}

/** Último nodo visto por espacio (para la matriz de telemetría). */
export const ultimoNodoPorEspacio = reactive<Record<string, string>>({});

export const logMqtt = reactive<EntradaLogMqtt[]>([]);

let lote = "lote1"; // se corrige con el snapshot del WS
let seq = 0;
const MAX = 100;

function push(e: Omit<EntradaLogMqtt, "id">) {
  logMqtt.unshift({ ...e, id: ++seq });
  if (logMqtt.length > MAX) logMqtt.length = MAX;
}

// IN: eventos que vienen del broker vía backend → /ws
onMensaje((m) => {
  if ("snapshot" in m) {
    lote = m.snapshot.lote;
    return;
  }
  ultimoNodoPorEspacio[m.espacio] = m.nodo;
  push({
    ts: m.ts,
    topic: topicEstado(m.lote, m.nodo, m.espacio),
    estado: m.estado,
    qos: 1,
    retained: true,
    direccion: "in",
  });
});

/** OUT: lo llama la capa de simulación cuando publica por REST → MQTT. */
export function logPublicacion(espacio: string, estado: Estado, nodo: string) {
  ultimoNodoPorEspacio[espacio] = nodo;
  push({
    ts: Date.now(),
    topic: topicEstado(lote, nodo, espacio),
    estado,
    qos: 1,
    retained: true,
    direccion: "out",
  });
}
