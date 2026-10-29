<script setup lang="ts">
// Tablero público de disponibilidad vehicular, Campus Puerta Roja (Universidad de Sucre)
import { computed } from "vue";
import { ESTAMENTOS } from "../../config/bahias";
import { tema, toggleTema } from "../../shared/theme";
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
  talanqueraSentido?: "entrada" | "salida";
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

// Sin lectura no se inventan ceros.
const sinLectura = computed(() => !props.conectado || sinSenalGlobal.value);

const valorCupos = computed(() => {
  if (sinLectura.value) return "—";
  if (props.bloqueada) return "0";
  return String(libresEfectivos.value);
});
const valorOcupadas = computed(() => (sinLectura.value ? "—" : String(ocupadas.value)));
const valorEnCamino = computed(() => (sinLectura.value ? "—" : String(enCaminoGlobal.value)));

const claseValorCupos = computed(() => {
  if (sinLectura.value) return tema.value === "oscuro" ? "text-slate-400" : "text-[#64748b]";
  return cupoColor.value;
});

const claseEtiquetaCupos = computed(() => {
  if (!props.conectado || props.bloqueada) {
    return tema.value === "oscuro" ? "text-[#f87171]" : "text-[#b91c1c]";
  }
  return tema.value === "oscuro" ? "text-white" : "text-[#184320]";
});

const claseValorOcupadas = computed(() => {
  if (sinLectura.value) return tema.value === "oscuro" ? "text-slate-500" : "text-[#94a3b8]";
  return tema.value === "oscuro" ? "text-white" : "text-[#1f2937]";
});

const claseValorCamino = computed(() => {
  if (sinLectura.value) return tema.value === "oscuro" ? "text-slate-500" : "text-[#94a3b8]";
  return enCaminoGlobal.value > 0
    ? tema.value === "oscuro"
      ? "text-[#fbbf24]"
      : "text-[#a06300]"
    : tema.value === "oscuro"
      ? "text-slate-500"
      : "text-neutral-400";
});

// Edad del dato de sensores con cambio de color por antigüedad.
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
  if (min < 60) {
    return { texto: `Sensores: hace ${min} min (lectura antigua)`, tono: "critico" };
  }
  const horas = Math.floor(min / 60);
  if (horas < 48) {
    return { texto: `Sensores: hace ${horas} h (lectura antigua)`, tono: "critico" };
  }
  const dias = Math.floor(horas / 24);
  return { texto: `Sensores: hace ${dias} días (lectura antigua)`, tono: "critico" };
});

const detalleFrescura = computed(() =>
  estadoFrescuraSensores.value.texto.replace(/^Sensores:\s*/, ""),
);

