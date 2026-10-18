<script setup lang="ts">
/**
 * Analítica del operador — puerto a Vue nativo (SVG puro) del
 * "OperatorAnalyticsChart" de la maqueta (que era React + Recharts).
 * Todos los datos son reales:
 *  - Flujo horario / rotaciones / eventos por nodo: tabla `ocupacion` en
 *    SQLite vía GET /api/analitica/hoy.
 *  - Zonas y KPIs: estado en vivo del parqueadero (WS ← MQTT).
 */
import { computed, onMounted, onUnmounted, ref } from "vue";
import { getAnaliticaHoy, type EventoHoy } from "../../services/api";
import { onMensaje } from "../../services/realtime";
import type { Bahia } from "../../types/hmi";

type TabAnalitica = "flujo" | "bahias" | "zonas" | "rendimiento";
const tab = ref<TabAnalitica>("flujo");

const props = defineProps<{ bahias: Bahia[]; disponibles: number }>();

const eventos = ref<EventoHoy[]>([]);
const cargando = ref(false);
const ultimaCarga = ref<number | null>(null);
let offWs: (() => void) | undefined;

async function cargar() {
  cargando.value = true;
  try {
    eventos.value = await getAnaliticaHoy();
    ultimaCarga.value = Date.now();
  } catch {
    /* backend caído: los eventos en vivo siguen entrando por WS */
  } finally {
    cargando.value = false;
  }
}

onMounted(() => {
  // Push en vivo: cada evento del broker entra por el mismo WS del HMI.
  offWs = onMensaje((m) => {
    if ("snapshot" in m) return;
    if (eventos.value.some((e) => e.espacio === m.espacio && e.ts === m.ts)) return;
    eventos.value.unshift({ espacio: m.espacio, estado: m.estado, nodo: m.nodo, ts: m.ts });
  });
  void cargar(); // carga inicial: histórico de hoy desde SQLite
});
onUnmounted(() => offWs?.());

// ---------- Métricas en vivo ----------
const total = computed(() => props.bahias.length || 10);
const ocupados = computed(() => total.value - props.disponibles);
const porcentaje = computed(() =>
  total.value === 0 ? 0 : Math.round((ocupados.value / total.value) * 100));
const conDato = computed(() => props.bahias.filter((b) => b.ts !== null).length);

// Dos zonas por fila del patio (Norte = E01-E05, Sur = E06-E10)
const norte = computed(() => props.bahias.filter((b) => parseInt(b.id.slice(1), 10) <= 5));
const sur = computed(() => props.bahias.filter((b) => parseInt(b.id.slice(1), 10) > 5));

const norteOcup = computed(() => norte.value.filter((b) => b.estado === "OCUPADO").length);
const surOcup = computed(() => sur.value.filter((b) => b.estado === "OCUPADO").length);

const norteLibre = computed(() => norte.value.length - norteOcup.value);
const surLibre = computed(() => sur.value.length - surOcup.value);

// ---------- Datos derivados de los eventos reales de hoy ----------
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

// ---------- Geometría SVG ----------
const FW = 560, FH = 240, PL = 38, PR = 10, PT = 12, PB = 26;

/** Catmull-Rom → Bézier cúbico (curvas suaves tipo Recharts, sin Recharts). */
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
const areaSalidas = computed(
  () => `${pathSalidas.value} L ${flujoX(12)} ${baseY.value} L ${flujoX(0)} ${baseY.value} Z`);
const ticksFlujo = computed(() =>
  [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(MAX_FLUJO.value * f)));

// Barras por bahía
const MAX_ROT = computed(() =>
  Math.max(4, ...props.bahias.map((b) => rotaciones.value.get(b.id) ?? 0)));
const barras = computed(() => {
  const w = (FW - PL - PR) / (props.bahias.length || 1);
  return props.bahias.map((b, i) => {
    const rot = rotaciones.value.get(b.id) ?? 0;
    const h = (rot / MAX_ROT.value) * (FH - PT - PB);
    return {
      b,
      rot,
      x: PL + i * w + w * 0.2,
      ancho: w * 0.6,
      y: PT + (FH - PT - PB) - h,
      alto: h,
      cx: PL + i * w + w / 2,
      color:
        b.estado === "OCUPADO" ? "#ef4444" : b.estado === "LIBRE" ? "#10b981" : "#f59e0b",
    };
  });
});

