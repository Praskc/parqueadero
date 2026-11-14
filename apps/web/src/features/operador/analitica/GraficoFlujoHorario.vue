<script setup lang="ts">
import { computed } from "vue";
import { tema } from "../../../shared/theme";

interface PuntoFlujo {
  hora: string;
  ingresos: number;
  salidas: number;
}

const props = defineProps<{
  flujo: PuntoFlujo[];
  horaPico: string | null;
  hayEventos: boolean;
  cargando: boolean;
}>();

const FW = 620;
const FH = 205;
const PL = 34;
const PR = 12;
const PT = 14;
const PB = 26;

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
  Math.max(4, ...props.flujo.flatMap((f) => [f.ingresos, f.salidas])),
);
const flujoX = (i: number) => PL + (i * (FW - PL - PR)) / 12;
const flujoY = computed(
  () => (v: number) => PT + (FH - PT - PB) * (1 - v / MAX_FLUJO.value),
);
const ptsIngresos = computed(() =>
  props.flujo.map(
    (f, i) => [flujoX(i), flujoY.value(f.ingresos)] as [number, number],
  ),
);
const ptsSalidas = computed(() =>
  props.flujo.map(
    (f, i) => [flujoX(i), flujoY.value(f.salidas)] as [number, number],
  ),
);
const pathIngresos = computed(() => suavizar(ptsIngresos.value));
const pathSalidas = computed(() => suavizar(ptsSalidas.value));
const baseY = computed(() => flujoY.value(0));
const areaIngresos = computed(
  () =>
    `${pathIngresos.value} L ${flujoX(12)} ${baseY.value} L ${flujoX(0)} ${baseY.value} Z`,
);
const ticksFlujo = computed(() =>
  [0, 0.5, 1].map((f) => Math.round(MAX_FLUJO.value * f)),
);
</script>

<template>
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
      <div class="flex items-center gap-3 text-xs font-semibold">
        <span
          v-if="horaPico"
          class="px-2 py-0.5 rounded-full border tabular-nums"
          :class="tema === 'oscuro'
            ? 'border-emerald-700 bg-emerald-950/50 text-emerald-300'
            : 'border-emerald-300 bg-emerald-50 text-[#15803d]'"
        >
          Hora pico {{ horaPico }}
        </span>
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
</template>
