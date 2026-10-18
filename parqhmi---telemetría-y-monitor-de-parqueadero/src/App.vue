<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { EspacioInfo, AnimacionMotoActiva, EstadoTalanquera, NotificacionHMI } from './types/parqueadero';
import { mqttHub } from './services/mqttSimulationHub';
import UserDisplay from './components/UserDisplay.vue';
import OperatorPanel from './components/OperatorPanel.vue';

const espacios = ref<EspacioInfo[]>([]);
const disponiblesCount = ref<number>(0);
const barrierState = ref<EstadoTalanquera>('cerrada');
const talanqueraBloqueada = ref<boolean>(false);
const animacionesActivas = ref<AnimacionMotoActiva[]>([]);
const animacionActiva = ref<AnimacionMotoActiva | null>(null);
const notificacionActual = ref<NotificacionHMI | null>(null);

const isOperatorOpen = ref<boolean>(false);
const isAutoSimRunning = ref<boolean>(false);

const horaActual = ref<string>('');
const fechaActual = ref<string>('');

let clockInterval: number | null = null;
let unsubEspacios: (() => void) | null = null;
let unsubDisponibles: (() => void) | null = null;
let unsubBarrier: (() => void) | null = null;
let unsubAnimacion: (() => void) | null = null;
let unsubNotif: (() => void) | null = null;

function updateClock() {
  const now = new Date();
  horaActual.value = now.toLocaleTimeString('es-CO', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  fechaActual.value = now.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase();
}

onMounted(() => {
  updateClock();
  clockInterval = window.setInterval(updateClock, 1000);

  // Suscripción al hub
  unsubEspacios = mqttHub.subscribeEspacios((val) => {
    espacios.value = val;
  });

  unsubDisponibles = mqttHub.subscribeDisponibles((val) => {
    disponiblesCount.value = val;
  });

  unsubBarrier = mqttHub.subscribeBarrier((val) => {
    barrierState.value = val;
    talanqueraBloqueada.value = mqttHub.talanqueraBloqueada;
  });

  unsubAnimacion = mqttHub.subscribeAnimaciones((val) => {
    animacionesActivas.value = val;
    animacionActiva.value = val.length > 0 ? val[0] : null;
  });

  unsubNotif = mqttHub.subscribeNotificaciones((val) => {
    notificacionActual.value = val;
  });

  // Iniciar simulación automática fluida de fondo
  mqttHub.startAutoSimulation(8000);
  isAutoSimRunning.value = true;
});

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval);
  unsubEspacios?.();
  unsubDisponibles?.();
  unsubBarrier?.();
  unsubAnimacion?.();
  unsubNotif?.();
  mqttHub.stopAutoSimulation();
});

function toggleAutoSim() {
  if (isAutoSimRunning.value) {
    mqttHub.stopAutoSimulation();
    isAutoSimRunning.value = false;
  } else {
    mqttHub.startAutoSimulation(7500);
    isAutoSimRunning.value = true;
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-800 p-3 sm:p-5 flex flex-col gap-4 font-sans">
    
    <!-- 1. PANTALLA PRINCIPAL DEL USUARIO (KIOSK / DISPLAY DE ENTRADA) -->
    <UserDisplay
      :espacios="espacios"
      :disponibles-count="disponiblesCount"
      :total-espacios="espacios.length || 10"
      :barrier-state="barrierState"
      :talanquera-bloqueada="talanqueraBloqueada"
      :animaciones-activas="animacionesActivas"
      :animacion-activa="animacionActiva"
      :notificacion-actual="notificacionActual"
      :hora-actual="horaActual"
      :fecha-actual="fechaActual"
      @abrir-operador="isOperatorOpen = true"
      @select-espacio="() => {}"
    />

    <!-- 2. CONSOLA DE CASETA / OPERADOR (MODAL DE GESTIÓN Y BLOQUEO) -->
    <OperatorPanel
      v-if="isOperatorOpen"
      :espacios="espacios"
      :disponibles-count="disponiblesCount"
      :barrier-state="barrierState"
      :talanquera-bloqueada="talanqueraBloqueada"
      :is-auto-sim-running="isAutoSimRunning"
      @cerrar="isOperatorOpen = false"
      @toggle-auto-sim="toggleAutoSim"
    />

  </div>
</template>
