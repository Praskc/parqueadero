<script setup lang="ts">
// Tablero público de disponibilidad vehicular, Campus Puerta Roja (Universidad de Sucre)
import { computed } from "vue";
import { ESTAMENTOS } from "../../config/bahias";
import { tema } from "../../shared/theme";
import Accesibilidad from "../../shared/ui/Accesibilidad.vue";
import UnisucreLogo from "../../shared/ui/UnisucreLogo.vue";
import type { AnimacionMoto, Bahia, EstadoTalanquera } from "../../types/hmi";
import ParkingMap from "../parqueadero/ParkingMap.vue";

type EstamentoKey = "estudiantes" | "docentes" | "administrativos";

const props = defineProps<{
  bahias: Bahia[];
  disponibles: number;
  total: number;
  talanquera: EstadoTalanquera;
  bloqueada: boolean;
  animaciones: AnimacionMoto[];
  horaActual: string;
  fechaActual: string;
  conectado: boolean;
  ultimaActualizacion: number | null;
  ahora: number;
  operadorAbierto?: boolean;
}>();

defineEmits<{ (e: "abrirOperador"): void }>();

type TonoEstado = "operativo" | "alerta" | "critico" | "neutro";

// Umbrales operativos explícitos: Alerta (amarillo) desde 65%, Crítico (rojo) desde 85%
const UMBRAL_ALERTA_PCT = 65;
const UMBRAL_CRITICO_PCT = 85;

const bahiasEnCamino = computed(() => {
  const asignadas = new Set<string>();
  for (const a of props.animaciones) {
    if (a.tipo === "ingreso" && a.espacioId && a.espacioId !== "EN_ESPERA") {
      asignadas.add(a.espacioId);
    }
  }
  return asignadas;
});

const ocupadas = computed(() => props.bahias.filter((b) => b.estado === "OCUPADO").length);
const enCaminoGlobal = computed(
  () => props.bahias.filter((b) => b.estado === "LIBRE" && bahiasEnCamino.value.has(b.id)).length,
);
const libresEfectivos = computed(
  () => props.bahias.filter((b) => b.estado === "LIBRE" && !bahiasEnCamino.value.has(b.id)).length,
);
const sinDatoGlobal = computed(() => props.bahias.filter((b) => b.estado === "SIN_DATO").length);
const sinSenalGlobal = computed(() => props.total > 0 && sinDatoGlobal.value === props.total);
const isFull = computed(() => !sinSenalGlobal.value && libresEfectivos.value === 0);

const pctOcupacion = computed(() =>
  props.total > 0 ? Math.round((ocupadas.value / props.total) * 100) : 0,
);
const pctEnCamino = computed(() =>
  props.total > 0 ? Math.min(100 - pctOcupacion.value, Math.round((enCaminoGlobal.value / props.total) * 100)) : 0,
);
const pctComprometido = computed(() =>
  props.total > 0 ? Math.round(((ocupadas.value + enCaminoGlobal.value) / props.total) * 100) : 0,
);

function calcularTono(libres: number, pctEval: number, sinSenal: boolean): TonoEstado {
  if (sinSenal) return "neutro";
  if (libres === 0 || pctEval >= UMBRAL_CRITICO_PCT) return "critico";
  if (pctEval >= UMBRAL_ALERTA_PCT) return "alerta";
  return "operativo";
}

function claseTextoTono(tono: TonoEstado): string {
  if (tono === "neutro") return tema.value === "oscuro" ? "text-slate-200" : "text-slate-700";
  if (tono === "critico") return tema.value === "oscuro" ? "text-[#f87171]" : "text-[#b91c1c]";
  if (tono === "alerta") return tema.value === "oscuro" ? "text-[#facc15]" : "text-[#8a6d00]";
  return tema.value === "oscuro" ? "text-[#4ade80]" : "text-[#15803d]";
}

