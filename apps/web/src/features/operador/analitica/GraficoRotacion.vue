<script setup lang="ts">
import { computed } from "vue";
import { tema } from "../../../shared/theme";
import type { Bahia } from "../../../types/hmi";

const props = defineProps<{
  bahias: Bahia[];
  rotaciones: Map<string, number>;
}>();

const FW = 620;
const FH = 205;
const PL = 34;
const PR = 12;
const PT = 14;
const PB = 26;

const MAX_ROT = computed(() =>
  Math.max(4, ...props.bahias.map((b) => props.rotaciones.get(b.id) ?? 0)),
);
const rotY = computed(
  () => (v: number) => PT + (FH - PT - PB) * (1 - v / MAX_ROT.value),
);
const barras = computed(() => {
  const n = props.bahias.length || 30;
  const w = (FW - PL - PR) / n;
  return props.bahias.map((b, i) => {
    const rot = props.rotaciones.get(b.id) ?? 0;
    const h = Math.max(
      rot > 0 ? 3 : 1.5,
      (rot / MAX_ROT.value) * (FH - PT - PB),
    );
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
        b.estado === "OCUPADO"
          ? "#dc2626"
          : b.estado === "LIBRE"
            ? "#15803d"
            : "#64748b",
    };
  });
});
</script>

<template>
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
</template>
