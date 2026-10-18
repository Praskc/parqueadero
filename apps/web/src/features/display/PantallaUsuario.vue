<script setup lang="ts">
/**
 * Kiosco público — variante "Sereno" (elegida por el equipo en el picker
 * de prototipos): superficies blancas, un solo acento verde (#15803d),
 * Barlow para la UI, Chakra Petch para las cifras, JetBrains Mono para
 * los datos. Cero repetición de datos y cero jerga de implementación.
 */
import { computed } from "vue";
import type { AnimacionMoto, Bahia, EstadoTalanquera } from "../../types/hmi";
import ParkingMap from "../parqueadero/ParkingMap.vue";
import UnisucreLogo from "../../shared/ui/UnisucreLogo.vue";

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
const hayEsperando = computed(() => props.animaciones.some((a) => a.etapa === "esperando"));
const animacionActiva = computed(() => props.animaciones[0] ?? null);

// ---------- Estado de guiado (lenguaje de motociclista, cero jerga) ----------
type Estado = "bloqueada" | "espera" | "movimiento" | "lleno" | "normal";
const estado = computed<Estado>(() =>
  props.bloqueada ? "bloqueada"
  : hayEsperando.value ? "espera"
  : animacionActiva.value ? "movimiento"
  : isFull.value ? "lleno"
  : "normal");

const COLOR_CLARO: Record<Estado, string> = {
  normal: "text-emerald-700", movimiento: "text-blue-700",
  espera: "text-amber-700", lleno: "text-amber-700", bloqueada: "text-red-600",
};
const TITULO: Record<Estado, string> = {
  normal: "Acceso habilitado", movimiento: "Movimiento en curso",
  espera: "Moto en espera", lleno: "Aforo completo", bloqueada: "Acceso suspendido",
};
const cupoColor = computed(() =>
  props.bloqueada ? "text-red-600" : isFull.value ? "text-amber-700" : "text-[#15803d]");
</script>

<template>
  <div class="max-w-6xl w-full mx-auto flex flex-col gap-4">
    <header class="bg-white border border-slate-200 rounded-2xl px-5 sm:px-7 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-center gap-4 min-w-0">
        <UnisucreLogo size="52" />
        <div class="min-w-0">
          <h1 class="text-lg sm:text-2xl font-extrabold tracking-tight text-emerald-950 uppercase leading-tight">
            Parqueadero de Motocicletas
          </h1>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
            Universidad de Sucre · Campus Puerta Roja
          </p>
        </div>
      </div>
      <div class="flex items-center gap-6 self-start md:self-auto">
        <div class="text-center">
          <div class="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            {{ bloqueada ? "Portería cerrada" : isFull ? "Aforo completo" : "Cupos libres" }}
          </div>
          <div class="font-tech font-bold text-5xl leading-none mt-1 tabular-nums" :class="cupoColor">
            {{ bloqueada ? "✕" : disponibles }}
          </div>
          <div class="text-[11px] font-mono text-slate-400 mt-1">de {{ total }}</div>
        </div>
        <div class="text-right font-mono">
          <div class="text-xl font-bold text-slate-900 leading-none">{{ horaActual }}</div>
          <div class="text-[10px] text-slate-500 uppercase mt-1">{{ fechaActual }}</div>
          <div class="mt-1.5 flex items-center gap-1.5 justify-end text-[10px] font-bold uppercase"
            :class="conectado ? 'text-emerald-700' : 'text-red-600'">
            <span class="w-2 h-2 rounded-full" :class="conectado ? 'bg-emerald-600' : 'bg-red-500'" />
            {{ conectado ? "Sistema en línea" : "Sin conexión" }}
          </div>
        </div>
      </div>
    </header>

    <div role="status" aria-live="polite" class="bg-white border border-slate-200 rounded-2xl px-5 py-3 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3.5 min-w-0">
        <div class="w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0" :class="COLOR_CLARO[estado]">
          <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
        <div class="min-w-0">
          <div class="text-[11px] font-extrabold uppercase tracking-widest" :class="COLOR_CLARO[estado]">{{ TITULO[estado] }}</div>
          <div class="text-sm font-semibold text-slate-700 truncate">
            <template v-if="estado === 'movimiento' && animacionActiva?.tipo === 'ingreso'">
              Bienvenido. Diríjase a la bahía <span class="font-black text-slate-900">{{ animacionActiva?.espacioId }}</span>
            </template>
            <template v-else-if="estado === 'movimiento'">Motocicleta saliendo del campus.</template>
            <template v-else-if="estado === 'normal'">Siga por la rampa de acceso. La talanquera se abre sola al detectar su moto.</template>
            <template v-else-if="estado === 'espera'">Aguarde un puesto libre junto a la portería.</template>
            <template v-else-if="estado === 'lleno'">No hay cupos. Espere la indicación del vigilante.</template>
            <template v-else>Portería cerrada por seguridad institucional.</template>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span class="w-2 h-2 rounded-full" :class="bloqueada ? 'bg-red-500' : 'bg-emerald-500'" />
        <span class="text-xs font-semibold text-slate-500">Talanquera {{ bloqueada ? "cerrada" : talanquera }}</span>
      </div>
    </div>

    <ParkingMap
      :bahias="bahias"
      :animaciones="animaciones"
      :talanquera="talanquera"
      :bloqueada="bloqueada"
    />

    <div class="flex justify-end">
      <button type="button" class="text-xs font-semibold text-slate-400 hover:text-slate-800 transition-colors cursor-pointer uppercase tracking-wider" @click="$emit('abrirOperador')">
        Consola de vigilancia
      </button>
    </div>
  </div>
</template>
