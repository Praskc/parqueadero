<script setup lang="ts">
import { tema } from "../../../shared/theme";
import { DONUT_R } from "./useAnalitica";

interface SegmentoDonut {
  key: string;
  label: string;
  n: number;
  color: string;
  pct: number;
  dash: string;
  offset: string;
}

defineProps<{
  donut: SegmentoDonut[];
  porcentaje: number;
  total: number;
}>();
</script>

<template>
  <div
    class="xl:col-span-5 border rounded-xl p-4 flex flex-col gap-3"
    :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'"
  >
    <div>
      <h4 class="text-xs font-bold font-headline uppercase tracking-wider" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">
        Composición de las 30 plazas
      </h4>
      <p class="text-xs" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
        Estado instantáneo, incluidos vehículos en camino
      </p>
    </div>

    <div class="flex items-center justify-center gap-5 my-auto flex-wrap sm:flex-nowrap">
      <svg
        viewBox="0 0 140 140"
        class="w-[128px] h-[128px] shrink-0"
        role="img"
        :aria-label="`Ocupación actual ${porcentaje}% de ${total} plazas`"
      >
        <g transform="rotate(-90 70 70)">
          <circle cx="70" cy="70" :r="DONUT_R" fill="none" :stroke="tema === 'oscuro' ? '#1e293b' : '#e2e8f0'" stroke-width="17" />
          <circle
            v-for="s in donut"
            :key="s.key"
            cx="70"
            cy="70"
            :r="DONUT_R"
            fill="none"
            :stroke="s.color"
            stroke-width="17"
            :stroke-dasharray="s.dash"
            :stroke-dashoffset="s.offset"
            class="transition-all duration-500"
          />
        </g>
        <text
          x="70" y="66" text-anchor="middle" font-size="25" font-weight="800"
          font-family="'Chakra Petch', 'Barlow', sans-serif"
          :fill="tema === 'oscuro' ? '#f8fafc' : '#0f172a'"
        >
          {{ porcentaje }}%
        </text>
        <text
          x="70" y="84" text-anchor="middle" font-size="9" font-weight="700" letter-spacing="0.6"
          :fill="tema === 'oscuro' ? '#94a3b8' : '#64748b'"
        >
          OCUPADO
        </text>
      </svg>

      <ul class="flex flex-col gap-2 min-w-0 w-full sm:w-auto">
        <li v-for="s in donut" :key="s.key" class="flex items-center gap-2 text-xs min-w-0">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: s.color }" aria-hidden="true" />
          <span class="flex-1 truncate" :class="tema === 'oscuro' ? 'text-slate-200' : 'text-slate-700'">{{ s.label }}</span>
          <span class="font-mono font-bold tabular-nums w-7 text-right" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">{{ s.n }}</span>
          <span class="font-mono tabular-nums text-[11px] w-9 text-right" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-500'">{{ s.pct }}%</span>
        </li>
      </ul>
    </div>
  </div>
</template>
