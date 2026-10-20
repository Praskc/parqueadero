<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import PantallaUsuario from "./features/display/PantallaUsuario.vue";
import PanelOperador from "./features/operador/PanelOperador.vue";
import PrototipoKiosco from "./prototypes/PrototipoKiosco.vue";
import Accesibilidad from "./shared/ui/Accesibilidad.vue";
import { useParqueadero } from "./features/parqueadero/useParqueadero";
import {
  animaciones,
  autoSimulacion,
  bloqueada,
  notificacion,
  talanquera,
  toggleAutoSimulacion,
} from "./features/parqueadero/simulacionVial";
import { tema, toggleTema } from "./shared/theme";

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
  // Iniciar flujo vial continuo para visualizar motos entrando, parqueando y saliendo
  if (!autoSimulacion.value) {
    window.setTimeout(() => {
      if (!autoSimulacion.value) toggleAutoSimulacion();
    }, 1000);
  }
});
onUnmounted(() => {
  clearInterval(clock);
  clearInterval(tick);
});
</script>

<template>
  <PrototipoKiosco v-if="esPrototipo" />
  <div
    class="min-h-screen bg-dot-grid py-4 px-3 sm:px-6 flex flex-col gap-4 font-body transition-colors duration-200"
    :class="tema === 'oscuro' ? 'text-slate-100' : 'text-slate-800'"
  >
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

    <!-- Controles globales: FUERA de las tarjetas -->
    <div class="fixed top-3 right-3 sm:top-4 sm:right-6 z-50 flex items-center gap-2 sm:gap-2.5">
      <!-- Consola de vigilancia: con ícono y texto, fuera de la tarjeta -->
      <button
        type="button"
        @click="operadorAbierto = true"
        class="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold font-headline uppercase tracking-wider shadow-md transition-all cursor-pointer border select-none backdrop-blur-md"
        :class="tema === 'oscuro'
          ? 'bg-slate-900/90 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 hover:border-slate-500'
          : 'bg-white/95 border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-400'"
        title="Abrir consola de vigilancia y control"
      >
        <svg class="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>Vigilancia</span>
      </button>

      <!-- Botón de Modo Oscuro / Modo Claro: SOLO el icono, fuera de la tarjeta -->
      <button
        type="button"
        @click="toggleTema"
        class="p-2 sm:p-2.5 rounded-xl shadow-md transition-all cursor-pointer border select-none backdrop-blur-md flex items-center justify-center"
        :class="tema === 'oscuro'
          ? 'bg-slate-900/90 border-slate-700 text-amber-300 hover:bg-slate-800 hover:border-amber-400'
          : 'bg-white/95 border-slate-300 text-slate-800 hover:bg-slate-50 hover:border-slate-400'"
        :title="tema === 'oscuro' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'"
        :aria-label="tema === 'oscuro' ? 'Activar modo claro' : 'Activar modo oscuro'"
      >
        <svg v-if="tema === 'oscuro'" class="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        <svg v-else class="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>
    </div>

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
        class="fixed bottom-4 right-4 z-[60] max-w-xs w-[calc(100vw-2rem)] rounded-xl border p-3 shadow-2xl transition-colors duration-200"
        :class="[
          tema === 'oscuro' ? 'bg-[#0f172a]' : 'bg-white shadow-xl',
          {
            'border-emerald-600': notificacion.tipo === 'ingreso' || notificacion.tipo === 'sistema',
            'border-red-600': notificacion.tipo === 'bloqueo' || notificacion.tipo === 'alerta',
            'border-[#b45309]': notificacion.tipo === 'lleno',
            'border-slate-700': tema === 'oscuro' && notificacion.tipo === 'salida',
            'border-slate-300': tema === 'claro' && notificacion.tipo === 'salida',
          }
        ]"
      >
        <div class="text-[11px] font-bold uppercase tracking-wider font-headline" :class="{
          'text-emerald-500': notificacion.tipo === 'ingreso' || notificacion.tipo === 'sistema',
          'text-red-500': notificacion.tipo === 'bloqueo' || notificacion.tipo === 'alerta',
          'text-[#b45309]': notificacion.tipo === 'lleno',
          'text-slate-500': notificacion.tipo === 'salida',
        }">
          {{ notificacion.titulo }}
        </div>
        <div class="text-xs mt-0.5 font-body" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600'">
          {{ notificacion.mensaje }}
        </div>
      </div>
    </Transition>
  </div>
</template>
