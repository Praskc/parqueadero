<script setup lang="ts">
// Botón flotante circular para volver al inicio cuando el usuario llega al final del desplazamiento vertical.
import { onMounted, onUnmounted, ref } from "vue";
import { movimientoReducidoActivo } from "../accesibilidad";
import { tema } from "../theme";

const mostrarBoton = ref(false);

function actualizarVisibilidadScroll() {
  if (typeof window === "undefined") return;
  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
  const altoVentana = window.innerHeight || document.documentElement.clientHeight || 0;
  const altoDocumento = document.documentElement.scrollHeight || 0;
  const recorridoDisponible = altoDocumento - altoVentana;

  mostrarBoton.value = recorridoDisponible > 48 && scrollTop + altoVentana >= altoDocumento - 36;
}

function volverArriba() {
  if (typeof window === "undefined") return;
  window.scrollTo({
    top: 0,
    behavior: movimientoReducidoActivo.value ? "auto" : "smooth",
  });
}

onMounted(() => {
  actualizarVisibilidadScroll();
  window.addEventListener("scroll", actualizarVisibilidadScroll, { passive: true });
  window.addEventListener("resize", actualizarVisibilidadScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("scroll", actualizarVisibilidadScroll);
  window.removeEventListener("resize", actualizarVisibilidadScroll);
});
</script>

<template>
  <Transition
    enter-from-class="opacity-0 translate-y-4 scale-90"
    enter-active-class="transition-[transform,opacity] duration-200 ease-out"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition-[transform,opacity] duration-150 ease-in"
    leave-to-class="opacity-0 translate-y-3 scale-90"
  >
    <div
      v-if="mostrarBoton"
      class="fixed bottom-[16px] right-[76px] sm:bottom-[20px] sm:right-[80px] z-30"
    >
      <button
        type="button"
        aria-label="Volver arriba"
        title="Volver arriba"
        class="superficie-accesible w-[48px] h-[48px] rounded-full border-2 transition-[transform,background-color] duration-200 cursor-pointer select-none flex items-center justify-center shadow-lg hover:scale-[1.03] active:scale-[0.98] focus-visible:!outline-[#f3e69f]"
        :class="tema === 'oscuro'
          ? 'bg-[#15803d] hover:bg-[#16a34a] border-[#0f172a] text-white ring-1 ring-emerald-400/70'
          : 'bg-[#15803d] hover:bg-[#166534] border-white text-white ring-1 ring-slate-900/15'"
        @click="volverArriba"
      >
        <svg
          class="w-[22px] h-[22px] shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </svg>
      </button>
    </div>
  </Transition>
</template>
