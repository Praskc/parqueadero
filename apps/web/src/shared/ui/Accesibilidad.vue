<script setup lang="ts">
// Menú flotante de accesibilidad web (WCAG 2.1 AA) con tipografía para dislexia, fuente legible, escala de grises y subrayado de enlaces.
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  ESCALAS_TEXTO,
  alternarFuenteLectura,
  altoContraste,
  enlacesSubrayados,
  escalaGrises,
  escalaTexto,
  espaciadoAmplio,
  focoDestacado,
  fuenteLectura,
  inicializarAccesibilidad,
  reducirMovimiento,
  restablecerAccesibilidad,
} from "../accesibilidad";
import { tema } from "../theme";

const abierto = ref(false);
const contenedorRef = ref<HTMLElement | null>(null);

const cantidadAjustesActivos = computed(() => {
  let n = 0;
  if (escalaTexto.value !== 100) n += 1;
  if (fuenteLectura.value !== "estandar") n += 1;
  if (espaciadoAmplio.value) n += 1;
  if (enlacesSubrayados.value) n += 1;
  if (escalaGrises.value) n += 1;
  if (altoContraste.value) n += 1;
  if (focoDestacado.value) n += 1;
  if (reducirMovimiento.value) n += 1;
  return n;
});

const ajusteActivo = computed(() => cantidadAjustesActivos.value > 0);

interface OpcionSwitch {
  id: string;
  titulo: string;
  descripcion: string;
  ariaLabel: string;
  activo: boolean;
  alternar: () => void;
}

const opcionesLectura = computed<OpcionSwitch[]>(() => [
  {
    id: "fuente-dislexia",
    titulo: "Letra para dislexia",
    descripcion: "Tipografía OpenDyslexic con base pesada",
    ariaLabel: "Activar letra para dislexia",
    activo: fuenteLectura.value === "dislexia",
    alternar: () => alternarFuenteLectura("dislexia"),
  },
  {
    id: "fuente-legible",
    titulo: "Fuente legible",
    descripcion: "Trazo abierto sin letras condensadas",
    ariaLabel: "Activar fuente legible",
    activo: fuenteLectura.value === "legible",
    alternar: () => alternarFuenteLectura("legible"),
  },
  {
    id: "espaciado-amplio",
    titulo: "Espaciado amplio",
    descripcion: "Separa letras, palabras y renglones",
    ariaLabel: "Activar espaciado amplio de texto",
    activo: espaciadoAmplio.value,
    alternar: () => {
      espaciadoAmplio.value = !espaciadoAmplio.value;
    },
  },
  {
    id: "enlaces-subrayados",
    titulo: "Enlaces subrayados",
    descripcion: "Subraya y demarca todos los enlaces",
    ariaLabel: "Subrayar todos los enlaces",
    activo: enlacesSubrayados.value,
    alternar: () => {
      enlacesSubrayados.value = !enlacesSubrayados.value;
    },
  },
]);

const opcionesVision = computed<OpcionSwitch[]>(() => [
  {
    id: "alto-contraste",
    titulo: "Alto contraste",
    descripcion: "Refuerza bordes y textos secundarios",
    ariaLabel: "Activar alto contraste",
    activo: altoContraste.value,
    alternar: () => {
      altoContraste.value = !altoContraste.value;
    },
  },
  {
    id: "escala-grises",
    titulo: "Escala de grises",
    descripcion: "Convierte la pantalla a tonos neutros",
    ariaLabel: "Activar escala de grises",
    activo: escalaGrises.value,
    alternar: () => {
      escalaGrises.value = !escalaGrises.value;
    },
  },
  {
    id: "foco-destacado",
    titulo: "Puntero y foco destacados",
    descripcion: "Amplía el cursor y el marco de teclado",
    ariaLabel: "Destacar puntero y foco de teclado",
    activo: focoDestacado.value,
    alternar: () => {
      focoDestacado.value = !focoDestacado.value;
    },
  },
  {
    id: "reducir-movimiento",
    titulo: "Reducir movimiento",
    descripcion: "Detiene la brisa y acorta recorridos",
    ariaLabel: "Reducir animaciones y movimiento",
    activo: reducirMovimiento.value,
    alternar: () => {
      reducirMovimiento.value = !reducirMovimiento.value;
    },
  },
]);

