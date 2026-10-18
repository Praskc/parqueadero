<script setup lang="ts">
/**
 * Widget flotante de ocupación (anillo doble) sobre el plano.
 * Puerto a Vue nativo del "OccupancyRingChart" de la maqueta (React + Recharts):
 * mismo diseño, ahora en SVG puro sin dependencias externas.
 *
 * Anillo exterior: % ocupación total. Anillo interior: desglose por zonas
 * físicas del campus — Norte (E01–E05) y Sur (E06–E10).
 */
import { computed, ref, watch } from "vue";
import type { Bahia } from "../../types/hmi";

const props = withDefaults(
  defineProps<{
    bahias: Bahia[];
    disponibles: number;
    bloqueada?: boolean;
  }>(),
  { bloqueada: false },
);

const colapsado = ref(false);

const total = computed(() => props.bahias.length);
const ocupados = computed(() => props.bahias.filter((b) => b.estado === "OCUPADO").length);
const porcentaje = computed(() => (total.value === 0 ? 0 : Math.round((ocupados.value / total.value) * 100)));
const lleno = computed(() => props.disponibles === 0);

const norteOcup = computed(() => props.bahias.filter((b) => b.posicion.y < 50 && b.estado === "OCUPADO").length);
const norteTotal = computed(() => props.bahias.filter((b) => b.posicion.y < 50).length || 1);
const surOcup = computed(() => props.bahias.filter((b) => b.posicion.y >= 50 && b.estado === "OCUPADO").length);
const surTotal = computed(() => props.bahias.filter((b) => b.posicion.y >= 50).length || 1);

const colorAnillo = computed(() =>
  props.bloqueada || lleno.value
    ? "#dc2626"
    : porcentaje.value >= 70
      ? "#ea580c"
      : porcentaje.value >= 40
        ? "#ca8a04"
        : "#16a34a",
);

// Animación suave del porcentaje mostrado (lerp por rAF)
const pctSuave = ref(0);
let raf = 0;
watch(porcentaje, (destino) => {
  cancelAnimationFrame(raf);
  const origen = pctSuave.value;
  const t0 = performance.now();
  const DUR = 450;
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / DUR);
    const e = 1 - Math.pow(1 - p, 3);
    pctSuave.value = origen + (destino - origen) * e;
    if (p < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}, { immediate: true });

// Geometría de los anillos (coordenadas SVG 90×90)
const R_EXT = 34;
const C_EXT = 2 * Math.PI * R_EXT;
const dashExt = computed(() => {
  if (total.value === 0) return `${C_EXT} 0`;
  return `${(pctSuave.value / 100) * C_EXT} ${C_EXT}`;
});

const R_INT = 25;
const C_INT = 2 * Math.PI * R_INT;
/** Segmentos del anillo interior: Norte ocup., Norte libre, Sur ocup., Sur libre. */
const segmentos = computed(() => {
  const base = norteTotal.value + surTotal.value;
  const partes = [
    { valor: norteOcup.value, color: "#0284c7", titulo: `Norte ocupadas: ${norteOcup.value}` },
    { valor: Math.max(0, norteTotal.value - norteOcup.value), color: "#e0f2fe", titulo: `Norte libres: ${norteTotal.value - norteOcup.value}` },
    { valor: surOcup.value, color: "#7c3aed", titulo: `Sur ocupadas: ${surOcup.value}` },
    { valor: Math.max(0, surTotal.value - surOcup.value), color: "#ede9fe", titulo: `Sur libres: ${surTotal.value - surOcup.value}` },
  ];
  let acumulado = 0;
  return partes.map((p) => {
    const largo = (p.valor / base) * C_INT;
    const seg = {
      ...p,
      dash: `${Math.max(0, largo - 0.8)} ${C_INT - Math.max(0, largo - 0.8)}`,
      offset: C_INT / 4 - acumulado, // arranca a las 12 en punto
      opacidad: p.valor > 0 ? 1 : 0,
    };
    acumulado += largo;
    return seg;
  });
});
</script>

