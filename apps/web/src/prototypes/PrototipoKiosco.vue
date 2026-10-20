<script setup lang="ts">
/**
 * PROTOTIPO — 3 variantes del kiosco para elegir en vivo (skill `prototype`).
 * Ruta: /prototypes/kiosco (solo dev; no se importa nada de aquí en producción).
 *
 * Reglas comunes a TODAS las variantes (correcciones de las quejas del equipo):
 *  - Cero repetición de datos: cupos una sola vez, sin tarjetas de bahías
 *    (el plano ya las muestra), sin widget de anillo sobre el mapa.
 *  - Cero jerga: nada de "telemetría MQTT"; lenguaje de motociclista.
 *  - El plano es el héroe y no se toca.
 */
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import ParkingMap from "../features/parqueadero/ParkingMap.vue";
import UnisucreLogo from "../shared/ui/UnisucreLogo.vue";
import PanelOperador from "../features/operador/PanelOperador.vue";
import { useParqueadero } from "../features/parqueadero/useParqueadero";
import { conectado } from "../services/realtime";
import { animaciones, bloqueada, talanquera } from "../features/parqueadero/simulacionVial";

const { bahias, disponibles, total } = useParqueadero();
const ahora = ref(Date.now());
const consolaAbierta = ref(false);
const isFull = computed(() => disponibles.value === 0);
const hayEsperando = computed(() => animaciones.value.some((a) => a.etapa === "esperando"));
const animacionActiva = computed(() => animaciones.value[0] ?? null);

const hora = ref("");
const fecha = ref("");
let reloj: number | undefined;
function tic() {
  const d = new Date();
  hora.value = d.toLocaleTimeString("es-CO", { hour12: false, hour: "2-digit", minute: "2-digit" });
  fecha.value = d.toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase();
}
onMounted(() => {
  tic(); reloj = window.setInterval(tic, 1000);
  const t = window.setInterval(() => (ahora.value = Date.now()), 5000);
  relojTicker = t;
});
onUnmounted(() => { clearInterval(reloj); clearInterval(relojTicker); });
let relojTicker: number | undefined;

// ---------- Estado de guiado (lenguaje de motociclista, cero jerga) ----------
type Estado = "bloqueada" | "espera" | "movimiento" | "lleno" | "normal";
const estado = computed<Estado>(() =>
  bloqueada.value ? "bloqueada"
  : hayEsperando.value ? "espera"
  : animacionActiva.value ? "movimiento"
  : isFull.value ? "lleno"
  : "normal");

const COLOR_CLARO: Record<Estado, string> = {
  normal: "text-emerald-700", movimiento: "text-blue-700",
  espera: "text-sky-700", lleno: "text-red-600", bloqueada: "text-red-600",
};
const COLOR_ASFALTO: Record<Estado, string> = {
  normal: "text-[#4ade80]", movimiento: "text-[#93c5fd]",
  espera: "text-[#38bdf8]", lleno: "text-[#f87171]", bloqueada: "text-[#f87171]",
};
const TITULO: Record<Estado, string> = {
  normal: "Acceso habilitado", movimiento: "Movimiento en curso",
  espera: "Moto en espera", lleno: "Aforo completo", bloqueada: "Acceso suspendido",
};
const cupoColor = computed(() =>
  bloqueada.value ? "text-red-600" : isFull.value ? "text-red-600" : "text-[#15803d]");
const cupoColorAsfalto = computed(() =>
  bloqueada.value ? "text-[#f87171]" : isFull.value ? "text-[#f87171]" : "text-[#4ade80]");

// ---------- Picker (spec verbatim de PICKER.md) ----------
const VARIANTES = ["Sereno", "Señalética", "Pantalla completa"];
const v = ref((parseInt(new URLSearchParams(location.search).get("v") ?? "1", 10) || 1) - 1);
if (v.value < 0 || v.value > 2) v.value = 0;
const remount = ref(0);
const botones = ref<HTMLElement[]>([]);
const highlight = ref<HTMLElement | null>(null);
const listo = ref(false);