function gestionarTeclado(e: KeyboardEvent) {
  if (e.key === "Escape" && abierto.value) {
    abierto.value = false;
  }
}

function gestionarClickFuera(e: MouseEvent) {
  if (!abierto.value || !contenedorRef.value) return;
  if (!contenedorRef.value.contains(e.target as Node)) {
    abierto.value = false;
  }
}

onMounted(() => {
  inicializarAccesibilidad();
  document.addEventListener("keydown", gestionarTeclado);
  document.addEventListener("mousedown", gestionarClickFuera);
});

onUnmounted(() => {
  document.removeEventListener("keydown", gestionarTeclado);
  document.removeEventListener("mousedown", gestionarClickFuera);
});
</script>

<template>
  <div ref="contenedorRef" class="fixed bottom-[16px] right-[16px] sm:bottom-[20px] sm:right-[20px] z-40">
    <button
      type="button"
      aria-label="Opciones de accesibilidad"
      title="Accesibilidad"
      aria-haspopup="dialog"
      :aria-expanded="abierto"
      class="superficie-accesible relative w-[48px] h-[48px] rounded-full border-2 transition-all duration-200 cursor-pointer select-none flex items-center justify-center shadow-lg hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d]"
      :class="tema === 'oscuro'
        ? 'bg-[#15803d] hover:bg-[#16a34a] border-[#0f172a] text-white ring-1 ring-emerald-400/70'
        : 'bg-[#15803d] hover:bg-[#166534] border-white text-white ring-1 ring-slate-900/15'"
      @click="abierto = !abierto"
    >
      <svg class="w-[22px] h-[22px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="4.5" r="2" />
        <path d="M4.5 8.5c2.4.7 4.9 1 7.5 1s5.1-.3 7.5-1" />
        <path d="M12 9.5v5" />
        <path d="M9 20l3-5.5L15 20" />
      </svg>
      <span
        v-if="ajusteActivo"
        aria-hidden="true"
        class="absolute -top-[3px] -right-[3px] min-w-[18px] h-[18px] px-1 rounded-full bg-[#facc15] text-[#0f172a] text-[10px] font-bold font-label tabular-nums flex items-center justify-center border-2 leading-none"
        :class="tema === 'oscuro' ? 'border-[#0f172a]' : 'border-white'"
      >
        {{ cantidadAjustesActivos }}
      </span>
    </button>

    <div
      v-if="abierto"
      class="superficie-accesible absolute right-0 left-auto bottom-[calc(100%+12px)] top-auto z-50 rounded-2xl shadow-2xl border w-[min(22rem,calc(100vw-32px))] sm:w-[23.5rem] max-h-[calc(100dvh-96px)] flex flex-col overflow-hidden transition-colors"
      :class="tema === 'oscuro'
        ? 'bg-[#0f172a] border-slate-700 text-slate-100'
        : 'bg-white border-slate-300 text-slate-900'"
      role="dialog"
      aria-label="Preferencias de accesibilidad"
    >
      <div
        class="px-4 py-3 border-b flex items-center justify-between gap-2 shrink-0"
        :class="tema === 'oscuro' ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-slate-50/80'"
      >
        <p class="text-sm font-bold" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">
          Accesibilidad visual y lectura
        </p>
        <span
          v-if="ajusteActivo"
          class="text-xs font-semibold tabular-nums"
          :class="tema === 'oscuro' ? 'text-[#4ade80]' : 'text-[#15803d]'"
        >
          {{ cantidadAjustesActivos }} {{ cantidadAjustesActivos === 1 ? "activo" : "activos" }}
        </span>
      </div>

      <div class="p-4 overflow-y-auto flex flex-col gap-3.5">
        <!-- Escala de texto -->
        <div>
          <p class="text-xs font-bold" :class="tema === 'oscuro' ? 'text-slate-200' : 'text-slate-800'">
            Tamaño de texto
          </p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-1.5">
            <button
              v-for="esc in ESCALAS_TEXTO"
              :key="esc"
              type="button"
              :aria-pressed="escalaTexto === esc"
              class="min-h-[44px] py-1.5 rounded-lg text-xs font-label font-bold transition-colors cursor-pointer border tabular-nums"
              :class="escalaTexto === esc
                ? 'bg-[#15803d] text-white border-[#15803d]'
                : (tema === 'oscuro'
                  ? 'bg-slate-900 text-slate-200 border-slate-700 hover:border-slate-500'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-400')"
              @click="escalaTexto = esc"
            >
              {{ esc }}%
            </button>
          </div>
        </div>

        <!-- Grupo 1: Lectura, dislexia y enlaces -->
        <div
          class="pt-3 border-t flex flex-col gap-2.5"
          :class="tema === 'oscuro' ? 'border-slate-800' : 'border-slate-200'"
        >
          <p class="text-xs font-bold" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-700'">
            Lectura y enlaces
          </p>

          <div
            v-for="item in opcionesLectura"
            :key="item.id"
            class="flex items-center justify-between gap-2.5 min-w-0"
          >
            <div class="min-w-0">
              <p class="text-sm font-bold leading-snug break-words" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">
                {{ item.titulo }}
              </p>
              <p class="text-xs leading-snug break-words" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600'">
                {{ item.descripcion }}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="item.activo"
              :aria-label="item.ariaLabel"
              class="min-w-[48px] min-h-[44px] flex items-center justify-end cursor-pointer shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d]"
              @click="item.alternar"
            >
              <span
                class="w-[48px] h-[28px] rounded-full transition-colors relative block border"
                :class="item.activo
                  ? 'bg-[#15803d] border-[#15803d]'
                  : (tema === 'oscuro' ? 'bg-slate-800 border-slate-600' : 'bg-slate-200 border-slate-300')"
              >
                <span
                  class="absolute top-[2px] w-[22px] h-[22px] rounded-full bg-white shadow transition-transform"
                  :class="item.activo ? 'left-[22px]' : 'left-[2px]'"
                />
              </span>
            </button>
          </div>
        </div>

        <!-- Grupo 2: Visión, color e interacción -->
        <div
          class="pt-3 border-t flex flex-col gap-2.5"
          :class="tema === 'oscuro' ? 'border-slate-800' : 'border-slate-200'"
        >
          <p class="text-xs font-bold" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-700'">
            Color, contraste y orientación
          </p>

          <div
            v-for="item in opcionesVision"
            :key="item.id"
            class="flex items-center justify-between gap-2.5 min-w-0"
          >
            <div class="min-w-0">
              <p class="text-sm font-bold leading-snug break-words" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">
                {{ item.titulo }}
              </p>
              <p class="text-xs leading-snug break-words" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600'">
                {{ item.descripcion }}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="item.activo"
              :aria-label="item.ariaLabel"
              class="min-w-[48px] min-h-[44px] flex items-center justify-end cursor-pointer shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803d]"
              @click="item.alternar"
            >
              <span
                class="w-[48px] h-[28px] rounded-full transition-colors relative block border"
                :class="item.activo
                  ? 'bg-[#15803d] border-[#15803d]'
                  : (tema === 'oscuro' ? 'bg-slate-800 border-slate-600' : 'bg-slate-200 border-slate-300')"
              >
                <span
                  class="absolute top-[2px] w-[22px] h-[22px] rounded-full bg-white shadow transition-transform"
                  :class="item.activo ? 'left-[22px]' : 'left-[2px]'"
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        class="px-4 py-2.5 border-t flex flex-wrap items-center justify-between gap-2 shrink-0"
        :class="tema === 'oscuro' ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-slate-50/80'"
      >
        <button
          type="button"
          class="min-h-[44px] px-2 text-xs font-bold transition-colors cursor-pointer rounded-lg text-left"
          :class="tema === 'oscuro' ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-950'"
          @click="restablecerAccesibilidad"
        >
          Restablecer ajustes
        </button>
        <button
          type="button"
          class="min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          :class="tema === 'oscuro'
            ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
            : 'bg-slate-100 text-[#15803d] hover:bg-slate-200'"
          @click="abierto = false"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>
