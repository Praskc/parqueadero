<script setup lang="ts">
import { computed } from "vue";
import { ESTAMENTOS } from "../../config/bahias";
import { tema } from "../../shared/theme";
import type { Bahia } from "../../types/hmi";
import { comando } from "../parqueadero/simulacionVial";

const props = defineProps<{
  bahias: Bahia[];
  enCaminoIds: string[];
  total: number;
}>();

const bahiasEnCamino = computed(() => new Set(props.enCaminoIds));

const bahiasPorEstamento = computed(() =>
  ESTAMENTOS.map((est) => {
    const celdas = props.bahias.filter((b) => b.estamento === est.key);
    const libres = celdas.filter(
      (b) => b.estado === "LIBRE" && !bahiasEnCamino.value.has(b.id),
    ).length;
    return { ...est, celdas, libres };
  }),
);
</script>

<template>
  <div
    class="xl:col-span-7 rounded-xl border p-4 flex flex-col gap-3.5"
    :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'"
  >
    <div class="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b" :class="tema === 'oscuro' ? 'border-slate-800' : 'border-slate-200'">
      <div>
        <h4 class="text-xs font-bold font-headline uppercase tracking-wider" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">
          Control manual por estamento ({{ total }} plazas)
        </h4>
        <p class="text-xs" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
          Pulsa cualquier plaza para alternar su estado en el bus MQTT
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="min-h-[44px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer"
          :class="tema === 'oscuro'
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-950/70'
            : 'bg-emerald-50 border-emerald-300 text-[#15803d] hover:bg-emerald-100'"
          @click="comando({ tipo: 'liberarTodo' })"
        >
          Liberar todas
        </button>
        <button
          type="button"
          class="min-h-[44px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer"
          :class="tema === 'oscuro'
            ? 'bg-red-950/40 border-red-800 text-red-300 hover:bg-red-950/70'
            : 'bg-red-50 border-red-300 text-[#b91c1c] hover:bg-red-100'"
          @click="comando({ tipo: 'llenarTodo' })"
        >
          Ocupar todas
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-3.5">
      <div
        v-for="grupo in bahiasPorEstamento"
        :key="grupo.key"
        class="flex flex-col gap-2"
      >
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-baseline gap-2 min-w-0">
            <span class="text-xs font-bold font-headline" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">
              {{ grupo.label }}
            </span>
            <span class="text-[11px] font-mono" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
              Bahías {{ grupo.rango }}
            </span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-xs font-mono font-bold tabular-nums" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-700'">
              {{ grupo.libres }}/10 libres
            </span>
            <button
              type="button"
              class="min-h-[44px] px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer"
              :class="grupo.libres > 0
                ? (tema === 'oscuro'
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200')
                : (tema === 'oscuro'
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-950/70'
                  : 'bg-emerald-50 border-emerald-300 text-[#15803d] hover:bg-emerald-100')"
              @click="comando({ tipo: 'forzarEstamento', estamento: grupo.key, estado: grupo.libres > 0 ? 'OCUPADO' : 'LIBRE' })"
            >
              {{ grupo.libres > 0 ? "Ocupar fila" : "Liberar fila" }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
          <button
            v-for="b in grupo.celdas"
            :key="b.id"
            type="button"
            :disabled="bahiasEnCamino.has(b.id)"
            :title="bahiasEnCamino.has(b.id)
              ? `Plaza ${b.id} reservada: hay un vehículo en camino`
              : `Alternar estado de la plaza ${b.id}`"
            class="min-h-[48px] py-1.5 px-1 rounded-lg border text-center transition-colors flex flex-col items-center justify-center gap-0.5 min-w-0"
            :class="bahiasEnCamino.has(b.id)
              ? (tema === 'oscuro'
                ? 'bg-amber-950/40 border-amber-700 text-amber-300 cursor-not-allowed'
                : 'bg-amber-50 border-amber-300 text-[#8a6d00] cursor-not-allowed')
              : b.estado === 'LIBRE'
                ? (tema === 'oscuro'
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-950/70 cursor-pointer'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100 cursor-pointer')
                : b.estado === 'OCUPADO'
                  ? (tema === 'oscuro'
                    ? 'bg-red-950/40 border-red-800 text-red-300 hover:bg-red-950/70 cursor-pointer'
                    : 'bg-red-50 border-red-300 text-red-950 hover:bg-red-100 cursor-pointer')
                  : (tema === 'oscuro'
                    ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 cursor-pointer'
                    : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 cursor-pointer')"
            @click="comando({ tipo: 'forzarEstado', espacioId: b.id })"
          >
            <span class="font-mono font-bold text-xs tabular-nums leading-none">{{ b.id }}</span>
            <span class="text-[9px] font-bold uppercase tracking-tight leading-none mt-1">
              {{ bahiasEnCamino.has(b.id)
                ? "Camino"
                : b.estado === "LIBRE" ? "Libre" : b.estado === "OCUPADO" ? "Ocup." : "S/D" }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
