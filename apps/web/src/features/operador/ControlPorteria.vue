<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { tema } from "../../shared/theme";
import type { Bahia } from "../../types/hmi";
import {
  autoSimulacion,
  bloqueada,
  comando,
  talanquera,
  type Comando,
} from "../parqueadero/simulacionVial";

const props = defineProps<{
  bahias: Bahia[];
  enCaminoIds: string[];
  estaLleno: boolean;
  libresEfectivos: number;
}>();

const emit = defineEmits<{ (e: "aviso", mensaje: string): void }>();

const selectedTargetBay = ref<string>("auto");
const avisoOperador = ref<string | null>(null);
let avisoTimer: number | undefined;

const bahiasEnCamino = computed(() => new Set(props.enCaminoIds));

function avisarOperador(mensaje: string) {
  avisoOperador.value = mensaje;
  if (avisoTimer) window.clearTimeout(avisoTimer);
  avisoTimer = window.setTimeout(() => (avisoOperador.value = null), 6000);
}

onUnmounted(() => {
  if (avisoTimer) window.clearTimeout(avisoTimer);
});

function handleIngreso(origen?: "norte" | "sur") {
  const target =
    selectedTargetBay.value === "auto" ? undefined : selectedTargetBay.value;
  // La plaza objetivo no puede recibir un segundo vehículo mientras el primero
  // sigue en camino: el sensor aún no confirma la ocupación.
  if (target) {
    if (bahiasEnCamino.value.has(target)) {
      avisarOperador(
        `La plaza ${target} tiene un vehículo en camino. Espera la confirmación del sensor o elige otra plaza.`,
      );
      return;
    }
    const bahia = props.bahias.find((b) => b.id === target);
    if (!bahia || bahia.estado !== "LIBRE") {
      avisarOperador(
        `La plaza ${target} no está libre (${bahia?.estado ?? "sin dato"}). Elige una plaza disponible.`,
      );
      return;
    }
  }
  comando({ tipo: "ingreso", espacioId: target, origen });
}

function handleSimultaneas() {
  comando({ tipo: "ingreso", espacioId: undefined, origen: "norte" });
  setTimeout(() => comando({ tipo: "ingreso", espacioId: undefined, origen: "sur" }), 250);
}

function handleMotoEnEspera() {
  if (!props.estaLleno) return;
  comando({ tipo: "ingreso", espacioId: undefined, origen: undefined, forzarEspera: true });
}

function handleSalida() {
  const target =
    selectedTargetBay.value === "auto" ? undefined : selectedTargetBay.value;
  comando({ tipo: "salida", espacioId: target });
}
</script>

