<script setup lang="ts">
// Analítica diaria unificada sobre SQLite (/api/analitica/hoy) y estado en vivo de las 30 bahías por estamento.
import { computed, onMounted, onUnmounted, ref } from "vue";
import { getAnaliticaHoy, type EventoHoy } from "../../services/api";
import { onMensaje } from "../../services/realtime";
import { tema } from "../../shared/theme";
import type { Bahia } from "../../types/hmi";

const props = defineProps<{ bahias: Bahia[]; disponibles: number }>();

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
    errorCarga.value = "No se pudo consultar el histórico diario del servidor. Mostrando únicamente los eventos en vivo de esta sesión.";
  } finally {
    cargando.value = false;
  }
}

onMounted(() => {
  offWs = onMensaje((m) => {
    if ("snapshot" in m) return;
    if (eventos.value.some((e) => e.espacio && e.espacio === m.espacio && e.ts === m.ts)) return;
    eventos.value.unshift({ espacio: m.espacio, estado: m.estado, nodo: m.nodo, ts: m.ts });
  });
  void cargar();
});
onUnmounted(() => offWs?.());

const total = computed(() => props.bahias.length || 30);
const ocupados = computed(() => props.bahias.filter((b) => b.estado === "OCUPADO").length);
const porcentaje = computed(() =>
  total.value === 0 ? 0 : Math.round((ocupados.value / total.value) * 100));
const conDato = computed(() => props.bahias.filter((b) => b.ts !== null).length);

const estamentos = computed(() => {
  const bloque = (nombre: string, rango: string, key: "estudiantes" | "docentes" | "administrativos") => {
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
      (e) => e.estado === "OCUPADO" && new Date(e.ts).getHours() === h).length,
    salidas: eventos.value.filter(
      (e) => e.estado === "LIBRE" && new Date(e.ts).getHours() === h).length,
  })));

const rotaciones = computed(() => {
  const m = new Map<string, number>();
  for (const e of eventos.value)
    if (e.estado === "OCUPADO") m.set(e.espacio, (m.get(e.espacio) ?? 0) + 1);
  return m;
});

const porNodo = computed(() => {
  const m = new Map<string, number>();
  for (const e of eventos.value) m.set(e.nodo, (m.get(e.nodo) ?? 0) + 1);
  return [...m.entries()].map(([nodo, n]) => ({ nodo, n })).sort((a, b) => b.n - a.n);
});
const maxNodo = computed(() => Math.max(1, ...porNodo.value.map((x) => x.n)));
const rotacionesHoy = computed(() =>
  eventos.value.filter((e) => e.estado === "OCUPADO").length);
const hayEventos = computed(() => eventos.value.length > 0);

const FW = 620, FH = 205, PL = 34, PR = 12, PT = 14, PB = 26;