<template>
  <div
    class="absolute top-2 right-2 z-30 transition-all duration-300 ease-in-out select-none"
    :class="colapsado ? 'w-auto' : 'w-36 sm:w-40'"
  >
    <div
      class="bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-md overflow-hidden transition-all duration-300"
      :class="colapsado ? 'p-1.5' : 'p-2'"
    >
      <div class="flex items-center justify-between" :class="colapsado ? 'gap-1.5' : 'mb-1'">
        <!-- Colapsado: chip compacto -->
        <button
          v-if="colapsado"
          type="button"
          class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer text-[11px] font-bold"
          title="Expandir gráfico de ocupación"
          @click="colapsado = false"
        >
          <span
            class="w-2 h-2 rounded-full"
            :class="bloqueada ? 'bg-red-500' : lleno ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'"
          />
          <span class="font-mono text-emerald-800 font-extrabold">{{ porcentaje }}%</span>
          <span class="text-[9px] text-slate-500 uppercase tracking-wide">Aforo</span>
          <svg class="w-3 h-3 text-slate-400 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <template v-else>
          <span class="text-[8.5px] font-extrabold tracking-wider text-slate-400 uppercase font-mono">Ocupación</span>
          <button
            type="button"
            class="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Minimizar gráfico"
            @click="colapsado = true"
          >
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </template>
      </div>

      <div v-show="!colapsado" class="flex flex-col gap-1.5 w-full">
        <div class="flex items-center justify-between border-b border-slate-100 pb-1">
          <span class="relative flex h-1.5 w-1.5">
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              :class="bloqueada ? 'bg-red-400' : lleno ? 'bg-amber-400' : 'bg-emerald-400'"
            />
            <span
              class="relative inline-flex rounded-full h-1.5 w-1.5"
              :class="bloqueada ? 'bg-red-500' : lleno ? 'bg-amber-500' : 'bg-emerald-500'"
            />
          </span>
          <span
            class="text-[8px] font-bold px-1 py-0.2 rounded"
            :class="bloqueada ? 'bg-red-100 text-red-700' : lleno ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'"
          >
            {{ bloqueada ? "BLOQ" : lleno ? "LLENO" : `${porcentaje}%` }}
          </span>
        </div>

        <!-- Anillo doble en SVG puro -->
        <div class="relative w-full flex items-center justify-center">
          <svg viewBox="0 0 90 90" class="w-[86px] h-[86px]">
            <!-- fondo anillo exterior -->
            <circle cx="45" cy="45" :r="R_EXT" fill="none" stroke="#f1f5f9" stroke-width="9" />
            <!-- anillo exterior: ocupación total -->
            <circle
              cx="45" cy="45" :r="R_EXT" fill="none"
              :stroke="colorAnillo" stroke-width="9"
              :stroke-dasharray="dashExt"
              :stroke-dashoffset="C_EXT / 4"
              stroke-linecap="butt"
              class="transition-all duration-300"
            >
              <title>Ocupadas: {{ ocupados }}/{{ total }}</title>
            </circle>
            <!-- fondo anillo interior -->
            <circle cx="45" cy="45" :r="R_INT" fill="none" stroke="#f8fafc" stroke-width="8" />
            <!-- segmentos por zona -->
            <circle
              v-for="(s, i) in segmentos" :key="i"
              cx="45" cy="45" :r="R_INT" fill="none"
              :stroke="s.color" stroke-width="8"
              :stroke-dasharray="s.dash" :stroke-dashoffset="s.offset"
              :opacity="s.opacidad"
              class="transition-all duration-500"
            >
              <title>{{ s.titulo }}</title>
            </circle>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span class="text-xs font-black tracking-tight leading-none font-mono" :style="{ color: colorAnillo }">
              {{ porcentaje }}%
            </span>
            <span class="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">aforo</span>
          </div>
        </div>

        <div class="flex items-center justify-between text-[9px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
          <span class="text-slate-500 font-medium">Ocup: <b class="text-slate-800 font-mono">{{ ocupados }}/{{ total }}</b></span>
          <span class="text-slate-300">|</span>
          <span class="text-slate-500 font-medium">Libres: <b class="text-emerald-700 font-mono">{{ disponibles }}</b></span>
        </div>

        <div class="flex items-center justify-between text-[8px] text-slate-500 px-0.5">
          <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Est: {{ norteOcup }}/{{ norteTotal }}
          </span>
          <span class="flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Doc: {{ surOcup }}/{{ surTotal }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
