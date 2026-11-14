<script setup lang="ts">
import { tema } from "../../../shared/theme";

interface ZonaPermanencia {
  key: string;
  label: string;
  color: string;
  minutos: number | null;
  muestras: number;
}

defineProps<{
  global: number | null;
  muestras: number;
  zonas: ZonaPermanencia[];
  maximo: number;
  formatoMinutos: (min: number | null) => string;
}>();
</script>

<template>
  <div
    class="xl:col-span-7 border rounded-xl p-4 flex flex-col gap-3"
    :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'"
  >
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h4 class="text-xs font-bold font-headline uppercase tracking-wider" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">
          Permanencia media por visita
        </h4>
        <p class="text-xs" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
          Tiempo entre la ocupación y la liberación registrada por el sensor
        </p>
      </div>
      <div class="text-right shrink-0">
        <span
          class="block text-2xl font-black font-mono tabular-nums leading-none"
          :class="global === null
            ? (tema === 'oscuro' ? 'text-slate-500' : 'text-slate-400')
            : (tema === 'oscuro' ? 'text-white' : 'text-slate-900')"
        >
          {{ formatoMinutos(global) }}
        </span>
        <span class="text-[11px]" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
          {{ muestras }} {{ muestras === 1 ? "visita medida" : "visitas medidas" }}
        </span>
      </div>
    </div>

    <div v-if="muestras > 0" class="flex flex-col gap-3 my-auto">
      <div v-for="z in zonas" :key="z.key" class="flex flex-col gap-1">
        <div class="flex items-baseline justify-between gap-2 text-xs">
          <span class="font-semibold" :class="tema === 'oscuro' ? 'text-slate-200' : 'text-slate-700'">{{ z.label }}</span>
          <span class="font-mono font-bold tabular-nums" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">
            {{ formatoMinutos(z.minutos) }}
          </span>
        </div>
        <div class="w-full h-2.5 rounded-full overflow-hidden" :class="tema === 'oscuro' ? 'bg-slate-800' : 'bg-slate-100'">
          <div
            class="h-full rounded-full transition-all duration-500"
            :style="{ width: `${z.minutos === null ? 0 : Math.max(4, (z.minutos / maximo) * 100)}%`, backgroundColor: z.color }"
          />
        </div>
      </div>
    </div>

    <p v-else class="text-xs my-auto" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
      Aún no hay pares ocupación → liberación hoy. La métrica aparece cuando un vehículo sale de una plaza.
    </p>
  </div>
</template>
