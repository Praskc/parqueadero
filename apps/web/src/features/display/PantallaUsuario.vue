<script setup lang="ts">
import { tema, toggleTema } from "../../shared/theme";
import Accesibilidad from "../../shared/ui/Accesibilidad.vue";
import UnisucreLogo from "../../shared/ui/UnisucreLogo.vue";
import type { AnimacionMoto, Bahia, EstadoTalanquera } from "../../types/hmi";
import ParkingMap from "../parqueadero/ParkingMap.vue";
import CintaTelemetria from "./CintaTelemetria.vue";
import ResumenOcupacion from "./ResumenOcupacion.vue";

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
</script>

<template>
  <div class="flex-1 w-full flex flex-col">
    <header
      class="superficie-accesible w-full border-b transition-colors duration-200"
      :class="tema === 'oscuro'
        ? 'bg-[#133519] border-emerald-950 text-white'
        : 'bg-[#184320] border-[#0f2f14] text-white'"
    >
      <div
        class="cabecera-grid max-w-[1404px] w-full mx-auto px-[14px] sm:px-6 xl:px-8 py-2.5 sm:py-3 items-center gap-x-2.5 sm:gap-x-4 xl:gap-x-5 gap-y-2.5"
      >
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

        <CintaTelemetria
          :bahias="bahias"
          :animaciones="animaciones"
          :total="total"
          :conectado="conectado"
          :bloqueada="bloqueada"
          :ultima-actualizacion="ultimaActualizacion"
          :ahora="ahora"
        />

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

        <div
          class="[grid-area:controles] justify-self-end flex items-center gap-2 sm:gap-2.5 xl:gap-4 shrink-0"
        >
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

        <ResumenOcupacion
          :bahias="bahias"
          :animaciones="animaciones"
          :total="total"
          :conectado="conectado"
          :bloqueada="bloqueada"
          :ultima-actualizacion="ultimaActualizacion"
          :ahora="ahora"
        />
      </div>
    </div>

    <Accesibilidad />
  </div>
</template>
