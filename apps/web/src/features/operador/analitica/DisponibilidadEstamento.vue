<script setup lang="ts">
import { tema } from "../../../shared/theme";

interface EstamentoAnalitica {
  nombre: string;
  rango: string;
  total: number;
  ocupadas: number;
  libres: number;
  pct: number;
}

defineProps<{ estamentos: EstamentoAnalitica[] }>();

function barraColorPct(pct: number): string {
  if (pct >= 85)
    return tema.value === "oscuro" ? "bg-red-500" : "bg-[#dc2626]";
  if (pct >= 65)
    return tema.value === "oscuro" ? "bg-[#facc15]" : "bg-[#eab308]";
  return tema.value === "oscuro" ? "bg-emerald-500" : "bg-[#15803d]";
}
</script>

<template>
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
</template>
