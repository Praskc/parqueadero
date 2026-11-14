import { computed, reactive, ref } from "vue";
import type { Estado } from "@parq/shared";
import type { AnimacionMoto, EstadoTalanquera, NotificacionHMI } from "../../types/hmi";

export const talanquera = ref<EstadoTalanquera>("cerrada");
/** Hacia dónde abate la pluma: al lote cuando entra un vehículo, a la calle cuando sale. */
export const talanqueraSentido = ref<"entrada" | "salida">("entrada");
export const bloqueada = ref(false);
export const autoSimulacion = ref(false);
export const notificacion = ref<NotificacionHMI | null>(null);

export const anims = reactive(new Map<string, AnimacionMoto>());
export const animaciones = computed(() => [...anims.values()]);
export const hayEsperando = computed(() =>
  animaciones.value.some((a) => a.etapa === "esperando"),
);

/** Espejo local del estado real de bahías (alimentado por el bus WS). */
export const estados = reactive<Record<string, Estado | "SIN_DATO">>({});

/** Eventos publicados por esta capa: la respuesta del WS no debe re-animarse. */
export const omitir = new Set<string>();

export function uid(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function notificar(
  tipo: NotificacionHMI["tipo"],
  titulo: string,
  mensaje: string,
  espacioId?: string,
  prioridad: NotificacionHMI["prioridad"] = "media",
): void {
  notificacion.value = {
    id: uid(),
    tipo,
    titulo,
    mensaje,
    espacioId,
    timestamp: Date.now(),
    prioridad,
  };
}
