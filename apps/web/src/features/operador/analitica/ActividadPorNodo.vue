<script setup lang="ts">
import { tema } from "../../../shared/theme";

interface NodoActividad {
  nodo: string;
  n: number;
}

defineProps<{
  porNodo: NodoActividad[];
  maxNodo: number;
  ultimaCarga: number | null;
}>();
</script>

<template>
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
</template>