// Versión corta para el segmento de estado.
const resumenSensores = computed(() => {
  if (!props.conectado) return "Sin conexión";
  if (props.ultimaActualizacion === null) return "Sin lectura";
  const seg = Math.max(0, Math.floor((props.ahora - props.ultimaActualizacion) / 1000));
  if (seg < 5) return "Ahora";
  if (seg < 60) return `Hace ${seg} s`;
  const min = Math.floor(seg / 60);
  if (min < 60) return `Hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 48) return `Hace ${horas} h`;
  return `Hace ${Math.floor(horas / 24)} d`;
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
  if (isFull.value) return "Aforo completo";
  return libresEfectivos.value === 1 ? "Cupo libre" : "Cupos libres";
});
</script>

<template>
  <div class="flex-1 w-full flex flex-col">
    <!-- Barra superior institucional: marca, panel de telemetría, reloj y controles -->
    <header
      class="superficie-accesible w-full border-b transition-colors duration-200"
      :class="tema === 'oscuro'
        ? 'bg-[#133519] border-emerald-950 text-white'
        : 'bg-[#184320] border-[#0f2f14] text-white'"
    >
      <div
        class="cabecera-grid max-w-[1404px] w-full mx-auto px-[14px] sm:px-6 xl:px-8 py-2.5 sm:py-3 items-center gap-x-2.5 sm:gap-x-4 xl:gap-x-5 gap-y-2.5"
      >
        <!-- 1. Marca institucional -->
        <div class="[grid-area:marca] flex items-center gap-2 sm:gap-3 min-w-0">
          <UnisucreLogo
            size="46"
            sobre-fondo-oscuro
            class="w-8 sm:w-10 xl:w-[44px] h-auto shrink-0"
          />
          <span class="hidden sm:block h-10 w-px bg-[#f3e69f]/70 shrink-0" aria-hidden="true" />
          <div class="min-w-0">
            <p class="text-[9px] sm:text-[10px] xl:text-[11px] font-label font-bold uppercase tracking-[0.16em] xl:tracking-[0.2em] text-[#f3e69f] leading-none">
              Universidad de Sucre
            </p>
            <h1 class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
              <span class="font-headline text-[19px] sm:text-[22px] xl:text-[27px] font-extrabold uppercase tracking-wide text-white leading-none">
                Parqueadero
              </span>
              <span class="hidden sm:inline font-body text-[12px] xl:text-[15px] font-medium text-white/70 leading-none">
                Campus Puerta Roja
              </span>
            </h1>
          </div>
        </div>

        <!-- 2. Cinta de telemetría: instrumento plano de cuatro lecturas -->
        <div
          role="status"
          aria-live="polite"
          class="[grid-area:telemetria] cabecera-telemetria w-full rounded-md border transition-colors duration-200"
          :class="tema === 'oscuro'
            ? 'bg-[#0f172a] border-emerald-300/25'
            : 'bg-white border-[#dfe6db]'"
        >
          <!-- Cupos libres: lectura dominante, siempre con el mismo esqueleto -->
          <div class="tel-primario flex items-center gap-2.5 px-3 py-2.5 sm:px-3.5 min-[1400px]:px-0 min-[1400px]:py-0 min-[1400px]:pr-4 min-w-0">
            <span
              class="font-label font-bold text-[26px] sm:text-[30px] min-[1400px]:text-[34px] leading-none tabular-nums shrink-0"
              :class="claseValorCupos"
            >
              {{ valorCupos }}
            </span>
            <span class="flex flex-col justify-center min-w-0">
              <span
                class="font-headline text-[10px] min-[1400px]:text-[11px] font-bold uppercase tracking-[0.08em] leading-none whitespace-nowrap"
                :class="claseEtiquetaCupos"
              >
                {{ etiquetaEstadoPrincipal }}
              </span>
              <span
                class="font-label text-[10px] leading-none mt-1 whitespace-nowrap uppercase tracking-[0.02em]"
                :class="tema === 'oscuro' ? 'text-slate-400' : 'text-[#6b7280]'"
              >
                / {{ total }} total
              </span>
            </span>
          </div>

          <span class="tel-sep" aria-hidden="true" />

          <!-- Ocupadas -->
          <div class="tel-ocupadas flex flex-col items-center justify-center px-3 py-2 sm:px-3.5 min-[1400px]:px-4 min-[1400px]:py-0 min-w-0">
            <span
              class="font-label font-bold text-[17px] min-[1400px]:text-[18px] leading-none tabular-nums"
              :class="claseValorOcupadas"
            >
              {{ valorOcupadas }}
            </span>
            <span
              class="font-headline text-[10px] font-semibold uppercase tracking-[0.08em] leading-none mt-1 whitespace-nowrap"
              :class="tema === 'oscuro' ? 'text-slate-400' : 'text-[#6b7280]'"
            >
              {{ ocupadas === 1 && !sinLectura ? "Ocupada" : "Ocupadas" }}
            </span>
          </div>

          <span class="tel-sep" aria-hidden="true" />

          <!-- En camino -->
          <div class="tel-camino flex flex-col items-center justify-center px-3 py-2 sm:px-3.5 min-[1400px]:px-4 min-[1400px]:py-0 min-w-0">
            <span
              class="font-label font-bold text-[17px] min-[1400px]:text-[18px] leading-none tabular-nums"
              :class="claseValorCamino"
            >
              {{ valorEnCamino }}
            </span>
            <span
              class="font-headline text-[10px] font-semibold uppercase tracking-[0.08em] leading-none mt-1 whitespace-nowrap"
              :class="enCaminoGlobal > 0 && !sinLectura
                ? (tema === 'oscuro' ? 'text-[#fcd34d]' : 'text-[#8a5a00]')
                : (tema === 'oscuro' ? 'text-slate-400' : 'text-[#6b7280]')"
            >
              En camino
            </span>
          </div>

          <span class="tel-sep" aria-hidden="true" />

          <!-- Estado de los sensores: punto, rótulo y edad corta de la lectura -->
          <div
            class="tel-estado flex items-center gap-2 px-3 py-2 sm:px-3.5 min-[1400px]:px-0 min-[1400px]:pl-4 min-[1400px]:pr-1 min-w-0"
            :title="estadoFrescuraSensores.texto"
            :aria-label="`Sensores: ${detalleFrescura}`"
          >
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="claseBarraTono(estadoFrescuraSensores.tono)"
              aria-hidden="true"
            />
            <span class="flex flex-col justify-center leading-none min-w-0">
              <span
                class="font-headline text-[9px] font-semibold uppercase tracking-[0.14em]"
                :class="tema === 'oscuro' ? 'text-slate-400' : 'text-[#6b7280]'"
              >
                Sensores
              </span>
              <span
                class="font-headline text-[11px] font-bold uppercase tracking-[0.04em] mt-1 whitespace-nowrap tabular-nums"
                :class="claseTextoTono(estadoFrescuraSensores.tono)"
              >
                {{ resumenSensores }}
              </span>
            </span>
          </div>
        </div>

        <!-- 3. Reloj y fecha -->
        <div
          aria-label="Hora y fecha actual"
          class="[grid-area:reloj] flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-x-2 gap-y-0.5 pt-1.5 sm:pt-0 sm:pr-3.5 xl:pr-4 border-t sm:border-t-0 sm:border-r border-white/20 tabular-nums min-w-0 shrink-0"
        >
          <span class="font-label text-[15px] sm:text-[18px] xl:text-[26px] font-bold text-white leading-none">
            {{ horaActual }}
          </span>
          <span class="font-label text-[10px] sm:text-[9px] xl:text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f3e69f] leading-tight">
            {{ fechaActual }}
          </span>
        </div>

        <!-- 4. Controles: tema y consola -->
        <div
          class="[grid-area:controles] justify-self-end flex items-center gap-2 sm:gap-2.5 xl:gap-4 shrink-0"
        >
          <!-- Interruptor sol/luna: único control de tema de la interfaz -->
          <button
            type="button"
            role="switch"
            :aria-checked="tema === 'oscuro'"
            :aria-label="tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
            :title="tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'"
            class="relative w-[52px] h-[30px] sm:w-[56px] sm:h-[32px] xl:w-[58px] xl:h-[34px] rounded-full border transition-colors duration-200 cursor-pointer select-none shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e69f]"
            :class="tema === 'oscuro'
              ? 'bg-[#08200f] border-emerald-300/60'
              : 'bg-[#0d2712] border-white/30 hover:border-white/50'"
            @click="toggleTema"
          >
            <span class="absolute inset-0 flex items-center justify-between px-[7px] pointer-events-none" aria-hidden="true">
              <svg
                class="w-[12px] h-[12px] transition-colors"
                :class="tema === 'oscuro' ? 'text-[#f3e69f]/50' : 'text-white/65'"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
              <svg
                class="w-[12px] h-[12px] transition-colors"
                :class="tema === 'oscuro' ? 'text-[#f3e69f]' : 'text-white/65'"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
              >
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
              </svg>
            </span>
            <span
              aria-hidden="true"
              class="absolute top-[2px] w-[24px] h-[24px] sm:w-[26px] sm:h-[26px] xl:w-[28px] xl:h-[28px] rounded-full bg-white shadow-sm flex items-center justify-center transition-[left,color] duration-200"
              :class="tema === 'oscuro' ? 'left-[26px] sm:left-[26px] xl:left-[28px] text-[#133519]' : 'left-[2px] text-[#8a6d00]'"
            >
              <svg v-if="tema === 'oscuro'" class="w-[13px] h-[13px] xl:w-[14px] xl:h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
              </svg>
              <svg v-else class="w-[13px] h-[13px] xl:w-[14px] xl:h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            </span>
          </button>

          <!-- Acceso a la consola de portería -->
          <button
            type="button"
            aria-haspopup="dialog"
            :aria-expanded="Boolean(operadorAbierto)"
            aria-label="Abrir panel de control de portería"
            title="Panel de control"
            class="h-[36px] sm:h-[38px] xl:h-[42px] pl-2 pr-2 sm:pl-2.5 sm:pr-3 xl:pl-4 xl:pr-5 rounded-full bg-white hover:bg-[#f3e69f] active:scale-[0.98] border border-white text-[#184320] transition-[transform,background-color] duration-200 cursor-pointer select-none flex items-center gap-1.5 sm:gap-2 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e69f]"
            @click="$emit('abrirOperador')"
          >
            <svg class="w-[16px] h-[16px] xl:w-[18px] xl:h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
              <circle cx="9" cy="6" r="2.2" fill="white" />
              <circle cx="15" cy="12" r="2.2" fill="white" />
              <circle cx="7" cy="18" r="2.2" fill="white" />
            </svg>
            <span class="hidden md:inline font-headline font-bold text-[11px] xl:text-[13px] uppercase tracking-wide leading-none">
              Consola
            </span>
          </button>
        </div>
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
            :talanquera-sentido="talanqueraSentido"
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
                  {{ item.libres === 1 ? "libre" : "libres" }}
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
