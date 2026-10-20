<script setup lang="ts">
import { computed, ref } from "vue";
import type { AnimacionMoto, Bahia } from "../../types/hmi";
import { guardarToken, limpiarToken, tokenAdmin } from "../../services/adminToken";
import { verificarToken } from "../../services/api";
import { logMqtt, ultimoNodoPorEspacio } from "../../services/logMqtt";
import AnaliticaOperador from "./AnaliticaOperador.vue";
import {
  autoSimulacion,
  bloqueada,
  forzarEstado,
  ingreso,
  liberarTodo,
  llenarTodo,
  salida,
  talanquera,
  toggleAutoSimulacion,
  toggleBloqueo,
} from "../parqueadero/simulacionVial";

/**
 * Consola de operador con pestañas (diseño de la maqueta v2, sin emojis:
 * iconografía SVG) y datos 100% reales:
 *  - Analítica: eventos del día en SQLite (gráficos SVG nativos, sin React).
 *  - Control: publica por REST → MQTT con nodos porteria/salida/operador.
 *  - Telemetría: estado en vivo del WS + nodo que publicó cada evento.
 *  - Registro MQTT: buffer en vivo de mensajes IN/OUT del broker.
 */

type TabOperador = "graficos" | "control" | "telemetria" | "eventos";
const tabActivo = ref<TabOperador>("graficos");

const props = defineProps<{
  bahias: Bahia[];
  disponibles: number;
  animaciones: AnimacionMoto[];
  ahora: number;
}>();

const emit = defineEmits<{ (e: "cerrar"): void }>();

// ---------- Bloqueo de sesión (reemplaza al prompt del navegador) ----------
const desbloqueado = ref(tokenAdmin() !== null);
const tokenIngresado = ref("");
const errorToken = ref("");
const verificando = ref(false);

async function desbloquear() {
  if (!tokenIngresado.value || verificando.value) return;
  verificando.value = true;
  errorToken.value = "";
  try {
    if (await verificarToken(tokenIngresado.value)) {
      guardarToken(tokenIngresado.value);
      desbloqueado.value = true;
    } else {
      limpiarToken();
      errorToken.value = "Token inválido o bloqueado por intentos. Vuelve a intentarlo.";
    }
  } catch {
    errorToken.value = "No se pudo contactar al servidor. Revisa que el backend esté activo.";
  } finally {
    verificando.value = false;
  }
}

const selectedTargetBay = ref<string>("auto");
const estaLleno = computed(() => props.disponibles === 0);
const total = computed(() => props.bahias.length || 10);
const ocupados = computed(() => total.value - props.disponibles);
const porcentaje = computed(() =>
  total.value === 0 ? 0 : Math.round((ocupados.value / total.value) * 100));

function handleIngreso(origen?: "norte" | "sur") {
  const target = selectedTargetBay.value === "auto" ? undefined : selectedTargetBay.value;
  ingreso(target, origen);
}
function handleSimultaneas() {
  ingreso(undefined, "norte");
  setTimeout(() => ingreso(undefined, "sur"), 250);
}
function handleMotoEnEspera() {
  if (!estaLleno.value) return;
  ingreso(undefined, undefined, true);
}
function handleSalida() {
  const target = selectedTargetBay.value === "auto" ? undefined : selectedTargetBay.value;
  salida(target);
}

function haceDesde(ts: number | null): string {
  if (ts === null) return "sin dato";
  const s = Math.max(0, Math.floor((props.ahora - ts) / 1000));
  if (s < 5) return "ahora";
  if (s < 60) return `hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h`;
}

// Telemetría de acceso derivada de la simulación real en curso
/** Patrón de topics mostrado en el registro (texto plano, no HTML). */
const PATRON_TOPIC = "parq/⟨lote⟩/⟨nodo⟩/espacios/⟨id⟩/estado";

const etapasAcceso = ["aproximacion", "talanquera", "esperando"] as const;const lazoNorte = computed(() =>
  props.animaciones.some((a) => a.tipo === "ingreso" &&
    (etapasAcceso as readonly string[]).includes(a.etapa) && a.posicionActual.y < 50));
