import { computed, reactive, ref } from "vue";
import type { MensajeWs } from "@parq/shared";
import { conectado, onMensaje } from "../../services/realtime";
import { BAHIA_LAYOUT, TOTAL_BAHIAS } from "../../config/bahias";
import type { Bahia } from "../../types/hmi";
import type { EstadoVista } from "@parq/shared";

/**
 * Estado REAL del parqueadero (singleton, alimentado por WebSocket ← backend ← MQTT).
 * La UI nunca muta este estado: solo cambia cuando el mensaje vuelve del broker.
 */
const estados = reactive<Record<string, { estado: EstadoVista; ts: number | null }>>({});
const lote = ref("-");

onMensaje((m: MensajeWs) => {
  if ("snapshot" in m) {
    lote.value = m.snapshot.lote;
    m.snapshot.espacios.forEach((e) => (estados[e.espacio] = { estado: e.estado, ts: e.ts }));
  } else {
    estados[m.espacio] = { estado: m.estado, ts: m.ts };
  }
});

export function useParqueadero() {
  const bahias = computed<Bahia[]>(() =>
    BAHIA_LAYOUT.map((b) => ({
      ...b,
      estado: estados[b.id]?.estado ?? "SIN_DATO",
      ts: estados[b.id]?.ts ?? null,
    })));
  const disponibles = computed(() => bahias.value.filter((b) => b.estado === "LIBRE").length);
  const ocupadas = computed(() => bahias.value.filter((b) => b.estado === "OCUPADO").length);
  const sinDato = computed(() => bahias.value.filter((b) => b.estado === "SIN_DATO").length);
  const ultimaActualizacion = computed<number | null>(() =>
    bahias.value.reduce<number | null>(
      (max, b) => (b.ts !== null && (max === null || b.ts > max) ? b.ts : max),
      null,
    ));
  return { lote, conectado, bahias, disponibles, ocupadas, sinDato, ultimaActualizacion, total: TOTAL_BAHIAS };
}
