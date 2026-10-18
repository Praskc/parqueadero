import { z } from "zod";

// ---------- Contrato MQTT (§4 del documento de contexto) ----------

export const EstadoSchema = z.enum(["LIBRE", "OCUPADO"]);
export type Estado = z.infer<typeof EstadoSchema>;

/** Payload de `parq/<lote>/<nodo>/espacios/<id>/estado`. `ts` es opcional: el backend timestampa en recepción. */
export const PayloadEstadoSchema = z.object({
  v: z.literal(1),
  estado: EstadoSchema,
  ts: z.number().int().optional(),
});
export type PayloadEstado = z.infer<typeof PayloadEstadoSchema>;

/** Payload de `parq/<lote>/disponibles`. */
export const PayloadDisponiblesSchema = z.object({
  v: z.literal(1),
  n: z.number().int().nonnegative(),
});
export type PayloadDisponibles = z.infer<typeof PayloadDisponiblesSchema>;

export const RE_TOPIC_ESTADO = /^parq\/([^/]+)\/([^/]+)\/espacios\/([^/]+)\/estado$/;

export const topicEstado = (lote: string, nodo: string, espacio: string) =>
  `parq/${lote}/${nodo}/espacios/${espacio}/estado`;

export const topicDisponibles = (lote: string) => `parq/${lote}/disponibles`;

// ---------- Contrato REST / WebSocket (backend ↔ frontend) ----------

export type EstadoVista = Estado | "SIN_DATO";

export interface EspacioVista {
  espacio: string;
  estado: EstadoVista;
  ts: number | null;
}

export interface Snapshot {
  lote: string;
  disponibles: number;
  espacios: EspacioVista[];
}

export interface EventoEspacio {
  type: "espacio";
  lote: string;
  espacio: string;
  estado: Estado;
  /** Nodo publicador (segmento del topic): porteria, salida, operador, sensorN… */
  nodo: string;
  ts: number;
}

/** Mensajes que el backend empuja por `/ws`. */
export type MensajeWs = { snapshot: Snapshot } | EventoEspacio;