function claseBarraTono(tono: TonoEstado): string {
  if (tono === "neutro") return tema.value === "oscuro" ? "bg-slate-600" : "bg-slate-400";
  if (tono === "critico") return tema.value === "oscuro" ? "bg-red-500" : "bg-[#dc2626]";
  if (tono === "alerta") return tema.value === "oscuro" ? "bg-[#facc15]" : "bg-[#eab308]";
  return tema.value === "oscuro" ? "bg-emerald-500" : "bg-[#15803d]";
}

const tonoGlobal = computed<TonoEstado>(() => {
  if (!props.conectado || props.bloqueada) return "critico";
  return calcularTono(libresEfectivos.value, pctComprometido.value, sinSenalGlobal.value);
});

const cupoColor = computed(() => claseTextoTono(tonoGlobal.value));
const porcentajeColor = computed(() => claseTextoTono(tonoGlobal.value));
const porcentajeBarColor = computed(() => claseBarraTono(tonoGlobal.value));

// Edad del dato de sensores siempre visible y con cambio de color por antigüedad
const estadoFrescuraSensores = computed<{ texto: string; tono: TonoEstado }>(() => {
  if (!props.conectado) {
    return { texto: "Sensores: sin conexión", tono: "critico" };
  }
  if (props.ultimaActualizacion === null) {
    return { texto: "Sensores: esperando lectura", tono: "alerta" };
  }
  const seg = Math.max(0, Math.floor((props.ahora - props.ultimaActualizacion) / 1000));
  if (seg < 5) {
    return { texto: "Sensores: actualizado ahora", tono: "operativo" };
  }
  if (seg < 30) {
    return { texto: `Sensores: hace ${seg} s`, tono: "operativo" };
  }
  if (seg < 120) {
    const etiqueta = seg < 60 ? `hace ${seg} s` : "hace 1 min";
    return { texto: `Sensores: ${etiqueta} (demorado)`, tono: "alerta" };
  }
  const min = Math.floor(seg / 60);
  return { texto: `Sensores: hace ${min} min (lectura antigua)`, tono: "critico" };
});

const estamentoLista = computed(() =>
  ESTAMENTOS.map((est) => {
    const plazas = props.bahias.filter((b) => b.estamento === est.key);
    const totalZona = plazas.length || 10;
    const libres = plazas.filter((b) => b.estado === "LIBRE" && !bahiasEnCamino.value.has(b.id)).length;
    const enCamino = plazas.filter((b) => b.estado === "LIBRE" && bahiasEnCamino.value.has(b.id)).length;
    const ocup = plazas.filter((b) => b.estado === "OCUPADO").length;
    const sinDato = plazas.filter((b) => b.estado === "SIN_DATO").length;
    const sinSenal = sinDato === totalZona;
    const pct = totalZona > 0 ? Math.round((ocup / totalZona) * 100) : 0;
    const pctCamino = totalZona > 0 ? Math.min(100 - pct, Math.round((enCamino / totalZona) * 100)) : 0;
    const pctEval = totalZona > 0 ? Math.round(((ocup + enCamino) / totalZona) * 100) : 0;
    const tono = calcularTono(libres, pctEval, sinSenal);
    return {
      key: est.key,
      nombre: est.label,
      rango: est.rango,
      libres,
      enCamino,
      ocupadas: ocup,
      sinDato,
      sinSenal,
      total: totalZona,
      pct,
      pctCamino,
      tono,
    };
  }),
);

const zonasConCupo = computed(() =>
  estamentoLista.value.filter((item) => !props.bloqueada && item.libres > 0),
);
const hayCupoEnAlgunaZona = computed(() => zonasConCupo.value.length > 0);
const unicaZonaConCupoKey = computed<EstamentoKey | null>(() =>
  zonasConCupo.value.length === 1 ? zonasConCupo.value[0].key : null,
);

function esSectorAtenuado(libres: number, sinSenal: boolean): boolean {
  if (!hayCupoEnAlgunaZona.value || sinSenal) return false;
  return libres === 0;
}

