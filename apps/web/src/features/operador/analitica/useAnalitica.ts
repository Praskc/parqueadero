import { computed, onMounted, onUnmounted, ref } from "vue";
import { getAnaliticaHoy, type EventoHoy } from "../../../services/api";
import { onMensaje } from "../../../services/realtime";
import type { Bahia } from "../../../types/hmi";

const ZONAS = [
  { key: "estudiantes", label: "Estudiantes", color: "#15803d" },
  { key: "docentes", label: "Docentes", color: "#2563eb" },
  { key: "administrativos", label: "Administrativos", color: "#7c3aed" },
] as const;

export const DONUT_R = 54;
export const DONUT_C = 2 * Math.PI * DONUT_R;

export interface EstadoAnalitica {
  bahias: Bahia[];
  enCamino?: string[];
}

export function useAnalitica(props: EstadoAnalitica) {
  const eventos = ref<EventoHoy[]>([]);
  const cargando = ref(false);
  const errorCarga = ref<string | null>(null);
  const ultimaCarga = ref<number | null>(null);
  let offWs: (() => void) | undefined;

  async function cargar() {
    cargando.value = true;
    errorCarga.value = null;
    try {
      eventos.value = await getAnaliticaHoy();
      ultimaCarga.value = Date.now();
    } catch {
      errorCarga.value =
        "No se pudo consultar el histórico diario del servidor. Mostrando únicamente los eventos en vivo de esta sesión.";
    } finally {
      cargando.value = false;
    }
  }

  onMounted(() => {
    offWs = onMensaje((m) => {
      if ("snapshot" in m) return;
      if (
        eventos.value.some(
          (e) => e.espacio && e.espacio === m.espacio && e.ts === m.ts,
        )
      )
        return;
      eventos.value.unshift({
        espacio: m.espacio,
        estado: m.estado,
        nodo: m.nodo,
        ts: m.ts,
      });
    });
    void cargar();
  });
  onUnmounted(() => offWs?.());

  const total = computed(() => props.bahias.length || 30);
  const ocupados = computed(
    () => props.bahias.filter((b) => b.estado === "OCUPADO").length,
  );
  const porcentaje = computed(() =>
    total.value === 0 ? 0 : Math.round((ocupados.value / total.value) * 100),
  );
  const conDato = computed(
    () => props.bahias.filter((b) => b.ts !== null).length,
  );

  const estamentos = computed(() => {
    const bloque = (
      nombre: string,
      rango: string,
      key: "estudiantes" | "docentes" | "administrativos",
    ) => {
      const lista = props.bahias.filter((b) => b.estamento === key);
      const cap = lista.length || 10;
      const ocup = lista.filter((b) => b.estado === "OCUPADO").length;
      const libres = lista.filter((b) => b.estado === "LIBRE").length;
      const pct = Math.round((ocup / cap) * 100);
      return { nombre, rango, total: cap, ocupadas: ocup, libres, pct };
    };
    return [
      bloque("Estudiantes", "E01 a E10", "estudiantes"),
      bloque("Docentes", "E11 a E20", "docentes"),
      bloque("Administrativos", "E21 a E30", "administrativos"),
    ];
  });

  const flujo = computed(() =>
    Array.from({ length: 13 }, (_, i) => 6 + i).map((h) => ({
      hora: `${String(h).padStart(2, "0")}:00`,
      ingresos: eventos.value.filter(
        (e) =>
          e.estado === "OCUPADO" && new Date(e.ts).getHours() === h,
      ).length,
      salidas: eventos.value.filter(
        (e) => e.estado === "LIBRE" && new Date(e.ts).getHours() === h,
      ).length,
    })),
  );

  const rotaciones = computed(() => {
    const m = new Map<string, number>();
    for (const e of eventos.value)
      if (e.estado === "OCUPADO") m.set(e.espacio, (m.get(e.espacio) ?? 0) + 1);
    return m;
  });

  const porNodo = computed(() => {
    const m = new Map<string, number>();
    for (const e of eventos.value) m.set(e.nodo, (m.get(e.nodo) ?? 0) + 1);
    return [...m.entries()]
      .map(([nodo, n]) => ({ nodo, n }))
      .sort((a, b) => b.n - a.n);
  });
  const maxNodo = computed(() =>
    Math.max(1, ...porNodo.value.map((x) => x.n)),
  );
  const rotacionesHoy = computed(
    () => eventos.value.filter((e) => e.estado === "OCUPADO").length,
  );
  const hayEventos = computed(() => eventos.value.length > 0);

  const sinDato = computed(
    () => props.bahias.filter((b) => b.estado === "SIN_DATO").length,
  );
  // Las plazas en camino siguen marcadas LIBRE por el backend hasta que el sensor confirma.
  const enCaminoIds = computed(() => new Set(props.enCamino ?? []));
  const libresReales = computed(
    () =>
      props.bahias.filter(
        (b) => b.estado === "LIBRE" && !enCaminoIds.value.has(b.id),
      ).length,
  );
  const enCaminoNum = computed(
    () =>
      props.bahias.filter(
        (b) => b.estado === "LIBRE" && enCaminoIds.value.has(b.id),
      ).length,
  );

  const donut = computed(() => {
    const n = Math.max(1, total.value);
    const segs = [
      { key: "ocupadas", label: "Ocupadas", n: ocupados.value, color: "#dc2626" },
      { key: "camino", label: "En camino", n: enCaminoNum.value, color: "#eab308" },
      { key: "libres", label: "Libres", n: libresReales.value, color: "#15803d" },
      { key: "sindato", label: "Sin dato", n: sinDato.value, color: "#64748b" },
    ];
    let acumulado = 0;
    return segs.map((s) => {
      const frac = s.n / n;
      const largo = frac * DONUT_C;
      const seg = {
        ...s,
        pct: Math.round(frac * 100),
        dash: `${largo.toFixed(2)} ${(DONUT_C - largo).toFixed(2)}`,
        offset: (-acumulado * DONUT_C).toFixed(2),
      };
      acumulado += frac;
      return seg;
    });
  });

  const permanencia = computed(() => {
    const orden = [...eventos.value].sort((a, b) => a.ts - b.ts);
    const abiertos = new Map<string, number>();
    const acum = new Map<string, { suma: number; n: number }>();
    let sumaGlobal = 0;
    let muestrasGlobal = 0;

    for (const e of orden) {
      if (e.estado === "OCUPADO") {
        abiertos.set(e.espacio, e.ts);
        continue;
      }
      if (e.estado !== "LIBRE") continue;
      const inicio = abiertos.get(e.espacio);
      if (inicio === undefined) continue;
      abiertos.delete(e.espacio);
      const minutos = (e.ts - inicio) / 60000;
      if (minutos <= 0 || minutos > 24 * 60) continue;
      const zona =
        props.bahias.find((b) => b.id === e.espacio)?.estamento ??
        "estudiantes";
      const acc = acum.get(zona) ?? { suma: 0, n: 0 };
      acc.suma += minutos;
      acc.n += 1;
      acum.set(zona, acc);
      sumaGlobal += minutos;
      muestrasGlobal += 1;
    }

    const zonas = ZONAS.map((z) => {
      const acc = acum.get(z.key);
      return {
        ...z,
        minutos: acc && acc.n > 0 ? acc.suma / acc.n : null,
        muestras: acc?.n ?? 0,
      };
    });
    const maximo = Math.max(1, ...zonas.map((z) => z.minutos ?? 0));

    return {
      global: muestrasGlobal > 0 ? sumaGlobal / muestrasGlobal : null,
      muestras: muestrasGlobal,
      zonas,
      maximo,
    };
  });

  const horaPico = computed(() => {
    const max = Math.max(0, ...flujo.value.map((f) => f.ingresos));
    if (max === 0) return null;
    return flujo.value.find((f) => f.ingresos === max)?.hora ?? null;
  });

  function formatoMinutos(min: number | null): string {
    if (min === null) return "—";
    if (min < 1) return "< 1 min";
    if (min < 60) return `${Math.round(min)} min`;
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }

  return {
    eventos,
    cargando,
    errorCarga,
    ultimaCarga,
    cargar,
    total,
    ocupados,
    porcentaje,
    conDato,
    estamentos,
    flujo,
    rotaciones,
    porNodo,
    maxNodo,
    rotacionesHoy,
    hayEventos,
    donut,
    permanencia,
    horaPico,
    formatoMinutos,
  };
}
