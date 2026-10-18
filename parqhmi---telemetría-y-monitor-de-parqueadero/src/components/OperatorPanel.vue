<script setup lang="ts">
import { ref, computed } from 'vue';
import type { EspacioInfo, EstadoTalanquera } from '../types/parqueadero';
import { mqttHub } from '../services/mqttSimulationHub';

const props = defineProps<{
  espacios: EspacioInfo[];
  disponiblesCount: number;
  barrierState: EstadoTalanquera;
  talanqueraBloqueada: boolean;
  isAutoSimRunning: boolean;
}>();

const emit = defineEmits<{
  (e: 'cerrar'): void;
  (e: 'toggleAutoSim'): void;
}>();

const selectedTargetBay = ref<string>('auto');

const estaLleno = computed(() => props.disponiblesCount === 0);

function toggleBloqueo() {
  mqttHub.setBloqueoTalanquera(!props.talanqueraBloqueada);
}

function handleIngreso(origen?: 'norte' | 'sur') {
  const target = selectedTargetBay.value === 'auto' ? undefined : selectedTargetBay.value;
  mqttHub.triggerMotorcycleEntry(target, origen);
}

function handleSimultaneas() {
  mqttHub.triggerSimultaneousEntries();
}

function handleMotoEnEspera() {
  if (!estaLleno.value) return;
  mqttHub.triggerMotoEnEspera();
}

function handleSalida() {
  const target = selectedTargetBay.value === 'auto' ? undefined : selectedTargetBay.value;
  mqttHub.triggerMotorcycleExit(target);
}

function toggleEspacio(id: string) {
  const target = props.espacios.find((e) => e.id === id);
  if (!target) return;
  const next = target.estado === 'LIBRE' ? 'OCUPADO' : 'LIBRE';
  mqttHub.publishEstado(id, next, 'operador_caseta');
}

function resetAllFree() {
  props.espacios.forEach((esp) => {
    mqttHub.publishEstado(esp.id, 'LIBRE', 'operador_caseta');
  });
}

