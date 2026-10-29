<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import PantallaUsuario from "./features/display/PantallaUsuario.vue";
import PanelOperador from "./features/operador/PanelOperador.vue";
import {
  animaciones,
  bloqueada,
  talanquera,
  talanqueraSentido,
} from "./features/parqueadero/simulacionVial";
import { useParqueadero } from "./features/parqueadero/useParqueadero";
import { inicializarAccesibilidad } from "./shared/accesibilidad";
import { tema } from "./shared/theme";
import BotonVolverArriba from "./shared/ui/BotonVolverArriba.vue";
import PieInstitucional from "./shared/ui/PieInstitucional.vue";

// Estado en tiempo real alimentado por WebSocket y MQTT.
const { conectado, bahias, disponibles, ultimaActualizacion, total } = useParqueadero();

const operadorAbierto = ref(false);
const horaActual = ref("");
const fechaActual = ref("");
const ahora = ref(Date.now());
let clock: number | undefined;

function updateClock() {
  const now = new Date();
  horaActual.value = now.toLocaleTimeString("es-CO", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  fechaActual.value = now
    .toLocaleDateString("es-CO", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
  ahora.value = now.getTime();
}

onMounted(() => {
  inicializarAccesibilidad();
  updateClock();
  clock = window.setInterval(updateClock, 1000);
});

onUnmounted(() => {
  clearInterval(clock);
});
</script>

<template>
  <div
    class="w-full flex flex-col font-body transition-colors duration-200"
    :class="tema === 'oscuro' ? 'text-slate-100' : 'text-slate-800'"
  >
    <!-- Enlace de salto directo para navegación por teclado y lectores de pantalla (WCAG 2.4.1) -->
    <a
      href="#plano-parqueadero"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-xl focus:font-bold focus:text-sm focus:bg-[#15803d] focus:text-white focus:shadow-lg"
    >
      Saltar al plano del parqueadero
    </a>

    <!-- Tablero operativo completo en el primer alto de pantalla (100dvh) con barra superior institucional de ancho completo -->
    <div class="min-h-dvh w-full bg-campus-surface flex flex-col">
      <PantallaUsuario
        :bahias="bahias"
        :disponibles="disponibles"
        :total="total"
        :talanquera="talanquera"
        :talanquera-sentido="talanqueraSentido"
        :bloqueada="bloqueada"
        :animaciones="animaciones"
        :hora-actual="horaActual"
        :fecha-actual="fechaActual"
        :conectado="conectado"
        :ultima-actualizacion="ultimaActualizacion"
        :ahora="ahora"
        :operador-abierto="operadorAbierto"
        @abrir-operador="operadorAbierto = true"
      />
    </div>

    <!-- Pie institucional visible únicamente al hacer scroll hacia abajo -->
    <PieInstitucional />

    <!-- Botón flotante para volver arriba cuando el scroll llega al final del documento -->
    <BotonVolverArriba />

    <PanelOperador
      v-if="operadorAbierto"
      :bahias="bahias"
      :disponibles="disponibles"
      :animaciones="animaciones"
      :ahora="ahora"
      @cerrar="operadorAbierto = false"
    />
  </div>
</template>
