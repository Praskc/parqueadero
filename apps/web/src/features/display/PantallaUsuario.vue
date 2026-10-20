<script setup lang="ts">
/**
 * Kiosco público — Sistema "Campus Puerta Roja"
 * Señalética vial y control de acceso en tiempo real para motocicletas.
 * Soporta Modo Claro (predeterminado) y Modo Oscuro con selector interactivo.
 */
import { computed } from "vue";
import type { AnimacionMoto, Bahia, EstadoTalanquera } from "../../types/hmi";
import ParkingMap from "../parqueadero/ParkingMap.vue";
import UnisucreLogo from "../../shared/ui/UnisucreLogo.vue";
import { tema, toggleTema } from "../../shared/theme";

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
  ahora: number;
}>();

defineEmits<{ (e: "abrirOperador"): void }>();

const isFull = computed(() => props.disponibles === 0);

const cupoColor = computed(() =>
  props.bloqueada
    ? "text-[#dc2626]"
    : isFull.value
      ? "text-[#dc2626]"
      : tema.value === "oscuro"
        ? "text-emerald-400"
        : "text-[#15803d]");
</script>

<template>
  <div class="max-w-6xl w-full mx-auto flex flex-col gap-4">
    <!-- Anuncio para lectores de pantalla: los cupos cambian en vivo por WS. -->
    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {{
        bloqueada
          ? "Portería cerrada. Ingreso suspendido."
          : isFull
            ? `Aforo completo. ${total} de ${total} puestos ocupados.`
            : `${disponibles} de ${total} puestos disponibles.`
      }}
      {{ conectado ? "" : "Sin conexión con el sistema." }}
    </p>

    <!-- Encabezado Campus Puerta Roja con soporte Claro / Oscuro -->
    <header
      class="rounded-2xl px-5 sm:px-7 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-200"
      :class="tema === 'oscuro'
        ? 'bg-[#0f172a] border border-slate-800 shadow-xl'
        : 'bg-white border border-slate-200 shadow-sm'"
    >
      <div class="flex items-center gap-4 min-w-0">
        <UnisucreLogo size="52" />
        <div class="min-w-0">
          <h1
            class="text-xl sm:text-2xl font-black tracking-wide uppercase font-headline leading-tight"
            :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'"
          >
            Campus Puerta Roja
          </h1>
          <p
            class="text-xs font-semibold uppercase tracking-wider font-body mt-0.5"
            :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-500'"
          >
            Parqueadero de Motocicletas
          </p>
        </div>
      </div>

      <div class="flex items-center flex-wrap gap-4 sm:gap-5 self-start md:self-auto">
        <!-- Contador de Cupos -->
        <div
          class="text-center px-4 py-1.5 rounded-xl border transition-colors"
          :class="tema === 'oscuro' ? 'bg-slate-900/70 border-slate-800' : 'bg-slate-50 border-slate-200'"
        >
          <div
            class="text-[11px] font-bold uppercase tracking-widest font-headline"
            :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-500'"
          >
            {{ bloqueada ? "Portería cerrada" : isFull ? "Aforo completo" : "Cupos libres" }}
          </div>
          <div class="font-headline font-black text-5xl leading-none mt-1 tabular-nums" :class="cupoColor">
            {{ bloqueada ? "✕" : disponibles }}
          </div>
          <div
            class="text-[11px] font-label mt-1"
            :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-500'"
          >
            de {{ total }}
          </div>
        </div>

        <!-- Reloj y Conexión -->
        <div class="text-right font-label">
          <div
            class="text-xl font-bold leading-none tabular-nums"
            :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'"
          >
            {{ horaActual }}
          </div>
          <div
            class="text-[10px] uppercase mt-1"
            :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-500'"
          >
            {{ fechaActual }}
          </div>
          <div
            class="mt-1.5 flex items-center gap-1.5 justify-end text-[10px] font-bold uppercase"
            :class="conectado ? 'text-emerald-500' : 'text-red-500'"
          >
            <span class="w-2 h-2 rounded-full" :class="conectado ? 'bg-emerald-500' : 'bg-red-500'" />
            {{ conectado ? "Control en línea" : "Sin conexión" }}
          </div>
        </div>
      </div>
    </header>

    <!-- Plano principal de estacionamiento (Grilla completa 10 plazas contiguas) -->
    <ParkingMap
      :bahias="bahias"
      :animaciones="animaciones"
      :talanquera="talanquera"
      :bloqueada="bloqueada"
      @select-espacio="() => $emit('abrirOperador')"
    />
  </div>
</template>