function fillAll() {
  props.espacios.forEach((esp) => {
    mqttHub.publishEstado(esp.id, 'OCUPADO', 'operador_caseta');
  });
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
    <div class="bg-white border border-slate-300 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800">
      
      <!-- Cabecera de Caseta -->
      <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-orange-100 border border-orange-300 text-orange-600 flex items-center justify-center font-bold text-sm">
            OP
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-900 tracking-wide">
              CONSOLA DE CONTROL · CASETA DE OPERADOR
            </h2>
            <p class="text-xs text-slate-500">
              Supervisión de acceso, bloqueo físico de talanquera y pruebas
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="emit('cerrar')"
          class="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs text-slate-700 font-semibold transition-colors cursor-pointer"
        >
          Volver a Pantalla
        </button>
      </div>

      <!-- Contenido de Control -->
      <div class="p-5 overflow-y-auto space-y-6">
        
        <!-- 1. ACCIÓN PRINCIPAL: BLOQUEO DE TALANQUERA -->
        <div class="rounded-xl p-4 border transition-all"
             :class="talanqueraBloqueada ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full" :class="talanqueraBloqueada ? 'bg-red-600 animate-pulse' : 'bg-emerald-600'" />
                <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900">
                  CONTROL DE BARRERA (TALANQUERA)
                </h3>
              </div>
              <p class="text-xs text-slate-600 mt-1 max-w-md">
                {{ talanqueraBloqueada 
                    ? 'La talanquera está bloqueada en posición cerrada cruzando la calzada. El paso de vehículos está suspendido y la pantalla de usuario advierte el bloqueo.' 
                    : 'La talanquera opera en modo automático normal al detectar vehículos en la entrada.' }}
              </p>
            </div>

            <!-- Botón Grande de Bloqueo -->
            <button
              type="button"
              @click="toggleBloqueo"
              class="px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
              :class="talanqueraBloqueada 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20' 
                : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'"
            >
              {{ talanqueraBloqueada ? 'DESBLOQUEAR TALANQUERA' : 'BLOQUEAR TALANQUERA' }}
            </button>
          </div>
        </div>

        <!-- 2. SIMULACIÓN MANUAL DE TRÁFICO -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">
              Pruebas de Tráfico Vehicular
            </h3>
            <span v-if="talanqueraBloqueada" class="text-xs text-red-600 font-semibold">
              * Ingreso inhabilitado por bloqueo de talanquera
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              @click="handleIngreso('norte')"
              :disabled="talanqueraBloqueada"
              class="py-2.5 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              :class="talanqueraBloqueada
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'"
            >
              <span>↑ INGRESO CALLE NORTE</span>
            </button>

            <button
              type="button"
              @click="handleIngreso('sur')"
              :disabled="talanqueraBloqueada"
              class="py-2.5 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              :class="talanqueraBloqueada
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20'"
            >
              <span>↓ INGRESO CALLE SUR</span>
            </button>

            <button
              type="button"
              @click="handleSimultaneas"
              :disabled="talanqueraBloqueada"
              class="py-2.5 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              :class="talanqueraBloqueada
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'"
            >
              <span>⚡ SIMULTÁNEAS (NORTE + SUR)</span>
            </button>

            <button
              type="button"
              @click="handleMotoEnEspera"
              :disabled="talanqueraBloqueada || !estaLleno"
              class="py-2.5 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              :class="talanqueraBloqueada || !estaLleno
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30 cursor-pointer animate-pulse ring-2 ring-amber-400'"
              :title="!estaLleno ? 'Solo disponible cuando el parqueadero esté lleno (0 cupos)' : 'Simular moto esperando cupo libre en portería'"
            >
              <span>⏳ MOTO EN ESPERA {{ !estaLleno ? '(SOLO CON LLENO)' : '(ACTIVO)' }}</span>
            </button>
          </div>

          <!-- Mensaje de estado explicativo para Moto en Espera -->
          <div
            v-if="!estaLleno"
            class="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2"
          >
            <span>
              * Botón <strong>Moto en Espera</strong> inhabilitado: hay <strong>{{ disponiblesCount }} cupos libres</strong>. Una moto solo espera cuando el aforo está al 100%.
            </span>
            <button
              type="button"
              @click="fillAll"
              class="text-xs font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer shrink-0"
            >
              Llenar Plazas
            </button>
          </div>
          <div
            v-else
            class="text-[11px] text-amber-900 bg-amber-50 border border-amber-300 rounded-xl p-2.5 font-medium flex items-center gap-2"
          >
            <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
            <span>
              ✓ <strong>Aforo Completo (0 cupos):</strong> Botón activo. Pulsa para simular la moto que llega a portería y espera a que un puesto se desocupe.
            </span>
          </div>

          <div class="pt-1">
            <button
              type="button"
              @click="handleSalida"
              class="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-900 text-white transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-slate-800/20"
            >
              <span>➔ SALIDA DE MOTO (HACIA PENDÓN)</span>
            </button>
          </div>

          <div class="flex items-center justify-between text-xs pt-1">
            <span class="text-slate-600">Destino de la maniobra:</span>
            <select
              v-model="selectedTargetBay"
              class="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-blue-700 font-bold focus:outline-hidden cursor-pointer shadow-xs"
            >
              <option value="auto">Automático (Primera disponible)</option>
              <option v-for="esp in espacios" :key="esp.id" :value="esp.id">
                Plaza {{ esp.id }} ({{ esp.estado }})
              </option>
            </select>
          </div>
        </div>

        <!-- 3. GESTIÓN INDIVIDUAL DE PLAZAS -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700">
              Forzar Estado de Plazas
            </h3>
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="resetAllFree"
                class="text-[11px] font-semibold text-emerald-600 hover:underline cursor-pointer"
              >
                Liberar todas
              </button>
              <span>·</span>
              <button
                type="button"
                @click="fillAll"
                class="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
              >
                Llenar todas
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 w-full">
            <button
              v-for="esp in espacios"
              :key="esp.id"
              type="button"
              @click="toggleEspacio(esp.id)"
              class="p-2 rounded-lg border text-center transition-colors cursor-pointer flex flex-col items-center gap-1 min-w-0 overflow-hidden shadow-xs"
              :class="esp.estado === 'LIBRE' 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100' 
                : 'bg-red-50 border-red-300 text-red-800 hover:bg-red-100'"
            >
              <span class="font-extrabold text-xs truncate">{{ esp.id }}</span>
              <span class="text-[9px] font-bold uppercase truncate">
                {{ esp.estado }}
              </span>
            </button>
          </div>
        </div>

        <!-- 4. SIMULACIÓN CONTINUA -->
        <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <div class="text-xs font-bold text-slate-800 uppercase">
              Simulación Autónoma de Demostración
            </div>
            <div class="text-[11px] text-slate-500">
              Genera llegadas y salidas de motos periódicas
            </div>
          </div>

          <button
            type="button"
            @click="emit('toggleAutoSim')"
            class="px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            :class="isAutoSimRunning ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'"
          >
            {{ isAutoSimRunning ? 'ACTIVADA' : 'DESACTIVADA' }}
          </button>
        </div>

      </div>

      <!-- Pie de Caseta -->
      <div class="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
        <span>Talanquera: <strong :class="talanqueraBloqueada ? 'text-red-600' : 'text-emerald-600'">{{ talanqueraBloqueada ? 'BLOQUEADA' : 'EN SERVICIO' }}</strong></span>
        <button
          type="button"
          @click="emit('cerrar')"
          class="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-medium transition-colors cursor-pointer text-xs"
        >
          Cerrar Consola
        </button>
      </div>

    </div>
  </div>
</template>
