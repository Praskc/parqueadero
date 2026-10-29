<script setup lang="ts">
// Consola operativa de portería en dos paneles: barra lateral de navegación/estado y área de trabajo estructurada.
import { computed, onMounted, onUnmounted, ref } from "vue";
import { ESTAMENTOS } from "../../config/bahias";
import { guardarToken, limpiarToken, tokenAdmin } from "../../services/adminToken";
import { verificarToken } from "../../services/api";
import { logMqtt, ultimoNodoPorEspacio } from "../../services/logMqtt";
import { tema } from "../../shared/theme";
import UnisucreLogo from "../../shared/ui/UnisucreLogo.vue";
import type { AnimacionMoto, Bahia } from "../../types/hmi";
import {
  autoSimulacion,
  bloqueada,
  forzarEstado,
  forzarEstamento,
  ingreso,
  liberarTodo,
  llenarTodo,
  salida,
  talanquera,
  toggleAutoSimulacion,
  toggleBloqueo,
} from "../parqueadero/simulacionVial";
import AnaliticaOperador from "./AnaliticaOperador.vue";

type TabOperador = "control" | "graficos" | "telemetria" | "eventos";
const tabActivo = ref<TabOperador>("control");

const props = defineProps<{
  bahias: Bahia[];
  disponibles: number;
  animaciones: AnimacionMoto[];
  ahora: number;
}>();

const emit = defineEmits<{ (e: "cerrar"): void }>();

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") emit("cerrar");
}

onMounted(() => document.addEventListener("keydown", handleKeydown));
onUnmounted(() => document.removeEventListener("keydown", handleKeydown));

const desbloqueado = ref(tokenAdmin() !== null);
const tokenIngresado = ref("");
const mostrarToken = ref(false);
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
      errorToken.value = "Clave inválida o bloqueada temporalmente por intentos. Vuelve a intentarlo.";
    }
  } catch {
    errorToken.value = "No se pudo contactar al servidor. Verifica que el backend esté en ejecución.";
  } finally {
    verificando.value = false;
  }
}

const selectedTargetBay = ref<string>("auto");
const avisoOperador = ref<string | null>(null);
let avisoTimer: number | undefined;

function avisarOperador(mensaje: string) {
  avisoOperador.value = mensaje;
  if (avisoTimer) window.clearTimeout(avisoTimer);
  avisoTimer = window.setTimeout(() => (avisoOperador.value = null), 6000);
}

const bahiasEnCamino = computed(() => {
  const asignadas = new Set<string>();
  for (const a of props.animaciones) {
    if (a.tipo === "ingreso" && a.espacioId && a.espacioId !== "EN_ESPERA") {
      asignadas.add(a.espacioId);
    }
  }
  return asignadas;
});
const enCamino = computed(
  () => props.bahias.filter((b) => b.estado === "LIBRE" && bahiasEnCamino.value.has(b.id)).length,
);
const libresEfectivos = computed(
  () => props.bahias.filter((b) => b.estado === "LIBRE" && !bahiasEnCamino.value.has(b.id)).length,
);
const estaLleno = computed(() => libresEfectivos.value === 0);
const total = computed(() => props.bahias.length || 30);
const ocupados = computed(() => props.bahias.filter((b) => b.estado === "OCUPADO").length);
const porcentaje = computed(() =>
  total.value === 0 ? 0 : Math.round((ocupados.value / total.value) * 100));

const bahiasPorEstamento = computed(() =>
  ESTAMENTOS.map((est) => {
    const celdas = props.bahias.filter((b) => b.estamento === est.key);
    const libres = celdas.filter((b) => b.estado === "LIBRE" && !bahiasEnCamino.value.has(b.id)).length;
    return {
      ...est,
      celdas,
      libres,
    };
  }),
);

