<script setup lang="ts">
/**
 * Panel de accesibilidad del kiosco (alineado con la Guía de accesibilidad
 * web de MINTIC, que adopta WCAG 2.1 AA como piso para servicios públicos):
 *  - Escalado de texto (WCAG 1.4.4: el contenido escala hasta ~200% sin pérdida).
 *  - Alto contraste (WCAG 1.4.3: contraste reforzado para baja visión).
 * La preferencia persiste en localStorage: el kiosco es de uso público.
 */
import { onMounted, onUnmounted, ref, watch } from "vue";

const ESCALAS = [100, 125, 150, 200] as const;
const TAMANOS_BASE = { 100: "16px", 125: "20px", 150: "24px", 200: "32px" } as const;

const abierto = ref(false);
const escala = ref<(typeof ESCALAS)[number]>(100);
const contraste = ref(false);

function cargarPreferencias() {
  const e = Number(localStorage.getItem("accesibilidad:escala"));
  if (e === 125 || e === 150) escala.value = e;
  contraste.value = localStorage.getItem("accesibilidad:contraste") === "1";
}

function aplicar() {
  if (escala.value === 100) document.documentElement.style.removeProperty("font-size");
  else document.documentElement.style.fontSize = TAMANOS_BASE[escala.value];
  document.documentElement.classList.toggle("alto-contraste", contraste.value);
  localStorage.setItem("accesibilidad:escala", String(escala.value));
  localStorage.setItem("accesibilidad:contraste", contraste.value ? "1" : "0");
}

onMounted(() => {
  cargarPreferencias();
  aplicar();
  document.addEventListener("keydown", cerrarConEscape);
});
onUnmounted(() => document.removeEventListener("keydown", cerrarConEscape));

function cerrarConEscape(e: KeyboardEvent) {
  if (e.key === "Escape") abierto.value = false;
}

watch([escala, contraste], aplicar);

function alternarContraste() {
  contraste.value = !contraste.value;
}

function restablecer() {
  escala.value = 100;
  contraste.value = false;
}
</script>

<template>
  <!-- FAB flotante: fuera de los cards, siempre visible en la esquina -->
  <div class="fixed bottom-6 right-6 z-50">
    <button
      type="button"
      aria-label="Opciones de accesibilidad"
      :aria-expanded="abierto"
      class="w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-xl flex items-center justify-center transition-colors cursor-pointer border-2 border-slate-700"
      @click="abierto = !abierto"
    >
      <!-- Símbolo de accesibilidad (persona) -->
      <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="4.5" r="2" />
        <path d="M4.5 8.5c2.4.7 4.9 1 7.5 1s5.1-.3 7.5-1" />
        <path d="M12 9.5v5" />
        <path d="M9 20l3-5.5L15 20" />
      </svg>
    </button>

    <div
      v-if="abierto"
      class="absolute bottom-16 right-0 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-64 flex flex-col gap-3.5"
      role="dialog"
      aria-label="Accesibilidad"
    >
      <div>
        <p class="text-sm font-bold text-slate-900">Tamaño de texto</p>
        <div class="flex gap-1.5 mt-2">
          <button
            v-for="esc in ESCALAS"
            :key="esc"
            type="button"
            class="flex-1 py-2 rounded-lg font-semibold transition-colors cursor-pointer border"
            :class="escala === esc
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'"
            :style="{ fontSize: `${11 + (esc - 100) / 33}px` }"
            @click="escala = esc"
          >
            A{{ esc === 100 ? "" : esc === 125 ? "+" : "++" }}
          </button>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <p class="text-sm font-bold text-slate-900">Alto contraste</p>
        <button
          type="button"
          role="switch"
          :aria-checked="contraste"
          aria-label="Alto contraste"
          class="w-11 h-6 rounded-full transition-colors cursor-pointer relative"
          :class="contraste ? 'bg-slate-900' : 'bg-slate-200'"
          @click="alternarContraste"
        >
          <span
            class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
            :class="contraste ? 'left-[22px]' : 'left-0.5'"
          />
        </button>
      </div>

      <button
        type="button"
        class="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer text-left"
        @click="restablecer"
      >
        Restablecer
      </button>
    </div>
  </div>
</template>