function suavizar(pts: Array<[number, number]>): string {
  if (pts.length < 2) return "";
  if (pts.length === 2)
    return `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]}`;
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

const MAX_FLUJO = computed(() =>
  Math.max(4, ...flujo.value.flatMap((f) => [f.ingresos, f.salidas])));
const flujoX = (i: number) => PL + (i * (FW - PL - PR)) / 12;
const flujoY = computed(
  () => (v: number) => PT + (FH - PT - PB) * (1 - v / MAX_FLUJO.value));
const ptsIngresos = computed(() =>
  flujo.value.map((f, i) => [flujoX(i), flujoY.value(f.ingresos)] as [number, number]));
const ptsSalidas = computed(() =>
  flujo.value.map((f, i) => [flujoX(i), flujoY.value(f.salidas)] as [number, number]));
const pathIngresos = computed(() => suavizar(ptsIngresos.value));
const pathSalidas = computed(() => suavizar(ptsSalidas.value));
const baseY = computed(() => flujoY.value(0));
const areaIngresos = computed(
  () => `${pathIngresos.value} L ${flujoX(12)} ${baseY.value} L ${flujoX(0)} ${baseY.value} Z`);
const ticksFlujo = computed(() =>
  [0, 0.5, 1].map((f) => Math.round(MAX_FLUJO.value * f)));

const MAX_ROT = computed(() =>
  Math.max(4, ...props.bahias.map((b) => rotaciones.value.get(b.id) ?? 0)));
const rotY = computed(
  () => (v: number) => PT + (FH - PT - PB) * (1 - v / MAX_ROT.value));
const barras = computed(() => {
  const n = props.bahias.length || 30;
  const w = (FW - PL - PR) / n;
  return props.bahias.map((b, i) => {
    const rot = rotaciones.value.get(b.id) ?? 0;
    const h = Math.max(rot > 0 ? 3 : 1.5, (rot / MAX_ROT.value) * (FH - PT - PB));
    return {
      b,
      idx: i,
      rot,
      x: PL + i * w + w * 0.16,
      ancho: Math.max(4, w * 0.68),
      y: PT + (FH - PT - PB) - h,
      alto: h,
      cx: PL + i * w + w / 2,
      color:
        b.estado === "OCUPADO" ? "#dc2626" : b.estado === "LIBRE" ? "#15803d" : "#64748b",
    };
  });
});

function barraColorPct(pct: number): string {
  if (pct >= 85) return tema.value === "oscuro" ? "bg-red-500" : "bg-[#dc2626]";
  if (pct >= 65) return tema.value === "oscuro" ? "bg-[#facc15]" : "bg-[#eab308]";
  return tema.value === "oscuro" ? "bg-emerald-500" : "bg-[#15803d]";
}
</script>

<template>
  <div class="flex flex-col gap-4 w-full">
    <!-- Banda superior de indicadores diarios y sincronización (sin subpestañas anidadas) -->
    <div
      class="rounded-xl border grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x"
      :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800 divide-slate-800' : 'bg-white border-slate-200 divide-slate-200'"
    >
      <div class="p-3.5 flex flex-col justify-between">
        <span class="text-[11px] font-bold uppercase tracking-wide" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600'">Ocupación actual</span>
        <div class="flex items-baseline gap-1.5 mt-1">
          <span class="text-xl font-bold font-mono tabular-nums" :class="porcentaje >= 85 ? (tema === 'oscuro' ? 'text-red-400' : 'text-[#b91c1c]') : porcentaje >= 65 ? (tema === 'oscuro' ? 'text-[#facc15]' : 'text-[#8a6d00]') : (tema === 'oscuro' ? 'text-emerald-400' : 'text-[#15803d]')">
            {{ porcentaje }}%
          </span>
          <span class="text-xs font-mono tabular-nums" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">({{ ocupados }}/{{ total }})</span>
        </div>
      </div>

      <div class="p-3.5 flex flex-col justify-between">
        <span class="text-[11px] font-bold uppercase tracking-wide" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600'">Ingresos hoy</span>
        <div class="flex items-baseline gap-1.5 mt-1">
          <span class="text-xl font-bold font-mono tabular-nums" :class="tema === 'oscuro' ? 'text-emerald-400' : 'text-[#15803d]'">{{ rotacionesHoy }}</span>
          <span class="text-xs" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">ocupaciones</span>
        </div>
      </div>

      <div class="p-3.5 flex flex-col justify-between">
        <span class="text-[11px] font-bold uppercase tracking-wide" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600'">Sensores activos</span>
        <div class="flex items-baseline gap-1.5 mt-1">
          <span class="text-xl font-bold font-mono tabular-nums" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">{{ conDato }}/{{ total }}</span>
          <span class="text-xs" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">reportando</span>
        </div>
      </div>

      <div class="p-3.5 flex items-center justify-between gap-2">
        <div>
          <span class="block text-[11px] font-bold uppercase tracking-wide" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600'">Movimientos</span>
          <span class="text-xl font-bold font-mono tabular-nums mt-1 block" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">{{ eventos.length }}</span>
        </div>
        <button
          type="button"
          :disabled="cargando"
          class="min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer shrink-0"
          :class="tema === 'oscuro'
            ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400'
            : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-[#15803d]'"
          @click="cargar"
        >
          {{ cargando ? "Cargando…" : "Actualizar" }}
        </button>
      </div>
    </div>

    <div
      v-if="errorCarga"
      class="rounded-xl p-3 border flex items-center justify-between gap-3 text-xs"
      :class="tema === 'oscuro' ? 'bg-yellow-950/30 border-yellow-700 text-yellow-200' : 'bg-yellow-50 border-yellow-300 text-yellow-950'"
    >
      <span>{{ errorCarga }}</span>
      <button type="button" class="font-bold underline shrink-0 cursor-pointer" @click="cargar">Reintentar</button>
    </div>

    <!-- Fila superior analítica: Flujo horario (7 col) + Disponibilidad por estamento (5 col) -->
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <div
        class="xl:col-span-7 border rounded-xl p-4 flex flex-col justify-between gap-3"
        :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'"
      >
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 class="text-xs font-bold font-headline uppercase tracking-wider" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">
              Flujo horario de ingresos y salidas (06:00 a 18:00)
            </h4>
            <p class="text-xs" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
              Evolución acumulada del día en Campus Puerta Roja
            </p>
          </div>
          <div class="flex items-center gap-4 text-xs font-semibold">
            <span class="flex items-center gap-1.5" :class="tema === 'oscuro' ? 'text-emerald-400' : 'text-[#15803d]'">
              <span class="w-2.5 h-2.5 rounded-full bg-[#15803d]" /> Ingresos
            </span>
            <span class="flex items-center gap-1.5" :class="tema === 'oscuro' ? 'text-[#facc15]' : 'text-[#8a6d00]'">
              <span class="w-2.5 h-2.5 rounded-full bg-[#eab308]" /> Salidas
            </span>
          </div>
        </div>

        <svg :viewBox="`0 0 ${FW} ${FH}`" class="w-full h-48">
          <defs>
            <linearGradient id="gradIngUnisucre" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stop-color="#15803d" stop-opacity="0.3" />
              <stop offset="95%" stop-color="#15803d" stop-opacity="0" />
            </linearGradient>
          </defs>
          <g v-for="(tick, i) in ticksFlujo" :key="`gy${i}`">
            <line :x1="PL" :y1="flujoY(tick)" :x2="FW - PR" :y2="flujoY(tick)" :stroke="tema === 'oscuro' ? '#1e293b' : '#e2e8f0'" stroke-dasharray="3 3" />
            <text :x="PL - 6" :y="flujoY(tick) + 3" text-anchor="end" font-size="9" :fill="tema === 'oscuro' ? '#94a3b8' : '#64748b'">{{ tick }}</text>
          </g>
          <g v-for="(f, i) in flujo" :key="`x${i}`">
            <text v-if="i % 2 === 0" :x="flujoX(i)" :y="FH - 7" text-anchor="middle" font-size="9" :fill="tema === 'oscuro' ? '#94a3b8' : '#64748b'">{{ f.hora }}</text>
          </g>
          <path :d="areaIngresos" fill="url(#gradIngUnisucre)" />
          <path :d="pathIngresos" fill="none" stroke="#15803d" stroke-width="2.4" stroke-linecap="round" />
          <path :d="pathSalidas" fill="none" stroke="#eab308" stroke-width="2" stroke-dasharray="5 3" stroke-linecap="round" />
          <g v-for="(f, i) in flujo" :key="`d${i}`">
            <circle :cx="flujoX(i)" :cy="flujoY(f.ingresos)" r="2.5" fill="#15803d">
              <title>{{ f.hora }}: {{ f.ingresos }} ingresos</title>
            </circle>
            <circle :cx="flujoX(i)" :cy="flujoY(f.salidas)" r="2.5" fill="#eab308">
              <title>{{ f.hora }}: {{ f.salidas }} salidas</title>
            </circle>
          </g>
          <line :x1="PL" :y1="baseY" :x2="FW - PR" :y2="baseY" :stroke="tema === 'oscuro' ? '#334155' : '#cbd5e1'" />
          <text v-if="!hayEventos && !cargando" :x="FW / 2" :y="FH / 2" text-anchor="middle" font-size="11" :fill="tema === 'oscuro' ? '#94a3b8' : '#64748b'" font-weight="600">
            Sin movimientos hoy. Ejecuta una maniobra en «Control de portería» para poblar la serie.
          </text>
        </svg>
      </div>

      <div
        class="xl:col-span-5 border rounded-xl p-4 flex flex-col justify-between gap-3"
        :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'"
      >
        <div>
          <h4 class="text-xs font-bold font-headline uppercase tracking-wider" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">
            Disponibilidad por estamento
          </h4>
          <p class="text-xs" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
            Estado en vivo de las 30 plazas universitarias
          </p>
        </div>

        <div class="flex flex-col gap-3.5 my-auto">
          <div v-for="est in estamentos" :key="est.nombre" class="flex flex-col gap-1.5">
            <div class="flex items-baseline justify-between gap-2">
              <div class="min-w-0">
                <span class="text-xs font-bold font-headline" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">{{ est.nombre }}</span>
                <span class="ml-1.5 text-[11px] font-mono" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">{{ est.rango }}</span>
              </div>
              <span class="text-xs font-mono font-bold tabular-nums shrink-0" :class="tema === 'oscuro' ? 'text-slate-200' : 'text-slate-800'">
                {{ est.libres }} libres ({{ est.pct }}%)
              </span>
            </div>
            <div class="w-full h-2.5 rounded-full overflow-hidden" :class="tema === 'oscuro' ? 'bg-slate-800' : 'bg-slate-100'">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="barraColorPct(est.pct)"
                :style="{ width: `${est.pct}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Fila inferior analítica: Rotación E01 a E30 (8 col) + Actividad por nodo (4 col) -->
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <div
        class="xl:col-span-8 border rounded-xl p-4 flex flex-col justify-between gap-3"
        :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'"
      >
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 class="text-xs font-bold font-headline uppercase tracking-wider" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">
              Rotación diaria por plaza (E01 a E30)
            </h4>
            <p class="text-xs" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
              Veces ocupada hoy y estado actual de cada celda
            </p>
          </div>
          <div class="flex items-center gap-3 text-xs font-medium">
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-xs bg-[#15803d]" /> Libre</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-xs bg-[#dc2626]" /> Ocupada</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-xs bg-[#64748b]" /> Sin dato</span>
          </div>
        </div>

        <svg :viewBox="`0 0 ${FW} ${FH}`" class="w-full h-44">
          <g v-for="(tick, i) in [0, MAX_ROT / 2, MAX_ROT]" :key="`gyb${i}`">
            <line :x1="PL" :y1="rotY(tick)" :x2="FW - PR" :y2="rotY(tick)" :stroke="tema === 'oscuro' ? '#1e293b' : '#e2e8f0'" stroke-dasharray="3 3" />
            <text :x="PL - 6" :y="rotY(tick) + 3" text-anchor="end" font-size="9" :fill="tema === 'oscuro' ? '#94a3b8' : '#64748b'">{{ Math.round(tick) }}</text>
          </g>
          <g v-for="bar in barras" :key="bar.b.id">
            <rect
              :x="bar.x" :y="bar.y" :width="bar.ancho" :height="bar.alto"
              rx="2" :fill="bar.color" class="transition-all duration-300"
            >
              <title>Plaza {{ bar.b.id }} ({{ bar.b.estado }}): {{ bar.rot }} rotaciones hoy</title>
            </rect>
            <text v-if="bar.rot > 0" :x="bar.cx" :y="bar.y - 4" text-anchor="middle" font-size="8" font-weight="700" :fill="tema === 'oscuro' ? '#e2e8f0' : '#334155'">{{ bar.rot }}</text>
            <text v-if="bar.idx % 2 === 0" :x="bar.cx" :y="FH - 7" text-anchor="middle" font-size="7.5" font-weight="700" :fill="tema === 'oscuro' ? '#94a3b8' : '#475569'">{{ bar.b.id }}</text>
          </g>
        </svg>
      </div>

      <div
        class="xl:col-span-4 border rounded-xl p-4 flex flex-col justify-between gap-3"
        :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'"
      >
        <div>
          <h4 class="text-xs font-bold font-headline uppercase tracking-wider" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">
            Eventos por nodo emisor
          </h4>
          <p class="text-xs" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
            Portería, salida, consola y sensores
          </p>
        </div>

        <div v-if="porNodo.length" class="flex flex-col gap-2.5 my-auto">
          <div v-for="n in porNodo" :key="n.nodo" class="flex items-center gap-2.5">
            <span class="text-xs font-mono font-semibold w-24 truncate" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-700'" :title="n.nodo">{{ n.nodo }}</span>
            <div class="flex-1 rounded-full h-2.5 overflow-hidden" :class="tema === 'oscuro' ? 'bg-slate-800' : 'bg-slate-100'">
              <div
                class="h-full rounded-full bg-[#15803d] transition-all duration-500"
                :style="{ width: `${(n.n / maxNodo) * 100}%` }"
              />
            </div>
            <span class="text-xs font-mono font-bold tabular-nums w-8 text-right" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-800'">{{ n.n }}</span>
          </div>
        </div>
        <p v-else class="text-xs my-auto" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
          Sin eventos registrados hoy en el servidor.
        </p>

        <div v-if="ultimaCarga" class="text-[11px] font-mono tabular-nums pt-2 border-t" :class="tema === 'oscuro' ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-600'">
          Sincronizado: {{ new Date(ultimaCarga).toLocaleTimeString("es-CO", { hour12: false }) }}
        </div>
      </div>
    </div>
  </div>
</template>
