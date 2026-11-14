import { computed, reactive, ref } from "vue";
import type { EstadoVista } from "@parq/shared";
import { conectado } from "../../services/realtime";
import { BAHIA_LAYOUT, TOTAL_BAHIAS } from "../../config/bahias";
import type { Bahia } from "../../types/hmi";
import { suscribirse, type Evento } from "./mediator";

// Estado del parqueadero alimentado por el Mediator (único suscriptor al WebSocket).
const espejo = reactive<Record<string, { estado: EstadoVista; ts: number | null }>>({});
const lote = ref("-");

suscribirse((e: Evento) => {
  if (e.tipo === "snapshot") {
    e.espacios.forEach((s) => (espejo[s.espacio] = { estado: s.estado, ts: Date.now() }));
    return;
  }
  if (e.tipo === "estado") {
    espejo[e.espacio] = { estado: e.estado, ts: Date.now() };
  }
});

export function useParqueadero() {
  const bahias = computed<Bahia[]>(() =>
    BAHIA_LAYOUT.map((b) => ({
      ...b,
      estado: espejo[b.id]?.estado ?? "SIN_DATO",
      ts: espejo[b.id]?.ts ?? null,
    })),
  );
  const disponibles = computed(() => bahias.value.filter((b) => b.estado === "LIBRE").length);
  const ocupadas = computed(() => bahias.value.filter((b) => b.estado === "OCUPADO").length);
  const sinDato = computed(() => bahias.value.filter((b) => b.estado === "SIN_DATO").length);
  const ultimaActualizacion = computed<number | null>(() =>
    bahias.value.reduce<number | null>(
      (max, b) => (b.ts !== null && (max === null || b.ts > max) ? b.ts : max),
      null,
    ),
  );
  return { lote, conectado, bahias, disponibles, ocupadas, sinDato, ultimaActualizacion, total: TOTAL_BAHIAS };
}