function moverHighlight() {
  const el = botones.value[v.value];
  const hl = highlight.value;
  if (!el || !hl) return;
  hl.style.width = `${el.offsetWidth}px`;
  hl.style.transform = `translateX(${el.offsetLeft}px)`;
}

function activar(i: number) {
  if (i < 0 || i >= VARIANTES.length) return;
  v.value = i;
  const url = new URL(location.href);
  url.searchParams.set("v", String(i + 1));
  history.replaceState(null, "", url);
  nextTick(moverHighlight);
}

function tecla(e: KeyboardEvent) {
  const t = e.target as HTMLElement;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= VARIANTES.length) activar(n - 1);
  else if (e.key === "ArrowRight") activar((v.value + 1) % VARIANTES.length);
  else if (e.key === "ArrowLeft") activar((v.value - 1 + VARIANTES.length) % VARIANTES.length);
  else if (e.key === "r" || e.key === "R") remount.value++;
}

onMounted(() => {
  document.addEventListener("keydown", tecla);
  window.addEventListener("resize", moverHighlight);
  nextTick(moverHighlight);
  requestAnimationFrame(() => requestAnimationFrame(() => { listo.value = true; moverHighlight(); }));
});
onUnmounted(() => {
  document.removeEventListener("keydown", tecla);
  window.removeEventListener("resize", moverHighlight);
});

const irAlKiosco = () => { consolaAbierta.value = true; };
</script>

