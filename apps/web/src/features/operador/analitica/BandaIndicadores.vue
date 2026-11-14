<script setup lang="ts">
import { computed } from "vue";
import { tema } from "../../../shared/theme";

const props = defineProps<{
  porcentaje: number;
  ocupados: number;
  total: number;
  rotacionesHoy: number;
  conDato: number;
  movimientos: number;
  cargando: boolean;
}>();

const emit = defineEmits<{ (e: "recargar"): void }>();

const tonoOcupacion = computed(() => {
  if (props.porcentaje >= 85)
    return tema.value === "oscuro" ? "text-red-400" : "text-[#b91c1c]";
  if (props.porcentaje >= 65)
    return tema.value === "oscuro" ? "text-[#facc15]" : "text-[#8a6d00]";
  return tema.value === "oscuro" ? "text-emerald-400" : "text-[#15803d]";
});
</script>

<template>
  <div
    class="rounded-xl border grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x"
    :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800 divide-slate-800' : 'bg-white border-slate-200 divide-slate-200'"
  >
    <div class="p-3.5 flex flex-col justify-between">
      <span class="text-[11px] font-bold uppercase tracking-wide" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600'">Ocupación actual</span>
      <div class="flex items-baseline gap-1.5 mt-1">
        <span class="text-xl font-bold font-mono tabular-nums" :class="tonoOcupacion">
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
        <span class="text-xl font-bold font-mono tabular-nums mt-1 block" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">{{ movimientos }}</span>
      </div>
      <button
        type="button"
        :disabled="cargando"
        class="min-h-[40px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer shrink-0"
        :class="tema === 'oscuro'
          ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400'
          : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-[#15803d]'"
        @click="emit('recargar')"
      >
        {{ cargando ? "Cargando…" : "Actualizar" }}
      </button>
    </div>
  </div>
</template>