// Donut de zonas
const DONA_R = 52;
const DONA_C = 2 * Math.PI * DONA_R;
const segmentosZona = computed(() => {
  const base = norte.value.length + sur.value.length || 1;
  const partes = [
    { valor: norteOcup.value, color: "#0284c7", titulo: `Norte ocupadas: ${norteOcup.value}` },
    { valor: norteLibre.value, color: "#bae6fd", titulo: `Norte libres: ${norteLibre.value}` },
    { valor: surOcup.value, color: "#7c3aed", titulo: `Sur ocupadas: ${surOcup.value}` },
    { valor: surLibre.value, color: "#ddd6fe", titulo: `Sur libres: ${surLibre.value}` },
  ];
  let acc = 0;
  return partes
    .filter((p) => p.valor > 0)
    .map((p) => {
      const largo = (p.valor / base) * DONA_C;
      const seg = {
        ...p,
        dash: `${Math.max(0.5, largo - 1)} ${DONA_C}`,
        offset: DONA_C / 4 - acc,
      };
      acc += largo;
      return seg;
    });
});

const NODO_COLORES = ["#059669", "#0284c7", "#d97706", "#7c3aed", "#64748b"];
</script>

<template>
  <div class="flex flex-col gap-4 w-full">
    <!-- Selector de gráfico + resumen -->
    <div class="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 pb-2.5">
      <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl flex-wrap">
        <button
          v-for="t in (['flujo','bahias','zonas','rendimiento'] as const)"
          :key="t"
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          :class="tab === t ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          @click="tab = t"
        >
          <svg v-if="t === 'flujo'" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          <svg v-else-if="t === 'bahias'" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
          <svg v-else-if="t === 'zonas'" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
          <svg v-else class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          <span>{{ t === 'flujo' ? 'Flujo Horario' : t === 'bahias' ? 'Uso por Bahía (E01-E10)' : t === 'zonas' ? 'Zonas Norte/Sur' : 'Rendimiento y Orígenes' }}</span>
        </button>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="text-[10px] font-bold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer uppercase tracking-wide"
          :class="cargando && 'animate-pulse text-emerald-600'"
          @click="cargar"
        >
          {{ cargando ? "Actualizando…" : "↻ Actualizar" }}
        </button>
        <span class="text-[11px] text-slate-500 font-semibold uppercase">Estado actual:</span>
        <span
          class="text-xs font-bold px-2.5 py-0.5 rounded-full"
          :class="disponibles === 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'"
        >
          {{ disponibles === 0 ? "AFORO MÁXIMO" : `${ocupados}/${total} OCUPADAS (${porcentaje}%)` }}
        </span>
      </div>
    </div>

    <!-- 1. FLUJO HORARIO (real: ingresos/salidas por hora del día) -->
    <div v-if="tab === 'flujo'" class="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <svg class="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
            Curva de Flujo Horario de Tráfico (Ingresos y Salidas)
          </h4>
          <p class="text-[11px] text-slate-500">
            Cambios de hoy registrados por los sensores y la portería ({{ eventos.length }} movimientos)
          </p>
        </div>
        <div class="flex items-center gap-3 text-xs font-medium">
          <span class="flex items-center gap-1.5 text-emerald-700"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Ingresos</span>
          <span class="flex items-center gap-1.5 text-sky-700"><span class="w-2.5 h-2.5 rounded-full bg-sky-500" /> Salidas</span>
        </div>
      </div>

      <svg viewBox="0 0 560 240" class="w-full h-64">
        <defs>
          <linearGradient id="gradIng" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stop-color="#10b981" stop-opacity="0.4" />
            <stop offset="95%" stop-color="#10b981" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="gradSal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stop-color="#0284c7" stop-opacity="0.4" />
            <stop offset="95%" stop-color="#0284c7" stop-opacity="0" />
          </linearGradient>
        </defs>
        <g v-for="(tick, i) in ticksFlujo" :key="`gy${i}`">
          <line :x1="PL" :y1="flujoY(tick)" :x2="FW - PR" :y2="flujoY(tick)" stroke="#e2e8f0" stroke-dasharray="3 3" />
          <text :x="PL - 6" :y="flujoY(tick) + 3" text-anchor="end" font-size="9" fill="#64748b">{{ tick }}</text>
        </g>
        <g v-for="(f, i) in flujo" :key="`x${i}`">
          <text v-if="i % 2 === 0" :x="flujoX(i)" :y="FH - 8" text-anchor="middle" font-size="9" fill="#64748b">{{ f.hora }}</text>
        </g>
        <path :d="areaIngresos" fill="url(#gradIng)" />
        <path :d="areaSalidas" fill="url(#gradSal)" />
        <path :d="pathIngresos" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" />
        <path :d="pathSalidas" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" />
        <g v-for="(f, i) in flujo" :key="`d${i}`">
          <circle :cx="flujoX(i)" :cy="flujoY(f.ingresos)" r="2.4" fill="#10b981">
            <title>{{ f.hora }} · Ingresos: {{ f.ingresos }} motos</title>
          </circle>
          <circle :cx="flujoX(i)" :cy="flujoY(f.salidas)" r="2.4" fill="#0284c7">
            <title>{{ f.hora }} · Salidas: {{ f.salidas }} motos</title>
          </circle>
        </g>
        <line :x1="PL" :y1="baseY" :x2="FW - PR" :y2="baseY" stroke="#cbd5e1" />
        <text v-if="!hayEventos" :x="FW / 2" :y="FH / 2" text-anchor="middle" font-size="11" fill="#94a3b8" font-weight="600">
          Sin eventos MQTT registrados hoy — publica una maniobra para poblar la curva
        </text>
      </svg>
    </div>

    <!-- 2. USO POR BAHÍA (real: ocupaciones de hoy + estado en vivo) -->
    <div v-if="tab === 'bahias'" class="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <svg class="w-4 h-4 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
            Rotación Diaria y Estado Actual de Plazas (E01 a E10)
          </h4>
          <p class="text-[11px] text-slate-500">
            Altura: veces ocupada hoy (eventos reales) · Color: estado en vivo
          </p>
        </div>
        <div class="flex items-center gap-3 text-xs font-medium">
          <span class="flex items-center gap-1.5 text-emerald-700"><span class="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Bahía Libre</span>
          <span class="flex items-center gap-1.5 text-red-700"><span class="w-2.5 h-2.5 rounded-sm bg-red-500" /> Bahía Ocupada</span>
          <span class="flex items-center gap-1.5 text-amber-700"><span class="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Sin Dato</span>
        </div>
      </div>

      <svg viewBox="0 0 560 240" class="w-full h-64">
        <g v-for="(tick, i) in [0, MAX_ROT / 2, MAX_ROT]" :key="`gyb${i}`">
          <line :x1="PL" :y1="flujoY(tick)" :x2="FW - PR" :y2="flujoY(tick)" stroke="#e2e8f0" stroke-dasharray="3 3" />
          <text :x="PL - 6" :y="flujoY(tick) + 3" text-anchor="end" font-size="9" fill="#64748b">{{ Math.round(tick) }}</text>
        </g>
        <g v-for="bar in barras" :key="bar.b.id">
          <rect
            :x="bar.x" :y="bar.y" :width="bar.ancho" :height="bar.alto"
            rx="4" :fill="bar.color" class="transition-all duration-500"
          >
            <title>Plaza {{ bar.b.id }} · Estado: {{ bar.b.estado }} · Ocupaciones hoy: {{ bar.rot }}</title>
          </rect>
          <text v-if="bar.rot > 0" :x="bar.cx" :y="bar.y - 4" text-anchor="middle" font-size="9" font-weight="800" :fill="bar.color">{{ bar.rot }}</text>
          <text :x="bar.cx" :y="FH - 8" text-anchor="middle" font-size="10" font-weight="bold" fill="#475569">{{ bar.b.id }}</text>
        </g>
        <text v-if="!hayEventos" :x="FW / 2" :y="FH / 2" text-anchor="middle" font-size="11" fill="#94a3b8" font-weight="600">
          Sin ocupaciones registradas hoy
        </text>
      </svg>
    </div>

    <!-- 3. ZONAS: FILA NORTE (E01-E05) VS FILA SUR (E06-E10) -->
    <div v-if="tab === 'zonas'" class="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <svg class="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          Ocupación por zona: fila Norte (E01-E05) y fila Sur (E06-E10)
        </h4>
        <p class="text-[11px] text-slate-500">Comparativo de ocupación y cupos remanentes por fila del patio</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div class="w-full flex items-center justify-center">
          <div class="relative">
            <svg viewBox="0 0 130 130" class="w-52 h-52">
              <circle cx="65" cy="65" :r="DONA_R" fill="none" stroke="#f8fafc" stroke-width="14" />
              <circle
                v-for="(s, i) in segmentosZona" :key="i"
                cx="65" cy="65" :r="DONA_R" fill="none"
                :stroke="s.color" stroke-width="14"
                :stroke-dasharray="s.dash" :stroke-dashoffset="s.offset"
                class="transition-all duration-500"
              >
                <title>{{ s.titulo }}</title>
              </circle>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span class="text-2xl font-black font-mono text-slate-900">{{ porcentaje }}%</span>
              <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Ocupación</span>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-2.5">
          <div class="p-3 rounded-xl bg-sky-50 border border-sky-200">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-sky-900 uppercase">Fila Norte</span>
              <span class="text-xs font-mono font-bold text-sky-700">{{ norteOcup }}/{{ norte.length }} Ocupadas</span>
            </div>
            <div class="w-full bg-sky-200 h-2 rounded-full overflow-hidden mt-2">
              <div
                class="bg-sky-600 h-full rounded-full transition-all"
                :style="{ width: `${(norteOcup / (norte.length || 1)) * 100}%` }"
              />
            </div>
            <div class="flex items-center justify-between text-[10px] text-sky-800 font-medium mt-1.5">
              <span>Plazas E01-E05</span>
              <span>{{ norteLibre }} plazas disponibles</span>
            </div>
          </div>

          <div class="p-3 rounded-xl bg-purple-50 border border-purple-200">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-purple-900 uppercase">Fila Sur</span>
              <span class="text-xs font-mono font-bold text-purple-700">{{ surOcup }}/{{ sur.length }} Ocupadas</span>
            </div>
            <div class="w-full bg-purple-200 h-2 rounded-full overflow-hidden mt-2">
              <div
                class="bg-purple-600 h-full rounded-full transition-all"
                :style="{ width: `${(surOcup / (sur.length || 1)) * 100}%` }"
              />
            </div>
            <div class="flex items-center justify-between text-[10px] text-purple-800 font-medium mt-1.5">
              <span>Plazas E06-E10</span>
              <span>{{ surLibre }} plazas disponibles</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. RENDIMIENTO: eventos por nodo real + KPIs reales -->
    <div v-if="tab === 'rendimiento'" class="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <svg class="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          Indicadores de Rendimiento y Balance por Nodo Publicador
        </h4>
        <p class="text-[11px] text-slate-500">
          Eventos de hoy agrupados por el nodo que publicó en el broker (portería, salida, operador, sensores)
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-3 rounded-xl bg-white border border-slate-200 flex flex-col gap-2">
          <span class="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 13 12 18 17 13" /><polyline points="7 6 12 11 17 6" /></svg>
            Cambios por origen (hoy)
          </span>
          <div v-if="porNodo.length" class="flex flex-col gap-2 mt-1">
            <div v-for="(n, i) in porNodo" :key="n.nodo" class="flex items-center gap-2">
              <span class="text-[10px] font-mono font-bold text-slate-600 w-20 truncate" :title="n.nodo">{{ n.nodo }}</span>
              <div class="flex-1 bg-slate-100 rounded-full h-3.5 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{ width: `${(n.n / maxNodo) * 100}%`, backgroundColor: NODO_COLORES[i % NODO_COLORES.length] }"
                />
              </div>
              <span class="text-[10px] font-mono font-bold text-slate-700 w-7 text-right">{{ n.n }}</span>
            </div>
          </div>
          <p v-else class="text-[11px] text-slate-400 mt-1">Sin eventos hoy todavía.</p>
        </div>

        <div class="grid grid-cols-2 gap-2.5">
          <div class="p-3 rounded-xl bg-white border border-slate-200 flex flex-col justify-between">
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Ocupación</span>
            <span
              class="text-xl font-extrabold font-mono my-1"
              :style="{ color: porcentaje > 80 ? '#ef4444' : porcentaje > 50 ? '#f59e0b' : '#10b981' }"
            >{{ porcentaje }}%</span>
            <span class="text-[10px] text-slate-500 font-medium">{{ ocupados }} de {{ total }} plazas</span>
          </div>
          <div class="p-3 rounded-xl bg-white border border-slate-200 flex flex-col justify-between">
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Rotaciones Hoy</span>
            <span class="text-xl font-extrabold text-emerald-600 font-mono my-1">{{ rotacionesHoy }}</span>
            <span class="text-[10px] text-slate-500 font-medium">Ocupaciones reales del día</span>
          </div>
          <div class="p-3 rounded-xl bg-white border border-slate-200 flex flex-col justify-between">
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Cambios de hoy</span>
            <span class="text-xl font-extrabold text-sky-600 font-mono my-1">{{ eventos.length }}</span>
            <span class="text-[10px] text-slate-500 font-medium">Movimientos registrados</span>
          </div>
          <div class="p-3 rounded-xl bg-white border border-slate-200 flex flex-col justify-between">
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Plazas reportando</span>
            <span class="text-xl font-extrabold text-indigo-600 font-mono my-1">{{ conDato }}/{{ total }}</span>
            <span class="text-[10px] text-slate-500 font-medium">Plazas con telemetría viva</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="ultimaCarga" class="text-[10px] text-slate-400 font-mono text-right">
      Actualizado a las {{ new Date(ultimaCarga).toLocaleTimeString("es-CO", { hour12: false }) }}
    </div>
  </div>
</template>