<template>
  <!-- ============ V1 · SERENO — kiosco blanco, un solo acento verde ============ -->
  <div v-if="v === 0" :key="`v0-${remount}`" class="anim-entrada min-h-screen bg-slate-100 p-3 sm:p-5 flex flex-col gap-4">
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
            <div class="text-xl font-bold text-slate-900 leading-none">{{ hora }}</div>
            <div class="text-[10px] text-slate-500 uppercase mt-1">{{ fecha }}</div>
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

      <ParkingMap :bahias="bahias" :animaciones="animaciones" :talanquera="talanquera" :bloqueada="bloqueada" />

      <div class="flex justify-end">
        <button type="button" class="text-xs font-semibold text-slate-400 hover:text-slate-800 transition-colors cursor-pointer uppercase tracking-wider" @click="irAlKiosco">
          Consola de vigilancia
        </button>
      </div>
    </div>
  </div>

  <!-- ============ V2 · SEÑALÉTICA — placas del campus; asfalto solo en aforo y panel ============ -->
  <div v-else-if="v === 1" :key="`v1-${remount}`" class="anim-entrada min-h-screen bg-slate-200/70 p-3 sm:p-5 flex flex-col gap-4">
    <div class="max-w-6xl w-full mx-auto flex flex-col gap-4">
      <header class="bg-white border-2 border-slate-300 rounded-2xl px-5 sm:px-7 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-4 min-w-0">
          <div class="rounded-xl p-1 border-2 border-slate-300 shrink-0"><UnisucreLogo size="52" /></div>
          <div class="min-w-0">
            <h1 class="text-lg sm:text-2xl font-extrabold tracking-tight text-emerald-950 uppercase leading-tight">
              Parqueadero de Motocicletas
            </h1>
            <div class="flex gap-1 mt-1.5">
              <span class="h-[3px] w-12 rounded-full bg-[#facc15]" />
              <span class="h-[3px] w-12 rounded-full bg-[#facc15]" />
            </div>
            <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-1">
              Universidad de Sucre · Campus Puerta Roja
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 self-start md:self-auto">
          <div class="bg-[#334155] rounded-xl px-5 py-2.5 text-center">
            <div class="text-[10px] font-bold uppercase tracking-widest" :class="cupoColorAsfalto">
              {{ bloqueada ? "Portería cerrada" : isFull ? "Aforo completo" : "Cupos libres" }}
            </div>
            <div class="font-tech font-bold text-white text-4xl leading-none mt-1 tabular-nums">
              {{ bloqueada ? "✕" : disponibles }}
            </div>
            <div class="h-[2px] w-10 mx-auto mt-1.5 rounded-full bg-[#facc15]" />
            <div class="text-[10px] font-mono text-slate-300 mt-1">de {{ total }}</div>
          </div>
          <div class="bg-[#334155] rounded-xl px-3.5 py-2 text-right font-mono">
            <div class="text-base font-bold text-white leading-none">{{ hora }}</div>
            <div class="text-[9px] text-slate-300 uppercase mt-1">{{ fecha }}</div>
            <div class="mt-1 flex items-center gap-1.5 justify-end text-[9px] font-bold uppercase" :class="conectado ? 'text-[#4ade80]' : 'text-[#f87171]'">
              <span class="w-1.5 h-1.5 rounded-full" :class="conectado ? 'bg-[#4ade80]' : 'bg-[#f87171]'" />
              {{ conectado ? "En línea" : "Sin conexión" }}
            </div>
          </div>
        </div>
      </header>

      <div role="status" aria-live="polite" class="bg-[#334155] rounded-2xl border-2 border-slate-400 px-5 py-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0" :class="COLOR_ASFALTO[estado]">
            <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
          <div class="min-w-0">
            <div class="text-[11px] font-extrabold uppercase tracking-widest" :class="COLOR_ASFALTO[estado]">{{ TITULO[estado] }}</div>
            <div class="text-sm font-semibold text-slate-200 truncate">
              <template v-if="estado === 'movimiento' && animacionActiva?.tipo === 'ingreso'">
                Bienvenido. Diríjase a la bahía <span class="font-black text-white">{{ animacionActiva?.espacioId }}</span>
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
          <span class="w-2 h-2 rounded-full" :class="bloqueada ? 'bg-[#f87171]' : 'bg-[#4ade80]'" />
          <span class="text-xs font-semibold text-slate-200">Talanquera {{ bloqueada ? "cerrada" : talanquera }}</span>
        </div>
      </div>

      <ParkingMap :bahias="bahias" :animaciones="animaciones" :talanquera="talanquera" :bloqueada="bloqueada" />

      <div class="flex justify-end">
        <button type="button" class="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer uppercase tracking-wider" @click="irAlKiosco">
          Consola de vigilancia
        </button>
      </div>
    </div>
  </div>

  <!-- ============ V3 · PANTALLA COMPLETA — el plano es todo, placas de vidrio flotantes ============ -->
  <div v-else :key="`v2-${remount}`" class="anim-entrada relative min-h-screen bg-slate-100 flex items-center justify-center overflow-hidden">
    <ParkingMap :bahias="bahias" :animaciones="animaciones" :talanquera="talanquera" :bloqueada="bloqueada" />

    <!-- Placa de vidrio: identidad + cupos -->
    <div class="fixed top-4 left-4 bg-white/85 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg px-4 py-3 flex items-center gap-3.5">
      <UnisucreLogo size="44" />
      <div>
        <div class="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Universidad de Sucre · {{ bloqueada ? "Portería cerrada" : isFull ? "Aforo completo" : "Cupos libres" }}
        </div>
        <div class="flex items-baseline gap-1.5">
          <span class="font-tech font-bold text-4xl leading-none tabular-nums" :class="cupoColor">{{ bloqueada ? "✕" : disponibles }}</span>
          <span class="text-xs font-semibold text-slate-400">de {{ total }}</span>
        </div>
      </div>
    </div>

    <!-- Placa de vidrio: hora y estado -->
    <div class="fixed top-4 right-4 bg-white/85 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg px-4 py-3 text-right font-mono">
      <div class="text-lg font-bold text-slate-900 leading-none">{{ hora }}</div>
      <div class="text-[10px] text-slate-500 uppercase mt-1">{{ fecha }}</div>
      <div class="mt-1.5 flex items-center gap-1.5 justify-end text-[10px] font-bold uppercase"
        :class="conectado ? 'text-emerald-700' : 'text-red-600'">
        <span class="w-2 h-2 rounded-full" :class="conectado ? 'bg-emerald-600' : 'bg-red-500'" />
        {{ conectado ? "Sistema en línea" : "Sin conexión" }}
      </div>
    </div>

    <!-- Píldora de guiado flotante -->
    <div role="status" aria-live="polite"
      class="fixed bottom-24 left-1/2 -translate-x-1/2 max-w-[92vw] bg-white/90 backdrop-blur-md rounded-full border border-white/60 shadow-lg px-5 py-2.5 flex items-center gap-3">
      <div class="w-2.5 h-2.5 rounded-full shrink-0" :class="COLOR_CLARO[estado].replace('text-', 'bg-')" />
      <div class="text-sm font-semibold text-slate-800 truncate">
        <span class="font-extrabold" :class="COLOR_CLARO[estado]">{{ TITULO[estado] }} — </span>
        <template v-if="estado === 'movimiento' && animacionActiva?.tipo === 'ingreso'">
          Diríjase a la bahía <span class="font-black text-slate-900">{{ animacionActiva?.espacioId }}</span>
        </template>
        <template v-else-if="estado === 'movimiento'">Motocicleta saliendo del campus.</template>
        <template v-else-if="estado === 'normal'">Siga por la rampa de acceso.</template>
        <template v-else-if="estado === 'espera'">Aguarde un puesto libre junto a la portería.</template>
        <template v-else-if="estado === 'lleno'">No hay cupos disponibles.</template>
        <template v-else>Portería cerrada por seguridad.</template>
      </div>
    </div>

    <button type="button"
      class="fixed bottom-24 right-4 bg-white/85 backdrop-blur-md rounded-xl border border-white/60 shadow-lg px-3.5 py-2 text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer uppercase tracking-wider"
      @click="irAlKiosco">
      Consola
    </button>
  </div>

  <!-- Consola real sobre cualquier variante -->
  <PanelOperador
    v-if="consolaAbierta"
    :bahias="bahias"
    :disponibles="disponibles"
    :animaciones="animaciones"
    :ahora="ahora"
    @cerrar="consolaAbierta = false"
  />

  <!-- ============ PICKER (spec verbatim) ============ -->
  <nav class="proto-picker" :data-ready="listo || undefined" aria-label="Prototype variants">
    <span ref="highlight" class="proto-picker-highlight" aria-hidden="true"></span>
    <button
      v-for="(nombre, i) in VARIANTES" :key="nombre"
      :ref="(el) => { if (el) botones[i] = el as HTMLElement }"
      class="proto-picker-item"
      :data-active="v === i || undefined"
      :aria-current="v === i ? 'true' : undefined"
      @click="activar(i)"
    >{{ nombre }}</button>
    <span class="proto-picker-divider" aria-hidden="true"></span>
    <button class="proto-picker-item proto-picker-replay" aria-label="Replay animation (R)" @click="remount++">↻</button>
  </nav>