<template>
  <div class="xl:col-span-5 flex flex-col gap-3.5">
    <div
      class="rounded-xl p-4 border transition-colors flex flex-col gap-3"
      :class="bloqueada
        ? (tema === 'oscuro' ? 'bg-red-950/30 border-red-800' : 'bg-red-50 border-red-300')
        : (tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/70 border-slate-200')"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h4 class="text-xs font-bold font-headline uppercase tracking-wider" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">
            Barrera vehicular (talanquera)
          </h4>
          <p class="text-xs mt-1 leading-relaxed" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600'">
            {{ bloqueada
              ? "Asegurada en posición cerrada. Ingreso restringido."
              : "Apertura automática al detectar paso autorizado." }}
          </p>
        </div>
        <span
          class="font-mono text-xs font-bold uppercase shrink-0"
          :class="bloqueada
            ? (tema === 'oscuro' ? 'text-red-400' : 'text-[#b91c1c]')
            : (tema === 'oscuro' ? 'text-emerald-400' : 'text-[#15803d]')"
        >
          {{ bloqueada ? "0° Bloqueada" : talanquera === "abierta" ? "-85° Abierta" : "Activa" }}
        </span>
      </div>

      <button
        type="button"
        class="w-full min-h-[44px] px-4 py-2.5 rounded-xl font-bold font-headline text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2 text-white"
        :class="bloqueada ? 'bg-[#15803d] hover:bg-emerald-800' : 'bg-[#dc2626] hover:bg-red-700'"
        @click="comando({ tipo: 'toggleBloqueo' })"
      >
        <span>{{ bloqueada ? "Desbloquear talanquera" : "Bloquear talanquera" }}</span>
      </button>
    </div>

    <div
      class="rounded-xl p-4 border flex flex-col gap-3"
      :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'"
    >
      <div class="flex items-center justify-between gap-2">
        <h4 class="text-xs font-bold font-headline uppercase tracking-wider" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">
          Maniobras de tráfico en vivo
        </h4>
        <div class="flex items-center gap-1.5 text-xs">
          <label for="select-bahia-destino" class="sr-only">Plaza objetivo</label>
          <select
            id="select-bahia-destino"
            v-model="selectedTargetBay"
            class="min-h-[44px] rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer"
            :class="tema === 'oscuro'
              ? 'bg-slate-900 border-slate-700 text-slate-200'
              : 'bg-slate-50 border-slate-300 text-slate-800'"
          >
            <option value="auto">Plaza automática</option>
            <option
              v-for="b in bahias"
              :key="b.id"
              :value="b.id"
              :disabled="bahiasEnCamino.has(b.id)"
            >
              {{ b.id }} ({{ bahiasEnCamino.has(b.id) ? "en camino" : b.estado }})
            </option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          :disabled="bloqueada"
          class="min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center"
          :class="bloqueada
            ? (tema === 'oscuro' ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300')
            : 'bg-[#15803d] hover:bg-emerald-800 text-white cursor-pointer'"
          @click="handleIngreso('norte')"
        >
          Ingreso carril norte
        </button>
        <button
          type="button"
          :disabled="bloqueada"
          class="min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center border"
          :class="bloqueada
            ? (tema === 'oscuro' ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300')
            : (tema === 'oscuro' ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 cursor-pointer' : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 cursor-pointer')"
          @click="handleIngreso('sur')"
        >
          Ingreso carril sur
        </button>
        <button
          type="button"
          :disabled="bloqueada"
          class="min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center border"
          :class="bloqueada
            ? (tema === 'oscuro' ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300')
            : (tema === 'oscuro' ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700 cursor-pointer' : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300 cursor-pointer')"
          @click="handleSimultaneas"
        >
          Llegada simultánea
        </button>
        <button
          type="button"
          class="min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center cursor-pointer border"
          :class="tema === 'oscuro'
            ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
            : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-900'"
          @click="handleSalida"
        >
          Salida de vehículo
        </button>
      </div>

      <p
        v-if="avisoOperador"
        role="alert"
        class="rounded-lg border px-3 py-2 text-xs font-semibold leading-snug"
        :class="tema === 'oscuro'
          ? 'bg-amber-950/50 border-amber-700 text-amber-200'
          : 'bg-amber-50 border-amber-300 text-[#8a6d00]'"
      >
        {{ avisoOperador }}
      </p>

      <button
        type="button"
        :disabled="bloqueada || !estaLleno"
        class="w-full min-h-[44px] py-2 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center text-center"
        :class="bloqueada || !estaLleno
          ? (tema === 'oscuro' ? 'bg-slate-800/70 text-slate-500 cursor-not-allowed border border-slate-800' : 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200')
          : 'bg-[#facc15] hover:bg-[#eab308] text-slate-950 border border-[#ca8a04] cursor-pointer'"
        @click="handleMotoEnEspera"
      >
        {{ estaLleno ? "Encolar vehículo en espera frente a portería" : `Simular cola en portería (requiere aforo lleno: ${libresEfectivos} libres)` }}
      </button>
    </div>

    <div
      class="flex items-center justify-between gap-3 p-3.5 rounded-xl border"
      :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/70 border-slate-200'"
    >
      <div class="min-w-0">
        <div class="text-xs font-bold uppercase" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">
          Simulación continua MQTT
        </div>
        <div class="text-xs" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
          Ingresos y salidas automáticas cada 7,5 s
        </div>
      </div>
      <button
        type="button"
        role="switch"
        :aria-checked="autoSimulacion"
        class="min-h-[44px] px-4 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0 border"
        :class="autoSimulacion
          ? 'bg-[#15803d] border-[#15803d] text-white'
          : (tema === 'oscuro' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100')"
        @click="comando({ tipo: 'toggleAutoSimulacion' })"
      >
        {{ autoSimulacion ? "Activa" : "Pausada" }}
      </button>
    </div>
  </div>
</template>
