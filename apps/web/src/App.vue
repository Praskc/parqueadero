<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import PantallaUsuario from "./features/display/PantallaUsuario.vue";
import PanelOperador from "./features/operador/PanelOperador.vue";
import PrototipoKiosco from "./prototypes/PrototipoKiosco.vue";
import Accesibilidad from "./shared/ui/Accesibilidad.vue";
import { useParqueadero } from "./features/parqueadero/useParqueadero";
import {
  animaciones,
  bloqueada,
  notificacion,
  talanquera,
} from "./features/parqueadero/simulacionVial";

// Superficie de prototipado (skill `prototype`): /prototypes/* solo en dev.
const esPrototipo = location.pathname.startsWith("/prototypes");

// Estado real (WS ← backend ← MQTT) + capa de simulación vial (importada por efectos)
const { conectado, bahias, disponibles, total } = useParqueadero();

const operadorAbierto = ref(false);
const horaActual = ref("");
const fechaActual = ref("");
const ahora = ref(Date.now());
let clock: number | undefined;
let tick: number | undefined;

function updateClock() {
  const now = new Date();
  horaActual.value = now.toLocaleTimeString("es-CO", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  fechaActual.value = now.toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase();
  ahora.value = now.getTime();
}

onMounted(() => {
  updateClock();
  clock = window.setInterval(updateClock, 1000);
  tick = window.setInterval(() => (ahora.value = Date.now()), 5000);
});
onUnmounted(() => {
  clearInterval(clock);
  clearInterval(tick);
});
</script>

<template>
  <PrototipoKiosco v-if="esPrototipo" />
  <div class="min-h-screen bg-slate-100 text-slate-800 py-3 sm:py-4 flex flex-col gap-3 font-sans">
    <PantallaUsuario
      :bahias="bahias"
      :disponibles="disponibles"
      :total="total"
      :talanquera="talanquera"
      :bloqueada="bloqueada"
      :animaciones="animaciones"
      :hora-actual="horaActual"
      :fecha-actual="fechaActual"
      :conectado="conectado"
      :ahora="ahora"
      @abrir-operador="operadorAbierto = true"
    />

    <PanelOperador
      v-if="operadorAbierto"
      :bahias="bahias"
      :disponibles="disponibles"
      :animaciones="animaciones"
      :ahora="ahora"
      @cerrar="operadorAbierto = false"
    />

    <!-- FAB de accesibilidad: flotante, global, fuera de los cards -->
    <Accesibilidad />

    <!-- Notificación (toast) -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-3"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="notificacion"
        :key="notificacion.id"
        class="fixed bottom-4 right-4 z-[60] max-w-xs w-[calc(100vw-2rem)] rounded-xl border p-3 shadow-lg bg-white"
        :class="{
          'border-emerald-300': notificacion.tipo === 'ingreso' || notificacion.tipo === 'sistema',
          'border-red-300': notificacion.tipo === 'bloqueo' || notificacion.tipo === 'alerta',
          'border-amber-300': notificacion.tipo === 'lleno',
          'border-slate-300': notificacion.tipo === 'salida',
        }"
      >
        <div class="text-[11px] font-bold uppercase tracking-wider" :class="{
          'text-emerald-700': notificacion.tipo === 'ingreso' || notificacion.tipo === 'sistema',
          'text-red-700': notificacion.tipo === 'bloqueo' || notificacion.tipo === 'alerta',
          'text-amber-700': notificacion.tipo === 'lleno',
          'text-slate-600': notificacion.tipo === 'salida',
        }">
          {{ notificacion.titulo }}
        </div>
        <div class="text-xs text-slate-600 mt-0.5">{{ notificacion.mensaje }}</div>
      </div>
    </Transition>
  </div>
</template>