function esSectorDestacado(key: EstamentoKey, libres: number): boolean {
  if (props.bloqueada || libres === 0) return false;
  return unicaZonaConCupoKey.value === key;
}

const etiquetaEstadoPrincipal = computed(() => {
  if (!props.conectado) return "Sin conexión";
  if (props.bloqueada) return "Portería cerrada";
  if (sinSenalGlobal.value) return "Sensores sin señal";
  if (isFull.value) return "Aforo completo";
  return "Cupos libres";
});
</script>

<template>
  <div class="flex-1 w-full flex flex-col">
    <!-- Barra superior institucional de ancho completo en tres zonas: marca, cápsula central de telemetría y acción circular -->
    <header
      class="superficie-accesible w-full border-b transition-colors duration-200"
      :class="tema === 'oscuro'
        ? 'bg-[#133519] border-emerald-900/80 text-white shadow-md'
        : 'bg-[#184320] border-[#24592e] text-white shadow-sm'"
    >
      <div
        class="max-w-[1340px] w-full mx-auto px-[14px] sm:px-6 lg:px-8 py-2.5 lg:py-3 grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_auto_auto] lg:grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2 lg:gap-x-5"
      >
        <!-- Zona 1: Identidad institucional directamente sobre la franja verde Unisucre -->
        <div class="col-start-1 row-start-1 flex items-center gap-3 min-w-0">
          <UnisucreLogo
            size="46"
            sobre-fondo-oscuro
            class="w-9 sm:w-10 lg:w-[44px] h-auto shrink-0"
          />
          <div class="min-w-0">
            <p class="text-[11px] font-extrabold uppercase tracking-[0.06em] font-headline text-[#f3e69f] leading-tight break-words">
              Universidad de Sucre
            </p>
            <h1 class="font-headline flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mt-0.5 min-w-0">
              <span class="text-base sm:text-lg lg:text-xl font-black uppercase tracking-tight text-white leading-none">
                Parqueadero
              </span>
              <span class="text-[11px] sm:text-xs font-semibold text-emerald-100 leading-tight">
                Campus Puerta Roja
              </span>
            </h1>
          </div>
        </div>

        <!-- Zona 2: Cápsula central exclusiva de disponibilidad vehicular y estado de sensores -->
        <div
          role="status"
          aria-live="polite"
          class="col-span-2 row-start-3 sm:col-span-3 sm:row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:justify-self-center w-full lg:w-auto rounded-2xl lg:rounded-full px-4 py-2 lg:px-6 lg:py-2 border grid grid-cols-1 min-[460px]:grid-cols-2 sm:flex sm:flex-row sm:flex-wrap lg:flex-nowrap sm:items-center sm:justify-between lg:justify-center gap-2 sm:gap-3 lg:gap-5 min-w-0 transition-colors duration-200"
          :class="tema === 'oscuro'
            ? 'bg-[#0f172a] border-emerald-300/45 text-slate-100 shadow-lg'
            : 'bg-white border-white text-slate-900 shadow-sm'"
        >
          <!-- Segmento 1: Cupos libres -->
          <div class="flex items-baseline gap-1.5 min-w-0 shrink-0">
            <span class="font-headline font-black text-xl sm:text-2xl leading-none tabular-nums" :class="cupoColor">
              {{ bloqueada ? "0" : libresEfectivos }}
            </span>
            <span
              class="text-xs sm:text-[13px] font-bold font-body leading-tight"
              :class="tema === 'oscuro' ? 'text-slate-100' : 'text-[#184320]'"
            >
              {{ etiquetaEstadoPrincipal }}
            </span>
            <span
              class="text-xs font-medium font-label tabular-nums"
              :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600'"
            >
              / {{ total }}
            </span>
          </div>

          <div
            class="hidden sm:block h-5 w-px shrink-0"
            :class="tema === 'oscuro' ? 'bg-slate-700' : 'bg-slate-200'"
            aria-hidden="true"
          />

          <!-- Segmento 2: Plazas ocupadas y vehículos en camino -->
          <div
            class="text-xs sm:text-[13px] font-semibold font-body leading-tight tabular-nums min-w-0 shrink-0"
            :class="tema === 'oscuro' ? 'text-slate-200' : 'text-slate-700'"
          >
            <span>{{ ocupadas }} ocupadas</span>
            <template v-if="enCaminoGlobal > 0">
              <span aria-hidden="true"> · </span>
              <span :class="tema === 'oscuro' ? 'text-[#facc15]' : 'text-[#8a6d00]'">
                {{ enCaminoGlobal }} en camino
              </span>
            </template>
          </div>

          <div
            class="hidden sm:block h-5 w-px shrink-0"
            :class="tema === 'oscuro' ? 'bg-slate-700' : 'bg-slate-200'"
            aria-hidden="true"
          />

          <!-- Segmento 3: Estado de frescura de sensores -->
          <div
            class="min-[460px]:col-span-2 sm:col-span-1 text-xs sm:text-[13px] font-semibold font-body leading-tight tabular-nums min-w-0 lg:shrink-0 break-words"
            :class="claseTextoTono(estadoFrescuraSensores.tono)"
          >
            {{ estadoFrescuraSensores.texto }}
          </div>
        </div>

        <!-- Zona 3: Reloj y fecha separados de los cupos libres sobre la franja verde institucional -->
        <div
          aria-label="Hora y fecha actual"
          class="col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 lg:col-start-3 lg:row-start-1 flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-x-2 gap-y-0.5 pt-1.5 sm:pt-0 sm:pr-3.5 border-t sm:border-t-0 sm:border-r border-white/20 tabular-nums min-w-0 shrink-0"
        >
          <span class="font-label text-sm sm:text-base lg:text-[17px] font-bold text-white leading-none">
            {{ horaActual }}
          </span>
          <span class="font-label text-[11px] font-semibold uppercase text-[#f3e69f] leading-tight">
            {{ fechaActual }}
          </span>
        </div>

        <!-- Zona 4: Botón circular del panel de control integrado al extremo derecho -->
        <button
          type="button"
          aria-haspopup="dialog"
          :aria-expanded="Boolean(operadorAbierto)"
          aria-label="Abrir panel de control de portería"
          title="Panel de control"
          class="col-start-2 row-start-1 sm:col-start-3 lg:col-start-4 justify-self-end w-[46px] h-[46px] rounded-full bg-white/15 hover:bg-white/25 active:scale-[0.97] border border-white/75 text-white transition-[transform,background-color] duration-200 cursor-pointer select-none flex items-center justify-center shrink-0 shadow-sm focus-visible:!outline-[#f3e69f]"
          @click="$emit('abrirOperador')"
        >
          <svg class="w-[20px] h-[20px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Lienzo operativo centrado dentro del resto del alto de pantalla (1920x1080 sin estirar) -->
    <div class="superficie-accesible flex-1 w-full px-[14px] pt-3 pb-16 sm:px-6 lg:px-8 xl:py-3 flex flex-col">
      <div class="max-w-[1340px] w-full mx-auto my-auto flex flex-col gap-3">
        <div
          v-if="!conectado"
          role="alert"
          class="rounded-xl border px-3.5 py-2 text-xs font-semibold flex items-center gap-2"
          :class="tema === 'oscuro'
            ? 'bg-red-950/60 border-red-800 text-red-200'
            : 'bg-red-50 border-red-300 text-[#991b1b]'"
        >
          <span>Sin enlace con el servidor de sensores. Reintentando conexión automática.</span>
        </div>

        <!-- Plano arquitectónico protagonista en proporción nativa 1200:580 sin estirar -->
        <main id="plano-parqueadero" class="w-full">
          <ParkingMap
            :bahias="bahias"
            :animaciones="animaciones"
            :talanquera="talanquera"
            :bloqueada="bloqueada"
            @select-espacio="() => $emit('abrirOperador')"
          />
        </main>

        <!-- Tarjeta compacta inferior: ocupación por parqueadero de estamento y ocupación general -->
        <section
          aria-label="Ocupación por sector y estado general del parqueadero"
          class="w-full rounded-2xl border overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 transition-colors duration-200"
          :class="tema === 'oscuro'
            ? 'bg-[#0f172a] border-slate-800 shadow-lg'
            : 'bg-white border-slate-300 shadow-sm'"
        >
          <div
            v-for="(item, idx) in estamentoLista"
            :key="item.key"
            class="px-3.5 py-2.5 sm:px-4 sm:py-2.5 flex flex-col justify-between gap-1.5 transition-colors min-w-0"
            :class="[
              esSectorAtenuado(item.libres, item.sinSenal)
                ? (tema === 'oscuro' ? 'bg-[#0b1120] border-slate-800' : 'bg-[#f1f5f9] border-slate-200')
                : esSectorDestacado(item.key, item.libres)
                  ? (tema === 'oscuro'
                    ? 'bg-emerald-950/35 ring-2 ring-inset ring-[#4ade80] border-slate-800'
                    : 'bg-emerald-50/70 ring-2 ring-inset ring-[#15803d] border-slate-200')
                  : (tema === 'oscuro'
                    ? 'border-slate-800'
                    : 'border-slate-200'),
              idx === 0 ? 'border-b lg:border-b-0 sm:border-r' : '',
              idx === 1 ? 'border-b lg:border-b-0 lg:border-r' : '',
              idx === 2 ? 'border-b sm:border-b-0 sm:border-r' : '',
            ]"
          >
            <div class="min-w-0">
              <span
                class="block text-[13px] sm:text-sm font-bold font-headline tracking-tight leading-tight break-words"
                :class="esSectorAtenuado(item.libres, item.sinSenal)
                  ? (tema === 'oscuro' ? 'text-[#cbd5e1]' : 'text-[#475569]')
                  : (tema === 'oscuro' ? 'text-white' : 'text-slate-900')"
              >
                Ocupación parqueadero {{ item.nombre }}
              </span>
              <span
                class="block text-[11px] sm:text-xs font-medium font-body leading-tight mt-0.5 tabular-nums break-words"
                :class="esSectorAtenuado(item.libres, item.sinSenal)
                  ? (tema === 'oscuro' ? 'text-[#94a3b8]' : 'text-[#475569]')
                  : (tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600')"
              >
                Bahías {{ item.rango }}
              </span>
            </div>

            <div class="flex items-baseline justify-between gap-2 flex-wrap">
              <div class="flex items-baseline gap-1">
                <span
                  class="text-xl sm:text-2xl font-headline font-black leading-none tabular-nums"
                  :class="esSectorAtenuado(item.libres, item.sinSenal)
                    ? (tema === 'oscuro' ? 'text-[#cbd5e1]' : 'text-[#475569]')
                    : claseTextoTono(item.tono)"
                >
                  {{ item.libres }}
                </span>
                <span
                  class="text-[11px] sm:text-xs font-semibold font-body"
                  :class="esSectorAtenuado(item.libres, item.sinSenal)
                    ? (tema === 'oscuro' ? 'text-[#94a3b8]' : 'text-[#475569]')
                    : (tema === 'oscuro' ? 'text-slate-200' : 'text-slate-700')"
                >
                  libres
                </span>
              </div>

              <div class="text-right">
                <span
                  class="block text-[11px] sm:text-xs font-label font-bold leading-tight tabular-nums"
                  :class="esSectorAtenuado(item.libres, item.sinSenal)
                    ? (tema === 'oscuro' ? 'text-[#94a3b8]' : 'text-[#475569]')
                    : claseTextoTono(item.tono)"
                >
                  {{ item.sinSenal ? "Sin señal" : `${item.pct}% ocupado` }}
                </span>
                <span
                  v-if="!item.sinSenal && item.enCamino > 0"
                  class="block text-[11px] font-semibold font-body leading-tight tabular-nums"
                  :class="tema === 'oscuro' ? 'text-[#facc15]' : 'text-[#8a6d00]'"
                >
                  {{ item.enCamino }} en camino
                </span>
              </div>
            </div>

            <div
              class="h-1.5 w-full rounded-full overflow-hidden flex"
              :class="tema === 'oscuro' ? 'bg-slate-800' : 'bg-slate-200'"
            >
              <div
                class="h-full shrink-0 transition-all duration-500"
                :class="esSectorAtenuado(item.libres, item.sinSenal)
                  ? (tema === 'oscuro' ? 'bg-slate-600' : 'bg-slate-400')
                  : claseBarraTono(item.tono)"
                :style="{ width: `${item.sinSenal ? 0 : item.pct}%` }"
              />
              <div
                v-if="!item.sinSenal && item.pctCamino > 0"
                class="h-full shrink-0 transition-all duration-500"
                :class="tema === 'oscuro' ? 'bg-[#fde047]' : 'bg-[#facc15]'"
                :style="{ width: `${item.pctCamino}%` }"
              />
            </div>
          </div>

      <!-- Celda 4: Ocupación general y umbrales operativos -->
      <div class="px-3.5 py-2.5 sm:px-4 sm:py-2.5 flex flex-col justify-between gap-1.5 min-w-0">
        <div class="min-w-0">
          <span
            class="block text-[13px] sm:text-sm font-bold font-headline tracking-tight leading-tight break-words"
            :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'"
          >
            Ocupación general
          </span>
          <div
            class="mt-0.5 text-[11px] sm:text-xs font-medium font-body flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-tight tabular-nums"
            :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600'"
          >
            <span>Amarillo: {{ UMBRAL_ALERTA_PCT }}%</span>
            <span aria-hidden="true">·</span>
            <span>Crítico: {{ UMBRAL_CRITICO_PCT }}%</span>
          </div>
        </div>

        <div class="flex items-baseline justify-between gap-2 flex-wrap">
          <div class="flex items-baseline gap-1">
            <span class="text-xl sm:text-2xl font-headline font-black leading-none tabular-nums" :class="porcentajeColor">
              {{ sinSenalGlobal ? "Sin dato" : `${pctOcupacion}%` }}
            </span>
            <span
              v-if="!sinSenalGlobal"
              class="text-[11px] sm:text-xs font-semibold font-body"
              :class="tema === 'oscuro' ? 'text-slate-200' : 'text-slate-700'"
            >
              ocupado
            </span>
          </div>
          <span
            v-if="!sinSenalGlobal && enCaminoGlobal > 0"
            class="text-[11px] sm:text-xs font-semibold font-body leading-tight tabular-nums"
            :class="tema === 'oscuro' ? 'text-[#facc15]' : 'text-[#8a6d00]'"
          >
            +{{ enCaminoGlobal }} en camino
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Ocupación general del parqueadero"
          :aria-valuenow="sinSenalGlobal ? 0 : pctOcupacion"
          aria-valuemin="0"
          aria-valuemax="100"
          class="h-1.5 w-full rounded-full overflow-hidden flex"
          :class="tema === 'oscuro' ? 'bg-slate-800' : 'bg-slate-200'"
        >
          <div
            class="h-full shrink-0 transition-all duration-500"
            :class="porcentajeBarColor"
            :style="{ width: `${sinSenalGlobal ? 0 : pctOcupacion}%` }"
          />
          <div
            v-if="!sinSenalGlobal && pctEnCamino > 0"
            class="h-full shrink-0 transition-all duration-500"
            :class="tema === 'oscuro' ? 'bg-[#fde047]' : 'bg-[#facc15]'"
            :style="{ width: `${pctEnCamino}%` }"
          />
        </div>
        </div>
      </section>
      </div>
    </div>

    <!-- Icono flotante independiente de accesibilidad en la esquina inferior derecha -->
    <Accesibilidad />
  </div>
</template>