</template>

<style>
/* ---- Picker: copia verbatim de PICKER.md ---- */
.proto-picker {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(10, 10, 10, 0.82);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  backdrop-filter: blur(12px) saturate(1.4);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08) inset,
    0 8px 24px rgba(0, 0, 0, 0.24),
    0 2px 6px rgba(0, 0, 0, 0.12);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
  user-select: none;
  -webkit-user-select: none;
}
.proto-picker-highlight {
  position: absolute;
  top: 4px;
  left: 0;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  will-change: transform;
}
.proto-picker[data-ready] .proto-picker-highlight {
  transition:
    transform 250ms cubic-bezier(0.23, 1, 0.32, 1),
    width 250ms cubic-bezier(0.23, 1, 0.32, 1);
}
@media (prefers-reduced-motion: reduce) {
  .proto-picker[data-ready] .proto-picker-highlight { transition: none; }
}
.proto-picker-item {
  position: relative;
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font: inherit;
  cursor: pointer;
  transition: color 150ms ease-out;
}
.proto-picker-item:hover { color: rgba(255, 255, 255, 0.85); }
.proto-picker-item:active { transform: scale(0.97); }
.proto-picker-item:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.4);
  outline-offset: 2px;
}
.proto-picker-item[data-active] { color: #fff; }
.proto-picker-divider {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: rgba(255, 255, 255, 0.12);
}
.proto-picker-replay { padding: 0 10px; font-size: 14px; }

/* ---- Entrada de variante (para que R tenga sentido) ---- */
.anim-entrada { animation: proto-entrar 250ms cubic-bezier(0.23, 1, 0.32, 1); }
@keyframes proto-entrar {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .anim-entrada { animation: none; }
}
</style>
