import { computed } from "vue";
import { ESTAMENTOS } from "../../config/bahias";
import type { AnimacionMoto, Bahia } from "../../types/hmi";

const ETAPAS_ACCESO = ["aproximacion", "talanquera", "esperando"] as const;

export interface EstadoOperador {
  bahias: Bahia[];
  animaciones: AnimacionMoto[];
  ahora: number;
}

export function useOperador(props: EstadoOperador) {
  const bahiasEnCamino = computed(() => {
    const asignadas = new Set<string>();
    for (const a of props.animaciones) {
      if (
        a.tipo === "ingreso" &&
        a.espacioId &&
        a.espacioId !== "EN_ESPERA"
      ) {
        asignadas.add(a.espacioId);
      }
    }
    return asignadas;
  });

  const enCamino = computed(
    () =>
      props.bahias.filter(
        (b) => b.estado === "LIBRE" && bahiasEnCamino.value.has(b.id),
      ).length,
  );
  const libresEfectivos = computed(
    () =>
      props.bahias.filter(
        (b) => b.estado === "LIBRE" && !bahiasEnCamino.value.has(b.id),
      ).length,
  );
  const estaLleno = computed(() => libresEfectivos.value === 0);
  const total = computed(() => props.bahias.length || 30);
  const ocupados = computed(
    () => props.bahias.filter((b) => b.estado === "OCUPADO").length,
  );
  const porcentaje = computed(() =>
    total.value === 0 ? 0 : Math.round((ocupados.value / total.value) * 100),
  );

  const bahiasPorEstamento = computed(() =>
    ESTAMENTOS.map((est) => {
      const celdas = props.bahias.filter((b) => b.estamento === est.key);
      const libres = celdas.filter(
        (b) => b.estado === "LIBRE" && !bahiasEnCamino.value.has(b.id),
      ).length;
      return { ...est, celdas, libres };
    }),
  );

  function haceDesde(ts: number | null): string {
    if (ts === null) return "sin dato";
    const s = Math.max(0, Math.floor((props.ahora - ts) / 1000));
    if (s < 5) return "ahora";
    if (s < 60) return `hace ${s} s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `hace ${m} min`;
    return `hace ${Math.floor(m / 60)} h`;
  }

  const lazoNorte = computed(() =>
    props.animaciones.some(
      (a) =>
        a.tipo === "ingreso" &&
        (ETAPAS_ACCESO as readonly string[]).includes(a.etapa) &&
        a.posicionActual.y < 50,
    ),
  );
  const lazoSur = computed(() =>
    props.animaciones.some(
      (a) =>
        a.tipo === "ingreso" &&
        (ETAPAS_ACCESO as readonly string[]).includes(a.etapa) &&
        a.posicionActual.y >= 50,
    ),
  );
  const fotoceldaInterrumpida = computed(() =>
    props.animaciones.some(
      (a) =>
        a.posicionActual.x >= 16 &&
        a.posicionActual.x <= 26 &&
        ((ETAPAS_ACCESO as readonly string[]).includes(a.etapa) ||
          a.etapa === "ruta"),
    ),
  );

  return {
    bahiasEnCamino,
    enCamino,
    libresEfectivos,
    estaLleno,
    total,
    ocupados,
    porcentaje,
    bahiasPorEstamento,
    haceDesde,
    lazoNorte,
    lazoSur,
    fotoceldaInterrumpida,
  };
}
