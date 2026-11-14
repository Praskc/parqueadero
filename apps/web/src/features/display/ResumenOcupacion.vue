<script setup lang="ts">
import { tema } from "../../shared/theme";
import type { AnimacionMoto, Bahia } from "../../types/hmi";
import {
  UMBRAL_ALERTA_PCT,
  UMBRAL_CRITICO_PCT,
  usePanelPublico,
} from "./usePanelPublico";

const props = defineProps<{
  bahias: Bahia[];
  animaciones: AnimacionMoto[];
  total: number;
  conectado: boolean;
  bloqueada: boolean;
  ultimaActualizacion: number | null;
  ahora: number;
}>();

const {
  enCaminoGlobal,
  sinSenalGlobal,
  pctOcupacion,
  pctEnCamino,
  porcentajeColor,
  porcentajeBarColor,
  estamentoLista,
  esSectorAtenuado,
  esSectorDestacado,
  claseTextoTono,
  claseBarraTono,
} = usePanelPublico(props);
</script>

<template>
  <section
    aria-label="Ocupación por sector y estado general del parqueadero"
    class="w-full rounded-2xl border overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 transition-colors duration-200"
    :class="tema === 'oscuro'
      ? 'bg-[#0f172a] border-slate-800 shadow-lg'
      : 'bg-white border-slate-300 shadow-sm'"
  >
    <div
      v-for="(item, idx) in estamentoLista"
      :key="item.key"
      class="px-3.5 py-2.5 sm:px-4 sm:py-2.5 flex flex-col justify-between gap-1.5 transition-colors min-w-0"
      :class="[
        esSectorAtenuado(item.libres, item.sinSenal)
          ? (tema === 'oscuro' ? 'bg-[#0b1120] border-slate-800' : 'bg-[#f1f5f9] border-slate-200')
          : esSectorDestacado(item.key, item.libres)
            ? (tema === 'oscuro'
              ? 'bg-emerald-950/35 ring-2 ring-inset ring-[#4ade80] border-slate-800'
              : 'bg-emerald-50/70 ring-2 ring-inset ring-[#15803d] border-slate-200')
            : (tema === 'oscuro'
              ? 'border-slate-800'
              : 'border-slate-200'),
        idx === 0 ? 'border-b lg:border-b-0 sm:border-r' : '',
        idx === 1 ? 'border-b lg:border-b-0 lg:border-r' : '',
        idx === 2 ? 'border-b sm:border-b-0 sm:border-r' : '',
      ]"
    >
      <div class="min-w-0">
        <span
          class="block text-[13px] sm:text-sm font-bold font-headline tracking-tight leading-tight break-words"
          :class="esSectorAtenuado(item.libres, item.sinSenal)
            ? (tema === 'oscuro' ? 'text-[#cbd5e1]' : 'text-[#475569]')
            : (tema === 'oscuro' ? 'text-white' : 'text-slate-900')"
        >
          Ocupación parqueadero {{ item.nombre }}
        </span>
        <span
          class="block text-[11px] sm:text-xs font-medium font-body leading-tight mt-0.5 tabular-nums break-words"
          :class="esSectorAtenuado(item.libres, item.sinSenal)
            ? (tema === 'oscuro' ? 'text-[#94a3b8]' : 'text-[#475569]')
            : (tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600')"
        >
          Bahías {{ item.rango }}
        </span>
      </div>

      <div class="flex items-baseline justify-between gap-2 flex-wrap">
        <div class="flex items-baseline gap-1">
          <span
            class="text-xl sm:text-2xl font-headline font-black leading-none tabular-nums"
            :class="esSectorAtenuado(item.libres, item.sinSenal)
              ? (tema === 'oscuro' ? 'text-[#cbd5e1]' : 'text-[#475569]')
              : claseTextoTono(item.tono)"
          >
            {{ item.libres }}
          </span>
          <span
            class="text-[11px] sm:text-xs font-semibold font-body"
            :class="esSectorAtenuado(item.libres, item.sinSenal)
              ? (tema === 'oscuro' ? 'text-[#94a3b8]' : 'text-[#475569]')
              : (tema === 'oscuro' ? 'text-slate-200' : 'text-slate-700')"
          >
            {{ item.libres === 1 ? "libre" : "libres" }}
          </span>
        </div>

        <div class="text-right">
          <span
            class="block text-[11px] sm:text-xs font-label font-bold leading-tight tabular-nums"
            :class="esSectorAtenuado(item.libres, item.sinSenal)
              ? (tema === 'oscuro' ? 'text-[#94a3b8]' : 'text-[#475569]')
              : claseTextoTono(item.tono)"
          >
            {{ item.sinSenal ? "Sin señal" : `${item.pct}% ocupado` }}
          </span>
          <span
            v-if="!item.sinSenal && item.enCamino > 0"
            class="block text-[11px] font-semibold font-body leading-tight tabular-nums"
            :class="tema === 'oscuro' ? 'text-[#facc15]' : 'text-[#8a6d00]'"
          >
            {{ item.enCamino }} en camino
          </span>
        </div>
      </div>

      <div
        class="h-1.5 w-full rounded-full overflow-hidden flex"
        :class="tema === 'oscuro' ? 'bg-slate-800' : 'bg-slate-200'"
      >
        <div
          class="h-full shrink-0 transition-all duration-500"
          :class="esSectorAtenuado(item.libres, item.sinSenal)
            ? (tema === 'oscuro' ? 'bg-slate-600' : 'bg-slate-400')
            : claseBarraTono(item.tono)"
          :style="{ width: `${item.sinSenal ? 0 : item.pct}%` }"
        />
        <div
          v-if="!item.sinSenal && item.pctCamino > 0"
          class="h-full shrink-0 transition-all duration-500"
          :class="tema === 'oscuro' ? 'bg-[#fde047]' : 'bg-[#facc15]'"
          :style="{ width: `${item.pctCamino}%` }"
        />
      </div>
    </div>

    <div class="px-3.5 py-2.5 sm:px-4 sm:py-2.5 flex flex-col justify-between gap-1.5 min-w-0">
      <div class="min-w-0">
        <span
          class="block text-[13px] sm:text-sm font-bold font-headline tracking-tight leading-tight break-words"
          :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'"
        >
          Ocupación general
        </span>
        <div
          class="mt-0.5 text-[11px] sm:text-xs font-medium font-body flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-tight tabular-nums"
          :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600'"
        >
          <span>Amarillo: {{ UMBRAL_ALERTA_PCT }}%</span>
          <span aria-hidden="true">·</span>
          <span>Crítico: {{ UMBRAL_CRITICO_PCT }}%</span>
        </div>
      </div>

      <div class="flex items-baseline justify-between gap-2 flex-wrap">
        <div class="flex items-baseline gap-1">
          <span class="text-xl sm:text-2xl font-headline font-black leading-none tabular-nums" :class="porcentajeColor">
            {{ sinSenalGlobal ? "Sin dato" : `${pctOcupacion}%` }}
          </span>
          <span
            v-if="!sinSenalGlobal"
            class="text-[11px] sm:text-xs font-semibold font-body"
            :class="tema === 'oscuro' ? 'text-slate-200' : 'text-slate-700'"
          >
            ocupado
          </span>
        </div>
        <span
          v-if="!sinSenalGlobal && enCaminoGlobal > 0"
          class="text-[11px] sm:text-xs font-semibold font-body leading-tight tabular-nums"
          :class="tema === 'oscuro' ? 'text-[#facc15]' : 'text-[#8a6d00]'"
        >
          +{{ enCaminoGlobal }} en camino
        </span>
      </div>

      <div
        role="progressbar"
        aria-label="Ocupación general del parqueadero"
        :aria-valuenow="sinSenalGlobal ? 0 : pctOcupacion"
        aria-valuemin="0"
        aria-valuemax="100"
        class="h-1.5 w-full rounded-full overflow-hidden flex"
        :class="tema === 'oscuro' ? 'bg-slate-800' : 'bg-slate-200'"
      >
        <div
          class="h-full shrink-0 transition-all duration-500"
          :class="porcentajeBarColor"
          :style="{ width: `${sinSenalGlobal ? 0 : pctOcupacion}%` }"
        />
        <div
          v-if="!sinSenalGlobal && pctEnCamino > 0"
          class="h-full shrink-0 transition-all duration-500"
          :class="tema === 'oscuro' ? 'bg-[#fde047]' : 'bg-[#facc15]'"
          :style="{ width: `${pctEnCamino}%` }"
        />
      </div>
    </div>
  </section>
</template>