const SECCIONES: ReadonlyArray<{ id: TabOperador; label: string; desc: string }> = [
  { id: "control", label: "Control de portería", desc: "Talanquera, tráfico y estado manual de las 30 plazas" },
  { id: "graficos", label: "Analítica diaria", desc: "Flujo horario, disponibilidad por estamento y rotación" },
  { id: "telemetria", label: "Sensores en vivo", desc: "Diagnóstico de lazos inductivos, fotocelda y nodos MQTT" },
  { id: "eventos", label: "Libro de registros", desc: "Bitácora cronológica de accesos y mensajes del bus" },
];

const seccionActual = computed(
  () => SECCIONES.find((s) => s.id === tabActivo.value) ?? SECCIONES[0],
);

function handleIngreso(origen?: "norte" | "sur") {
  const target = selectedTargetBay.value === "auto" ? undefined : selectedTargetBay.value;
  // La plaza objetivo no puede recibir un segundo vehículo mientras el primero
  // sigue en camino: el sensor aún no confirma la ocupación.
  if (target) {
    if (bahiasEnCamino.value.has(target)) {
      avisarOperador(`La plaza ${target} tiene un vehículo en camino. Espera la confirmación del sensor o elige otra plaza.`);
      return;
    }
    const bahia = props.bahias.find((b) => b.id === target);
    if (!bahia || bahia.estado !== "LIBRE") {
      avisarOperador(`La plaza ${target} no está libre (${bahia?.estado ?? "sin dato"}). Elige una plaza disponible.`);
      return;
    }
  }
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

const etapasAcceso = ["aproximacion", "talanquera", "esperando"] as const;
const lazoNorte = computed(() =>
  props.animaciones.some((a) => a.tipo === "ingreso" &&
    (etapasAcceso as readonly string[]).includes(a.etapa) && a.posicionActual.y < 50));
const lazoSur = computed(() =>
  props.animaciones.some((a) => a.tipo === "ingreso" &&
    (etapasAcceso as readonly string[]).includes(a.etapa) && a.posicionActual.y >= 50));
const fotoceldaInterrumpida = computed(() =>
  props.animaciones.some((a) =>
    a.posicionActual.x >= 16 && a.posicionActual.x <= 26 &&
    ((etapasAcceso as readonly string[]).includes(a.etapa) || a.etapa === "ruta")));
</script>

<template>
  <div
    class="fixed inset-0 z-50 bg-slate-950/65 flex items-center justify-center p-2 sm:p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="titulo-consola-operador"
    @click.self="emit('cerrar')"
  >
    <!-- Vista compacta de autenticación cuando la sesión de operador está bloqueada -->
    <div
      v-if="!desbloqueado"
      class="superficie-accesible rounded-2xl border max-w-md w-full shadow-2xl overflow-hidden transition-colors"
      :class="tema === 'oscuro'
        ? 'bg-[#0f172a] border-slate-800 text-slate-100'
        : 'bg-white border-slate-300 text-slate-800'"
    >
      <div
        class="px-5 py-3.5 border-b flex items-center justify-between gap-3"
        :class="tema === 'oscuro' ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'"
      >
        <div class="flex items-center gap-3 min-w-0">
          <UnisucreLogo size="36" class="w-9 h-auto shrink-0" />
          <div class="min-w-0">
            <h2
              id="titulo-consola-operador"
              class="text-sm font-bold font-headline tracking-wide uppercase truncate"
              :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'"
            >
              Panel de Control
            </h2>
            <p class="text-xs truncate" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600'">
              Portería Campus Puerta Roja
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Cerrar panel de control"
          class="w-[44px] h-[44px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0"
          :class="tema === 'oscuro'
            ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'"
          @click="emit('cerrar')"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <form class="p-6 flex flex-col gap-4" @submit.prevent="desbloquear">
        <p class="text-sm leading-relaxed" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-700'">
          Ingresa la clave de operador para gestionar la barrera vehicular, las 30 plazas y el libro de registros.
        </p>

        <div class="flex flex-col gap-1.5">
          <label for="token-operador" class="text-xs font-bold uppercase tracking-wide" :class="tema === 'oscuro' ? 'text-slate-200' : 'text-slate-800'">
            Clave de operador
          </label>
          <div class="relative flex items-center">
            <input
              id="token-operador"
              v-model="tokenIngresado"
              :type="mostrarToken ? 'text' : 'password'"
              autocomplete="off"
              spellcheck="false"
              :disabled="verificando"
              class="w-full min-h-[44px] pl-3.5 pr-12 py-2.5 rounded-xl border font-mono text-sm transition-colors"
              :class="tema === 'oscuro'
                ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-400'
                : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-500'"
              placeholder="Clave de caseta"
            />
            <button
              type="button"
              :aria-label="mostrarToken ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              :title="mostrarToken ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              :aria-pressed="mostrarToken"
              class="absolute right-0.5 min-w-[44px] min-h-[44px] p-2 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              :class="tema === 'oscuro'
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
              @click="mostrarToken = !mostrarToken"
            >
              <svg v-if="!mostrarToken" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
          </div>
        </div>

        <p v-if="errorToken" role="alert" class="text-xs font-semibold" :class="tema === 'oscuro' ? 'text-[#f87171]' : 'text-[#b91c1c]'">
          {{ errorToken }}
        </p>

        <button
          type="submit"
          :disabled="!tokenIngresado || verificando"
          class="w-full min-h-[44px] py-2.5 rounded-xl font-bold font-headline text-xs sm:text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          :class="!tokenIngresado || verificando
            ? (tema === 'oscuro' ? 'bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-slate-200 text-slate-500 cursor-not-allowed')
            : 'bg-[#15803d] hover:bg-emerald-800 text-white cursor-pointer'"
        >
          <span>{{ verificando ? "Verificando…" : "Ingresar al panel" }}</span>
        </button>
      </form>
    </div>

    <!-- Consola desbloqueada en dos paneles: riel lateral izquierdo + espacio operativo derecho -->
    <div
      v-else
      class="superficie-accesible rounded-2xl border max-w-6xl w-full lg:h-[min(86dvh,780px)] max-h-[92dvh] flex flex-col lg:flex-row shadow-2xl overflow-hidden transition-colors"
      :class="tema === 'oscuro'
        ? 'bg-[#0f172a] border-slate-800 text-slate-100'
        : 'bg-white border-slate-300 text-slate-800'"
    >
      <!-- Riel lateral de navegación y resumen en vivo -->
      <aside
        class="lg:w-[252px] shrink-0 border-b lg:border-b-0 lg:border-r flex flex-col justify-between"
        :class="tema === 'oscuro' ? 'bg-slate-900/75 border-slate-800' : 'bg-slate-50 border-slate-200'"
      >
        <div class="p-4 flex flex-col gap-4">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-3 min-w-0">
              <UnisucreLogo size="38" class="w-9 h-auto shrink-0" />
              <div class="min-w-0">
                <h2
                  id="titulo-consola-operador"
                  class="text-sm font-bold font-headline tracking-wide uppercase leading-tight truncate"
                  :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'"
                >
                  Panel de Control
                </h2>
                <p class="text-[11px] font-semibold truncate mt-0.5" :class="tema === 'oscuro' ? 'text-[#4ade80]' : 'text-[#15803d]'">
                  Campus Puerta Roja
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-label="Cerrar panel de control"
              class="lg:hidden w-[44px] h-[44px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0"
              :class="tema === 'oscuro'
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'"
              @click="emit('cerrar')"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <nav aria-label="Secciones del panel de control" class="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
            <button
              v-for="sec in SECCIONES"
              :key="sec.id"
              type="button"
              :aria-current="tabActivo === sec.id ? 'page' : undefined"
              class="min-h-[44px] px-3 py-2 rounded-xl text-left text-xs font-bold transition-colors flex items-center gap-2.5 cursor-pointer shrink-0 lg:w-full border"
              :class="tabActivo === sec.id
                ? (tema === 'oscuro'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700'
                  : 'bg-white text-[#15803d] border-[#15803d] shadow-xs')
                : (tema === 'oscuro'
                  ? 'border-transparent text-slate-300 hover:text-white hover:bg-slate-800/70'
                  : 'border-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-200/60')"
              @click="tabActivo = sec.id"
            >
              <svg v-if="sec.id === 'control'" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M4 20v-8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8" /><path d="M2 14h20" /><path d="M9 10V6a3 3 0 0 1 6 0v4" />
              </svg>
              <svg v-else-if="sec.id === 'graficos'" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M3 3v18h18" /><path d="M7 14l4-4 4 3 5-6" />
              </svg>
              <svg v-else-if="sec.id === 'telemetria'" class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
              </svg>
              <svg v-else class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              <span class="truncate">{{ sec.label }}</span>
              <span
                v-if="sec.id === 'eventos' && logMqtt.length"
                class="ml-auto font-mono text-[11px] tabular-nums opacity-80"
              >
                {{ logMqtt.length }}
              </span>
            </button>
          </nav>
        </div>

        <!-- Lecturas operativas permanentes en la base del riel lateral -->
        <div
          class="hidden lg:flex flex-col gap-2.5 p-4 border-t text-xs"
          :class="tema === 'oscuro' ? 'border-slate-800' : 'border-slate-200'"
        >
          <div class="flex items-baseline justify-between gap-2">
            <span :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">Cupos libres</span>
            <strong class="font-mono tabular-nums" :class="tema === 'oscuro' ? 'text-[#4ade80]' : 'text-[#15803d]'">
              {{ libresEfectivos }} / {{ total }}
            </strong>
          </div>
          <div v-if="enCamino > 0" class="flex items-baseline justify-between gap-2">
            <span :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">En camino</span>
            <strong class="font-mono tabular-nums" :class="tema === 'oscuro' ? 'text-[#facc15]' : 'text-[#8a6d00]'">
              {{ enCamino }}
            </strong>
          </div>
          <div class="flex items-baseline justify-between gap-2">
            <span :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">Ocupación</span>
            <strong
              class="font-mono tabular-nums"
              :class="porcentaje >= 85
                ? (tema === 'oscuro' ? 'text-[#f87171]' : 'text-[#b91c1c]')
                : porcentaje >= 65
                  ? (tema === 'oscuro' ? 'text-[#facc15]' : 'text-[#8a6d00]')
                  : (tema === 'oscuro' ? 'text-slate-200' : 'text-slate-800')"
            >
              {{ ocupados }} ({{ porcentaje }}%)
            </strong>
          </div>
          <div class="flex items-baseline justify-between gap-2">
            <span :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">Talanquera</span>
            <strong
              class="font-mono uppercase"
              :class="bloqueada
                ? (tema === 'oscuro' ? 'text-red-400' : 'text-[#b91c1c]')
                : talanquera === 'abierta' || talanquera === 'abriendo'
                  ? (tema === 'oscuro' ? 'text-emerald-400' : 'text-[#15803d]')
                  : (tema === 'oscuro' ? 'text-slate-200' : 'text-slate-800')"
            >
              {{ bloqueada ? "Bloqueada" : talanquera === "abierta" ? "Abierta" : talanquera === "abriendo" ? "Abriendo" : talanquera === "cerrando" ? "Cerrando" : "Cerrada" }}
            </strong>
          </div>
        </div>
      </aside>

      <!-- Espacio principal de trabajo (cabecera limpia + contenido sin barras redundantes) -->
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
          <!-- SECCIÓN 1: Control de portería en dos columnas equilibradas -->
          <div v-show="tabActivo === 'control'" class="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            <!-- Columna izquierda: Barrera, maniobras viales y simulación autónoma -->
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
                  @click="toggleBloqueo"
                >
                  <span>{{ bloqueada ? "Desbloquear talanquera" : "Bloquear talanquera" }}</span>
                </button>
              </div>

              <!-- Maniobras de tráfico -->
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
                      ? (tema === 'oscuro' ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300')
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
                      ? (tema === 'oscuro' ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-slate-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300')
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

                <!-- Aviso operativo cuando la maniobra se bloquea a propósito -->
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

              <!-- Tráfico continuo -->
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
                  @click="toggleAutoSimulacion"
                >
                  {{ autoSimulacion ? "Activa" : "Pausada" }}
                </button>
              </div>
            </div>

            <!-- Columna derecha: Matriz de las 30 plazas organizada por los 3 estamentos reales -->
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
                    @click="liberarTodo"
                  >
                    Liberar todas
                  </button>
                  <button
                    type="button"
                    class="min-h-[44px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer"
                    :class="tema === 'oscuro'
                      ? 'bg-red-950/40 border-red-800 text-red-300 hover:bg-red-950/70'
                      : 'bg-red-50 border-red-300 text-[#b91c1c] hover:bg-red-100'"
                    @click="llenarTodo"
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
                        @click="forzarEstamento(grupo.key, grupo.libres > 0 ? 'OCUPADO' : 'LIBRE')"
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
                      @click="forzarEstado(b.id)"
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
          </div>

          <!-- SECCIÓN 2: Analítica diaria unificada -->
          <div v-show="tabActivo === 'graficos'">
            <AnaliticaOperador :bahias="bahias" :disponibles="disponibles" :en-camino="[...bahiasEnCamino]" />
          </div>

          <!-- SECCIÓN 3: Sensores en vivo -->
          <div v-show="tabActivo === 'telemetria'" class="flex flex-col gap-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="p-3.5 rounded-xl border" :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/80 border-slate-200'">
                <div class="text-xs font-bold uppercase" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">Servomotor talanquera</div>
                <div class="mt-1.5 text-xs font-mono tabular-nums">
                  <div>Ángulo: <b>{{ bloqueada ? "0° (bloqueada)" : talanquera === "abierta" ? "-85° (abierta)" : talanquera === "abriendo" ? "-50°" : talanquera === "cerrando" ? "-25°" : "0° (cerrada)" }}</b></div>
                  <div class="mt-0.5" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">Estado: {{ bloqueada ? "bloqueada" : talanquera }}</div>
                </div>
              </div>

              <div class="p-3.5 rounded-xl border" :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/80 border-slate-200'">
                <div class="text-xs font-bold uppercase" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">Lazos inductivos de acceso</div>
                <div class="mt-1.5 text-xs font-mono">
                  <div>Carril norte: <b :class="lazoNorte ? (tema === 'oscuro' ? 'text-[#facc15]' : 'text-[#8a6d00]') : (tema === 'oscuro' ? 'text-emerald-400' : 'text-[#15803d]')">{{ lazoNorte ? "Presencia" : "Libre" }}</b></div>
                  <div>Carril sur: <b :class="lazoSur ? (tema === 'oscuro' ? 'text-[#facc15]' : 'text-[#8a6d00]') : (tema === 'oscuro' ? 'text-emerald-400' : 'text-[#15803d]')">{{ lazoSur ? "Presencia" : "Libre" }}</b></div>
                </div>
              </div>

              <div class="p-3.5 rounded-xl border" :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/80 border-slate-200'">
                <div class="text-xs font-bold uppercase" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">Fotocelda de seguridad</div>
                <div class="mt-1.5 text-xs font-mono">
                  <div>Haz óptico: <b :class="fotoceldaInterrumpida ? (tema === 'oscuro' ? 'text-red-400' : 'text-[#dc2626]') : (tema === 'oscuro' ? 'text-emerald-400' : 'text-[#15803d]')">{{ fotoceldaInterrumpida ? "Interrumpido" : "Despejado" }}</b></div>
                  <div class="mt-0.5" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">Protección anti-cierre activa</div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-6 gap-2.5">
              <div
                v-for="b in bahias"
                :key="b.id"
                class="p-3 rounded-xl border flex flex-col justify-between transition-colors"
                :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold font-mono tabular-nums" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">{{ b.id }}</span>
                  <span class="text-[10px] font-mono tabular-nums" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">{{ haceDesde(b.ts) }}</span>
                </div>
                <div
                  class="my-1 text-[11px] font-mono tabular-nums font-bold"
                  :class="b.estado === 'LIBRE'
                    ? (tema === 'oscuro' ? 'text-emerald-400' : 'text-[#15803d]')
                    : b.estado === 'OCUPADO'
                      ? (tema === 'oscuro' ? 'text-red-400' : 'text-[#b91c1c]')
                      : (tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600')"
                >
                  {{ b.estado === "SIN_DATO" ? "SIN DATO" : b.estado }}
                </div>
                <div class="text-[10px] font-mono truncate" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'" :title="ultimoNodoPorEspacio[b.id]">
                  Nodo: {{ ultimoNodoPorEspacio[b.id] ?? "inicial" }}
                </div>
              </div>
            </div>
          </div>

          <!-- SECCIÓN 4: Libro de registros -->
          <div v-show="tabActivo === 'eventos'" class="flex flex-col gap-3">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <span class="text-xs font-semibold" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-700'">
                Eventos recibidos desde sensores y órdenes manuales de portería
              </span>
              <span class="text-xs font-mono tabular-nums" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
                Mostrando últimos {{ Math.min(30, logMqtt.length) }} de {{ logMqtt.length }}
              </span>
            </div>

            <div
              class="border rounded-xl overflow-hidden"
              :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'"
            >
              <div class="overflow-x-auto max-h-[52dvh]">
                <table class="w-full text-left text-xs">
                  <thead
                    class="uppercase text-[10px] font-bold border-b sticky top-0"
                    :class="tema === 'oscuro' ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'"
                  >
                    <tr>
                      <th class="px-3.5 py-2.5">Plaza / Tópico</th>
                      <th class="px-3.5 py-2.5">Estado</th>
                      <th class="px-3.5 py-2.5">Origen</th>
                      <th class="px-3.5 py-2.5">Hora</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y font-mono text-[11px]" :class="tema === 'oscuro' ? 'divide-slate-800' : 'divide-slate-100'">
                    <tr v-if="logMqtt.length === 0">
                      <td colspan="4" class="px-4 py-8 text-center font-sans text-xs" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
                        Aún no se han recibido eventos en esta sesión. Ejecuta un ingreso o salida en «Control de portería».
                      </td>
                    </tr>
                    <tr
                      v-for="log in logMqtt.slice(0, 30)"
                      :key="log.id"
                      class="transition-colors"
                      :class="tema === 'oscuro' ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'"
                    >
                      <td class="px-3.5 py-2 font-bold" :class="tema === 'oscuro' ? 'text-slate-200' : 'text-slate-800'">{{ log.topic }}</td>
                      <td class="px-3.5 py-2 font-bold" :class="log.estado === 'LIBRE' ? (tema === 'oscuro' ? 'text-emerald-400' : 'text-[#15803d]') : (tema === 'oscuro' ? 'text-red-400' : 'text-[#dc2626]')">
                        {{ log.estado }}
                      </td>
                      <td class="px-3.5 py-2 font-sans" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600'">
                        {{ log.direccion === "in" ? "Sensor / Broker" : "Orden de portería" }}
                      </td>
                      <td class="px-3.5 py-2 tabular-nums" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
                        {{ new Date(log.ts).toLocaleTimeString("es-CO", { hour12: false }) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