const lazoSur = computed(() =>
  props.animaciones.some((a) => a.tipo === "ingreso" &&
    (etapasAcceso as readonly string[]).includes(a.etapa) && a.posicionActual.y >= 50));
const fotoceldaInterrumpida = computed(() =>
  props.animaciones.some((a) =>
    a.posicionActual.x >= 20 && a.posicionActual.x <= 30 &&
    ((etapasAcceso as readonly string[]).includes(a.etapa) || a.etapa === "ruta")));
</script>

<template>
  <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
    <div class="panel-claro bg-white border border-slate-300 rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-800">

      <!-- Cabecera de caseta -->
      <div class="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm sm:text-base font-extrabold text-slate-900 tracking-wide uppercase">
                Consola de Operador · Caseta de Control
              </h2>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">UNISUCRE</span>
            </div>
            <p class="text-[11px] text-slate-500 hidden sm:block">
              Supervisión de acceso vehicular, libro de registros en vivo, gráficos de ocupación diaria y control de talanquera
            </p>
          </div>
        </div>

        <button
          type="button"
          class="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs text-slate-700 font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          @click="emit('cerrar')"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span class="hidden sm:inline">Volver a Pantalla</span>
        </button>
      </div>

      <!-- PANTALLA DE BLOQUEO: sin token válido no se ve nada de la consola -->
      <div v-if="!desbloqueado" class="p-6 sm:p-10 flex flex-col items-center justify-center gap-4 flex-1">
        <div class="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
          <svg class="w-7 h-7 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div class="text-center">
          <h3 class="text-sm font-extrabold uppercase tracking-wider text-slate-900">Acceso de operador requerido</h3>
          <p class="text-xs text-slate-500 mt-1 max-w-xs">
            Ingresa la clave de vigilancia para acceder al control de portería, sensores y libro de registros.
          </p>
        </div>
        <form class="w-full max-w-xs flex flex-col gap-2" @submit.prevent="desbloquear">
          <label for="token-operador" class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Token de operador</label>
          <input
            id="token-operador"
            v-model="tokenIngresado"
            name="token-operador"
            type="password"
            autocomplete="off"
            spellcheck="false"
            :disabled="verificando"
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-800 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Clave de vigilancia…"
          />
          <p v-if="errorToken" class="text-[11px] font-semibold text-red-600">{{ errorToken }}</p>
          <button
            type="submit"
            :disabled="!tokenIngresado || verificando"
            class="w-full min-h-11 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
            :class="!tokenIngresado || verificando
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-slate-900 hover:bg-slate-800 text-white'"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>{{ verificando ? "Verificando…" : "Desbloquear consola" }}</span>
          </button>
        </form>
        <button
          type="button"
          class="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer inline-flex items-center min-h-11"
          @click="emit('cerrar')"
        >
          Volver a la pantalla de usuario
        </button>
        <p class="text-[10px] text-slate-400 font-mono">La verificación se hace en el servidor y se limita a 10 intentos por minuto.</p>
      </div>

      <!-- Barra de pestañas (iconos SVG, sin emojis) -->
      <div v-if="desbloqueado" class="px-4 sm:px-6 pt-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1 overflow-x-auto select-none">
        <button
          v-for="t in (['graficos','control','telemetria','eventos'] as const)"
          :key="t"
          type="button"
          class="px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-b-2 cursor-pointer shrink-0"
          :class="tabActivo === t
            ? (t === 'graficos' ? 'bg-white text-emerald-700 border-emerald-600 shadow-xs'
              : t === 'control' ? 'bg-white text-blue-700 border-blue-600 shadow-xs'
              : t === 'telemetria' ? 'bg-white text-indigo-700 border-indigo-600 shadow-xs'
              : 'bg-white text-slate-800 border-slate-700 shadow-xs')
            : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'"
          @click="tabActivo = t"
        >
          <svg v-if="t === 'graficos'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
          <svg v-else-if="t === 'control'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          <svg v-else-if="t === 'telemetria'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" /><line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" /><line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" /><line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" /></svg>
          <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
          <span>{{ t === 'graficos' ? 'Gráficos de Ocupación' : t === 'control' ? 'Control de Portería' : t === 'telemetria' ? 'Sensores por Bahía' : 'Libro de Registros' }}</span>
          <span v-if="t === 'graficos'" class="w-2 h-2 rounded-full bg-emerald-500" />
          <span v-if="t === 'eventos' && logMqtt.length" class="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-200 text-slate-700 font-mono">{{ logMqtt.length }}</span>
        </button>
      </div>

      <!-- Métricas rápidas -->
      <div v-if="desbloqueado" class="px-4 sm:px-6 py-2.5 bg-slate-100/70 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div class="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5 shadow-xs">
          <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          </div>
          <div>
            <div class="text-[10px] font-bold text-slate-500 uppercase">Cupos Libres</div>
            <div class="text-sm font-extrabold text-emerald-700 font-mono">{{ disponibles }} de {{ total }}</div>
          </div>
        </div>
        <div class="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5 shadow-xs">
          <div class="w-8 h-8 rounded-lg bg-red-50 text-red-700 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </div>
          <div>
            <div class="text-[10px] font-bold text-slate-500 uppercase">Ocupadas</div>
            <div class="text-sm font-extrabold text-red-700 font-mono">{{ ocupados }} ({{ porcentaje }}%)</div>
          </div>
        </div>
        <div class="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5 shadow-xs">
          <div class="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          </div>
          <div>
            <div class="text-[10px] font-bold text-slate-500 uppercase">Talanquera</div>
            <div class="text-xs font-extrabold font-mono" :class="bloqueada ? 'text-red-700' : 'text-emerald-700'">
              {{ bloqueada ? "BLOQUEADA" : talanquera.toUpperCase() }}
            </div>
          </div>
        </div>
        <div class="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2.5 shadow-xs">
          <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          </div>
          <div>
            <div class="text-[10px] font-bold text-slate-500 uppercase">Simulación Auto</div>
            <div class="text-xs font-extrabold font-mono" :class="autoSimulacion ? 'text-emerald-700' : 'text-slate-500'">
              {{ autoSimulacion ? "ACTIVA (7,5 s)" : "PAUSADA" }}
            </div>
          </div>
        </div>
      </div>

      <!-- Contenido -->
      <div v-if="desbloqueado" class="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">

        <!-- PESTAÑA 1: GRÁFICOS -->
        <div v-show="tabActivo === 'graficos'">
          <AnaliticaOperador :bahias="bahias" :disponibles="disponibles" />
        </div>

        <!-- PESTAÑA 2: CONTROL Y MANIOOBRAS -->
        <div v-show="tabActivo === 'control'" class="space-y-6">
          <div
            class="rounded-xl p-4 border transition-all"
            :class="bloqueada ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full" :class="bloqueada ? 'bg-red-600' : 'bg-emerald-600'" />
                  <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <svg class="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    Control Físico de Barrera (Talanquera)
                  </h3>
                </div>
                <p class="text-xs text-slate-600 mt-1 max-w-md">
                  {{ bloqueada
                    ? "Talanquera asegurada en posición cerrada. El paso de motocicletas queda temporalmente suspendido."
                    : "La talanquera opera en modo automático al detectar vehículos en la entrada." }}
                </p>
              </div>
              <button
                type="button"
                class="px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 shrink-0 flex items-center gap-2"
                :class="bloqueada
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'"
                @click="toggleBloqueo"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path v-if="bloqueada" d="M7 11V7a5 5 0 0 1 9.9-1" />
                  <path v-else d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>{{ bloqueada ? "Desbloquear Talanquera" : "Bloquear Talanquera" }}</span>
              </button>
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between flex-wrap gap-1">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <svg class="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
                Pruebas de Tráfico Vehicular (Simulación de Maniobras)
              </h3>
              <span v-if="bloqueada" class="text-xs text-red-600 font-semibold">* Ingreso inhabilitado por bloqueo de talanquera</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                :disabled="bloqueada"
                class="py-2.5 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                :class="bloqueada
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 cursor-pointer'"
                @click="handleIngreso('norte')"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
                <span>INGRESO CALLE NORTE</span>
              </button>
              <button
                type="button"
                :disabled="bloqueada"
                class="py-2.5 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                :class="bloqueada
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20 cursor-pointer'"
                @click="handleIngreso('sur')"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
                <span>INGRESO CALLE SUR</span>
              </button>
              <button
                type="button"
                :disabled="bloqueada"
                class="py-2.5 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                :class="bloqueada
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 cursor-pointer'"
                @click="handleSimultaneas"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                <span>SIMULTÁNEAS (NORTE + SUR)</span>
              </button>
              <button
                type="button"
                :disabled="bloqueada || !estaLleno"
                class="py-2.5 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                :class="bloqueada || !estaLleno
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30 cursor-pointer ring-2 ring-amber-400'"
                :title="!estaLleno ? 'Solo disponible cuando el parqueadero está lleno (0 cupos)' : 'Simular moto esperando cupo libre en portería'"
                @click="handleMotoEnEspera"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                <span>MOTO EN ESPERA {{ !estaLleno ? "(SOLO CON LLENO)" : "(ACTIVO)" }}</span>
              </button>
            </div>

            <div
              v-if="!estaLleno"
              class="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2"
            >
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                <span>
                  Botón <strong>Moto en Espera</strong> inhabilitado: hay <strong>{{ disponibles }} cupos libres</strong>. Una moto solo espera cuando el aforo está al 100%.
                </span>
              </div>
              <button type="button" class="text-xs font-bold text-amber-700 hover:text-amber-800 underline cursor-pointer shrink-0" @click="llenarTodo">
                Llenar Plazas
              </button>
            </div>
            <div v-else class="text-[11px] text-amber-900 bg-amber-50 border border-amber-300 rounded-xl p-2.5 font-medium flex items-center gap-2">
              <svg class="w-4 h-4 text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              <span><strong>Aforo completo (0 cupos):</strong> pulsa para simular la moto que llega a portería y espera un puesto.</span>
            </div>

            <div class="pt-1">
              <button
                type="button"
                class="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-900 text-white transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-slate-800/20"
                @click="handleSalida"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                <span>SALIDA DE MOTO (HACIA PENDÓN)</span>
              </button>
            </div>

            <div class="flex items-center justify-between text-xs pt-1">
              <span class="text-slate-600 font-medium">Destino de la maniobra:</span>
              <select
                v-model="selectedTargetBay"
                class="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-blue-700 font-bold focus:outline-hidden cursor-pointer shadow-xs"
              >
                <option value="auto">Automático (primera disponible)</option>
                <option v-for="b in bahias" :key="b.id" :value="b.id">Plaza {{ b.id }} ({{ b.estado }})</option>
              </select>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between flex-wrap gap-1">
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <svg class="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                Forzar estado de plazas (cada cambio queda en el registro de actividad)
              </h3>
              <div class="flex items-center gap-2">
                <button type="button" class="text-[11px] font-semibold text-emerald-600 hover:underline cursor-pointer flex items-center gap-1" @click="liberarTodo">
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                  <span>Liberar todas</span>
                </button>
                <span class="text-slate-300">|</span>
                <button type="button" class="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer flex items-center gap-1" @click="llenarTodo">
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                  <span>Llenar todas</span>
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 w-full">
              <button
                v-for="b in bahias"
                :key="b.id"
                type="button"
                class="p-2 rounded-t-lg border-t-2 border-x-2 text-center transition-all cursor-pointer flex flex-col items-center gap-1 min-w-0 overflow-hidden shadow-xs relative group"
                :class="b.estado === 'LIBRE'
                  ? 'bg-emerald-50/80 border-emerald-500 text-emerald-900 hover:bg-emerald-100'
                  : 'bg-red-50/80 border-red-500 text-red-900 hover:bg-red-100'"
                @click="forzarEstado(b.id)"
              >
                <!-- Mini tope de llanta -->
                <div class="w-8 h-1 bg-slate-700 rounded-xs flex justify-around px-0.5">
                  <span class="w-1 h-full bg-amber-400" />
                  <span class="w-1 h-full bg-amber-400" />
                </div>
                <div class="flex items-center gap-1">
                  <span class="font-mono font-black text-xs">{{ b.id }}</span>
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="b.estado === 'LIBRE' ? 'bg-emerald-500' : 'bg-red-500'"
                  />
                </div>
                <span class="text-[9px] font-bold uppercase tracking-wider truncate" :class="b.estado === 'LIBRE' ? 'text-emerald-700' : 'text-red-700'">
                  {{ b.estado }}
                </span>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div class="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <svg class="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                Simulación Autónoma de Demostración
              </div>
              <div class="text-[11px] text-slate-500">Genera llegadas y salidas de motos para simular el tráfico en portería</div>
            </div>
            <button
              type="button"
              class="px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              :class="autoSimulacion ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'"
              @click="toggleAutoSimulacion"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 14 14" /></svg>
              <span>{{ autoSimulacion ? "ACTIVADA" : "DESACTIVADA" }}</span>
            </button>
          </div>
        </div>

        <!-- PESTAÑA 3: SENSORES -->
        <div v-show="tabActivo === 'telemetria'" class="space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <svg class="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>
                Estado de Bahías en Tiempo Real
              </h3>
              <p class="text-[11px] text-slate-500">
                Ocupación por celda, último cambio y punto de registro
              </p>
            </div>
            <span class="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              SENSORES EN LÍNEA
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div
              v-for="b in bahias"
              :key="b.id"
              class="p-3 rounded-xl border flex flex-col justify-between transition-all bg-white"
              :class="b.estado === 'LIBRE' ? 'border-emerald-300' : b.estado === 'OCUPADO' ? 'border-red-300' : 'border-amber-300'"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold font-mono text-slate-800">{{ b.id }}</span>
                <span
                  class="w-2 h-2 rounded-full"
                  :class="b.estado === 'LIBRE' ? 'bg-emerald-500' : b.estado === 'OCUPADO' ? 'bg-red-500' : 'bg-amber-400'"
                />
              </div>
              <div class="my-1.5 text-[10px]">
                <div class="text-slate-400">Estado reportado:</div>
                <div class="font-mono font-bold" :class="b.estado === 'LIBRE' ? 'text-emerald-700' : b.estado === 'OCUPADO' ? 'text-red-700' : 'text-amber-700'">
                  {{ b.estado }} · {{ haceDesde(b.ts) }}
                </div>
              </div>
              <div class="text-[9px] text-slate-400 font-mono truncate" :title="ultimoNodoPorEspacio[b.id]">
                Nodo: {{ ultimoNodoPorEspacio[b.id] ?? "esperando…" }}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div class="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <svg class="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                Servomotor Talanquera
              </div>
              <div class="mt-2 text-xs font-mono">
                <div>
                  Ángulo:
                  <b class="text-slate-900">{{ bloqueada ? "0° (traba activa)" : talanquera === "abierta" ? "-85° (levantada)" : talanquera === "abriendo" ? "-50° (abriendo)" : talanquera === "cerrando" ? "-25° (cerrando)" : "0° (horizontal)" }}</b>
                </div>
                <div class="text-slate-500 mt-0.5">Estado FSM: {{ bloqueada ? "bloqueada" : talanquera }}</div>
              </div>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div class="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <svg class="w-4 h-4 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20M7 8l-4 4 4 4M17 8l4 4-4 4" /></svg>
                Lazos de Detección (Entrada)
              </div>
              <div class="mt-2 text-xs font-mono">
                <div>Carril Norte: <b :class="lazoNorte ? 'text-amber-600' : 'text-emerald-700'">{{ lazoNorte ? "PRESENCIA" : "Listo" }}</b></div>
                <div>Carril Sur: <b :class="lazoSur ? 'text-amber-600' : 'text-sky-700'">{{ lazoSur ? "PRESENCIA" : "Listo" }}</b></div>
                <div class="text-slate-400 mt-1 text-[9px]">Derivado de la detección real de la simulación en portería</div>
              </div>
            </div>

            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div class="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <svg class="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /></svg>
                Fotocelda de Barrera
              </div>
              <div class="mt-2 text-xs font-mono">
                <div>Haz: <b :class="fotoceldaInterrumpida ? 'text-red-600' : 'text-emerald-700'">{{ fotoceldaInterrumpida ? "INTERRUMPIDO (vehículo)" : "Alineado" }}</b></div>
                <div class="text-slate-500 mt-0.5">Anti-aplastamiento vehicular</div>
              </div>
            </div>
          </div>
        </div>

        <!-- PESTAÑA 4: LIBRO DE REGISTROS -->
        <div v-show="tabActivo === 'eventos'" class="space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <svg class="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>
              Libro Digital de Accesos y Movimientos en Vivo
            </h3>
            <span class="text-[11px] font-mono text-slate-500">Planilla de control diario</span>
          </div>

          <div class="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <div class="overflow-x-auto max-h-80">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th class="px-3 py-2">Hora</th>
                    <th class="px-3 py-2">Punto de Registro</th>
                    <th class="px-3 py-2">Estado</th>
                    <th class="px-3 py-2">Confirmación</th>
                    <th class="px-3 py-2">Tipo de Movimiento</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-mono text-[11px]">
                  <tr v-if="logMqtt.length === 0" class="text-slate-400">
                    <td colspan="5" class="px-3 py-6 text-center">Esperando nuevos movimientos en portería…</td>
                  </tr>
                  <tr
                    v-for="log in logMqtt.slice(0, 30)"
                    :key="log.id"
                    class="hover:bg-slate-50 transition-colors"
                  >
                    <td class="px-3 py-1.5 text-slate-500">{{ new Date(log.ts).toLocaleTimeString("es-CO", { hour12: false }) }}</td>
                    <td class="px-3 py-1.5 font-bold text-slate-800">{{ log.topic }}</td>
                    <td class="px-3 py-1.5">
                      <span
                        class="px-2 py-0.5 rounded text-[10px] font-bold"
                        :class="log.estado === 'LIBRE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'"
                      >{{ log.estado }}</span>
                    </td>
                    <td class="px-3 py-1.5 text-slate-600 font-sans font-semibold">Registrado</td>
                    <td class="px-3 py-1.5">
                      <span
                        class="font-bold"
                        :class="log.direccion === 'in' ? 'text-emerald-700' : 'text-sky-700'"
                      >{{ log.direccion === "in" ? "DETECCIÓN SENSOR (ENTRADA)" : "ORDEN DE PORTERÍA (SALIDA)" }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p class="text-[10px] text-slate-400">
            Registro automático de los ingresos, salidas y cambios de estado captados por los sensores de portería y celdas de parqueo.
          </p>
        </div>
      </div>

      <!-- Pie de caseta -->
      <div class="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
        <div class="flex items-center gap-2 flex-wrap">
          <span>Talanquera: <strong :class="bloqueada ? 'text-red-600' : 'text-emerald-600'">{{ bloqueada ? "BLOQUEADA" : "EN SERVICIO" }}</strong></span>
          <span class="text-slate-300">·</span>
          <span>Aforo: <strong class="text-slate-800">{{ porcentaje }}%</strong></span>
          <span class="text-slate-300">·</span>
          <span class="font-mono">{{ logMqtt.length }} cambios en el registro</span>
        </div>
        <button
          type="button"
          class="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-medium transition-colors cursor-pointer text-xs flex items-center gap-1.5"
          @click="emit('cerrar')"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6" /></svg>
          <span>Cerrar Consola</span>
        </button>
      </div>
    </div>
  </div>
</template>
