<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { tokenAdmin } from "../../services/adminToken";
import { tema } from "../../shared/theme";
import type { AnimacionMoto, Bahia } from "../../types/hmi";
import { bloqueada, detenerAutoSimulacion, talanquera } from "../parqueadero/simulacionVial";
import AccesoOperador from "./AccesoOperador.vue";
import AnaliticaOperador from "./AnaliticaOperador.vue";
import ControlPorteria from "./ControlPorteria.vue";
import LibroRegistros from "./LibroRegistros.vue";
import MatrizPlazas from "./MatrizPlazas.vue";
import RielOperador from "./RielOperador.vue";
import { SECCIONES, type TabOperador } from "./secciones";
import TelemetriaSensores from "./TelemetriaSensores.vue";
import { useOperador } from "./useOperador";

const props = defineProps<{
  bahias: Bahia[];
  disponibles: number;
  animaciones: AnimacionMoto[];
  ahora: number;
}>();

const emit = defineEmits<{ (e: "cerrar"): void }>();

const tabActivo = ref<TabOperador>("control");
const desbloqueado = ref(tokenAdmin() !== null);

const {
  bahiasEnCamino,
  enCamino,
  libresEfectivos,
  estaLleno,
  total,
  ocupados,
  porcentaje,
} = useOperador(props);

const enCaminoIds = computed(() => [...bahiasEnCamino.value]);
const seccionActual = computed(
  () => SECCIONES.find((s) => s.id === tabActivo.value) ?? SECCIONES[0],
);

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") emit("cerrar");
}

onMounted(() => document.addEventListener("keydown", handleKeydown));
onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown);
  detenerAutoSimulacion();
});
</script>

<template>
  <div
    class="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-2 sm:p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="titulo-consola-operador"
    @click.self="emit('cerrar')"
  >
    <AccesoOperador
      v-if="!desbloqueado"
      @desbloqueado="desbloqueado = true"
      @cerrar="emit('cerrar')"
    />

    <div
      v-else
      class="superficie-accesible rounded-2xl border max-w-6xl w-full lg:h-[min(86dvh,780px)] max-h-[92dvh] flex flex-col lg:flex-row shadow-2xl overflow-hidden transition-colors"
      :class="tema === 'oscuro'
        ? 'bg-[#0f172a] border-slate-800 text-slate-100'
        : 'bg-white border-slate-300 text-slate-800'"
    >
      <RielOperador
        v-model:tab-activo="tabActivo"
        :libres-efectivos="libresEfectivos"
        :en-camino="enCamino"
        :ocupados="ocupados"
        :porcentaje="porcentaje"
        :total="total"
        :bloqueada="bloqueada"
        :talanquera="talanquera"
        @cerrar="emit('cerrar')"
      />

      <div class="flex-1 flex flex-col min-w-0 min-h-0">
        <div
          class="px-4 py-3 sm:px-6 border-b flex items-center justify-between gap-3 shrink-0"
          :class="tema === 'oscuro' ? 'border-slate-800' : 'border-slate-200'"
        >
          <div class="min-w-0">
            <h3 class="text-sm sm:text-base font-bold font-headline uppercase tracking-wide truncate" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">
              {{ seccionActual.label }}
            </h3>
            <p class="text-xs truncate" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
              {{ seccionActual.desc }}
            </p>
          </div>

          <button
            type="button"
            class="hidden lg:inline-flex min-h-[44px] px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer items-center gap-1.5 shrink-0"
            :class="tema === 'oscuro'
              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100'
              : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'"
            @click="emit('cerrar')"
          >
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Cerrar panel</span>
          </button>
        </div>

        <div class="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0">
          <div v-show="tabActivo === 'control'" class="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            <ControlPorteria
              :bahias="bahias"
              :en-camino-ids="enCaminoIds"
              :esta-lleno="estaLleno"
              :libres-efectivos="libresEfectivos"
            />
            <MatrizPlazas
              :bahias="bahias"
              :en-camino-ids="enCaminoIds"
              :total="total"
            />
          </div>

          <div v-show="tabActivo === 'graficos'">
            <AnaliticaOperador
              :bahias="bahias"
              :disponibles="disponibles"
              :en-camino="enCaminoIds"
            />
          </div>

          <div v-show="tabActivo === 'telemetria'">
            <TelemetriaSensores
              :bahias="bahias"
              :animaciones="animaciones"
              :ahora="ahora"
            />
          </div>

          <div v-show="tabActivo === 'eventos'">
            <LibroRegistros />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
