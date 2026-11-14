<script setup lang="ts">
import { logMqtt } from "../../services/logMqtt";
import { tema } from "../../shared/theme";
import UnisucreLogo from "../../shared/ui/UnisucreLogo.vue";
import type { EstadoTalanquera } from "../../types/hmi";
import { SECCIONES, type TabOperador } from "./secciones";

const props = defineProps<{
  tabActivo: TabOperador;
  libresEfectivos: number;
  enCamino: number;
  ocupados: number;
  porcentaje: number;
  total: number;
  bloqueada: boolean;
  talanquera: EstadoTalanquera;
}>();

const emit = defineEmits<{
  (e: "update:tabActivo", tab: TabOperador): void;
  (e: "cerrar"): void;
}>();
</script>

<template>
  <aside
    class="lg:w-[252px] shrink-0 border-b lg:border-b-0 lg:border-r flex flex-col justify-between"
    :class="tema === 'oscuro' ? 'bg-slate-900/75 border-slate-800' : 'bg-slate-50 border-slate-200'"
  >
    <div class="p-4 flex flex-col gap-4">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-3 min-w-0">
          <UnisucreLogo size="38" class="w-9 h-auto shrink-0" />
          <div class="min-w-0">
            <h2
              id="titulo-consola-operador"
              class="text-sm font-bold font-headline tracking-wide uppercase leading-tight truncate"
              :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'"
            >
              Panel de Control
            </h2>
            <p class="text-[11px] font-semibold truncate mt-0.5" :class="tema === 'oscuro' ? 'text-[#4ade80]' : 'text-[#15803d]'">
              Campus Puerta Roja
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Cerrar panel de control"
          class="lg:hidden w-[44px] h-[44px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0"
          :class="tema === 'oscuro'
            ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'"
          @click="emit('cerrar')"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <nav aria-label="Secciones del panel de control" class="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
        <button
          v-for="sec in SECCIONES"
          :key="sec.id"
          type="button"
          :aria-current="tabActivo === sec.id ? 'page' : undefined"
          class="min-h-[44px] px-3 py-2 rounded-xl text-left text-xs font-bold transition-colors flex items-center gap-2.5 cursor-pointer shrink-0 lg:w-full border"
          :class="tabActivo === sec.id
            ? (tema === 'oscuro'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700'
              : 'bg-white text-[#15803d] border-[#15803d] shadow-xs')
            : (tema === 'oscuro'
              ? 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/70'
              : 'border-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-200/60')"
          @click="emit('update:tabActivo', sec.id)"
        >
          <svg v-if="sec.id === 'control'" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M4 20v-8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8" /><path d="M2 14h20" /><path d="M9 10V6a3 3 0 0 1 6 0v4" />
          </svg>
          <svg v-else-if="sec.id === 'graficos'" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M3 3v18h18" /><path d="M7 14l4-4 4 3 5-6" />
          </svg>
          <svg v-else-if="sec.id === 'telemetria'" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
          </svg>
          <svg v-else class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span class="truncate">{{ sec.label }}</span>
          <span
            v-if="sec.id === 'eventos' && logMqtt.length"
            class="ml-auto font-mono text-[11px] tabular-nums opacity-80"
          >
            {{ logMqtt.length }}
          </span>
        </button>
      </nav>
    </div>

    <div
      class="hidden lg:flex flex-col gap-2.5 p-4 border-t text-xs"
      :class="tema === 'oscuro' ? 'border-slate-800' : 'border-slate-200'"
    >
      <div class="flex items-baseline justify-between gap-2">
        <span :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">Cupos libres</span>
        <strong class="font-mono tabular-nums" :class="tema === 'oscuro' ? 'text-[#4ade80]' : 'text-[#15803d]'">
          {{ props.libresEfectivos }} / {{ props.total }}
        </strong>
      </div>
      <div v-if="props.enCamino > 0" class="flex items-baseline justify-between gap-2">
        <span :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">En camino</span>
        <strong class="font-mono tabular-nums" :class="tema === 'oscuro' ? 'text-[#facc15]' : 'text-[#8a6d00]'">
          {{ props.enCamino }}
        </strong>
      </div>
      <div class="flex items-baseline justify-between gap-2">
        <span :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">Ocupación</span>
        <strong
          class="font-mono tabular-nums"
          :class="props.porcentaje >= 85
            ? (tema === 'oscuro' ? 'text-[#f87171]' : 'text-[#b91c1c]')
            : props.porcentaje >= 65
              ? (tema === 'oscuro' ? 'text-[#facc15]' : 'text-[#8a6d00]')
              : (tema === 'oscuro' ? 'text-slate-200' : 'text-slate-800')"
        >
          {{ props.ocupados }} ({{ props.porcentaje }}%)
        </strong>
      </div>
      <div class="flex items-baseline justify-between gap-2">
        <span :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">Talanquera</span>
        <strong
          class="font-mono uppercase"
          :class="props.bloqueada
            ? (tema === 'oscuro' ? 'text-red-400' : 'text-[#b91c1c]')
            : props.talanquera === 'abierta' || props.talanquera === 'abriendo'
              ? (tema === 'oscuro' ? 'text-emerald-400' : 'text-[#15803d]')
              : (tema === 'oscuro' ? 'text-slate-200' : 'text-slate-800')"
        >
          {{ props.bloqueada ? "Bloqueada" : props.talanquera === "abierta" ? "Abierta" : props.talanquera === "abriendo" ? "Abriendo" : props.talanquera === "cerrando" ? "Cerrando" : "Cerrada" }}
        </strong>
      </div>
    </div>
  </aside>
</template>
