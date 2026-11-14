<script setup lang="ts">
import { tema } from "../../shared/theme";
import type { Bahia } from "../../types/hmi";
import ActividadPorNodo from "./analitica/ActividadPorNodo.vue";
import BandaIndicadores from "./analitica/BandaIndicadores.vue";
import ComposicionDonut from "./analitica/ComposicionDonut.vue";
import DisponibilidadEstamento from "./analitica/DisponibilidadEstamento.vue";
import GraficoFlujoHorario from "./analitica/GraficoFlujoHorario.vue";
import GraficoRotacion from "./analitica/GraficoRotacion.vue";
import PermanenciaMedia from "./analitica/PermanenciaMedia.vue";
import { useAnalitica } from "./analitica/useAnalitica";

const props = defineProps<{
  bahias: Bahia[];
  disponibles: number;
  enCamino?: string[];
}>();

const {
  eventos,
  cargando,
  errorCarga,
  ultimaCarga,
  cargar,
  total,
  ocupados,
  porcentaje,
  conDato,
  estamentos,
  flujo,
  rotaciones,
  porNodo,
  maxNodo,
  rotacionesHoy,
  hayEventos,
  donut,
  permanencia,
  horaPico,
  formatoMinutos,
} = useAnalitica(props);
</script>

<template>
  <div class="flex flex-col gap-4 w-full">
    <BandaIndicadores
      :porcentaje="porcentaje"
      :ocupados="ocupados"
      :total="total"
      :rotaciones-hoy="rotacionesHoy"
      :con-dato="conDato"
      :movimientos="eventos.length"
      :cargando="cargando"
      @recargar="cargar"
    />

    <div
      v-if="errorCarga"
      class="rounded-xl p-3 border flex items-center justify-between gap-3 text-xs"
      :class="tema === 'oscuro' ? 'bg-yellow-950/30 border-yellow-700 text-yellow-200' : 'bg-yellow-50 border-yellow-300 text-yellow-950'"
    >
      <span>{{ errorCarga }}</span>
      <button type="button" class="font-bold underline shrink-0 cursor-pointer" @click="cargar">Reintentar</button>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <GraficoFlujoHorario
        :flujo="flujo"
        :hora-pico="horaPico"
        :hay-eventos="hayEventos"
        :cargando="cargando"
      />
      <DisponibilidadEstamento :estamentos="estamentos" />
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <GraficoRotacion :bahias="bahias" :rotaciones="rotaciones" />
      <ActividadPorNodo
        :por-nodo="porNodo"
        :max-nodo="maxNodo"
        :ultima-carga="ultimaCarga"
      />
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-12 gap-4">
      <ComposicionDonut :donut="donut" :porcentaje="porcentaje" :total="total" />
      <PermanenciaMedia
        :global="permanencia.global"
        :muestras="permanencia.muestras"
        :zonas="permanencia.zonas"
        :maximo="permanencia.maximo"
        :formato-minutos="formatoMinutos"
      />
    </div>
  </div>
</template>
