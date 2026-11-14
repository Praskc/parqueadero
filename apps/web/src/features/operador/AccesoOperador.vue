<script setup lang="ts">
import { ref } from "vue";
import { verificarToken } from "../../services/api";
import { guardarToken, limpiarToken } from "../../services/adminToken";
import { tema } from "../../shared/theme";
import UnisucreLogo from "../../shared/ui/UnisucreLogo.vue";

const emit = defineEmits<{
  (e: "desbloqueado"): void;
  (e: "cerrar"): void;
}>();

const tokenIngresado = ref("");
const mostrarToken = ref(false);
const errorToken = ref("");
const verificando = ref(false);

async function desbloquear() {
  if (!tokenIngresado.value || verificando.value) return;
  verificando.value = true;
  errorToken.value = "";
  try {
    if (await verificarToken(tokenIngresado.value)) {
      guardarToken(tokenIngresado.value);
      emit("desbloqueado");
    } else {
      limpiarToken();
      errorToken.value =
        "Clave inválida o bloqueada temporalmente por intentos. Vuelve a intentarlo.";
    }
  } catch {
    errorToken.value =
      "No se pudo contactar al servidor. Verifica que el backend esté en ejecución.";
  } finally {
    verificando.value = false;
  }
}
</script>

<template>
  <div
    class="superficie-accesible rounded-2xl border max-w-md w-full shadow-2xl overflow-hidden transition-colors"
    :class="tema === 'oscuro'
      ? 'bg-[#0f172a] border-slate-800 text-slate-100'
      : 'bg-white border-slate-300 text-slate-800'"
  >
    <div
      class="px-5 py-3.5 border-b flex items-center justify-between gap-3"
      :class="tema === 'oscuro' ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'"
    >
      <div class="flex items-center gap-3 min-w-0">
        <UnisucreLogo size="36" class="w-9 h-auto shrink-0" />
        <div class="min-w-0">
          <h2
            id="titulo-consola-operador"
            class="text-sm font-bold font-headline tracking-wide uppercase truncate"
            :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'"
          >
            Panel de Control
          </h2>
          <p class="text-xs truncate" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600'">
            Portería Campus Puerta Roja
          </p>
        </div>
      </div>
      <button
        type="button"
        aria-label="Cerrar panel de control"
        class="w-[44px] h-[44px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0"
        :class="tema === 'oscuro'
          ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
          : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'"
        @click="emit('cerrar')"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <form class="p-6 flex flex-col gap-4" @submit.prevent="desbloquear">
      <p class="text-sm leading-relaxed" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-700'">
        Ingresa la clave de operador para gestionar la barrera vehicular, las 30 plazas y el libro de registros.
      </p>

      <div class="flex flex-col gap-1.5">
        <label for="token-operador" class="text-xs font-bold uppercase tracking-wide" :class="tema === 'oscuro' ? 'text-slate-200' : 'text-slate-800'">
          Clave de operador
        </label>
        <div class="relative flex items-center">
          <input
            id="token-operador"
            v-model="tokenIngresado"
            :type="mostrarToken ? 'text' : 'password'"
            autocomplete="off"
            spellcheck="false"
            :disabled="verificando"
            class="w-full min-h-[44px] pl-3.5 pr-12 py-2.5 rounded-xl border font-mono text-sm transition-colors"
            :class="tema === 'oscuro'
              ? 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-400'
              : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-500'"
            placeholder="Clave de caseta"
          />
          <button
            type="button"
            :aria-label="mostrarToken ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            :title="mostrarToken ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            :aria-pressed="mostrarToken"
            class="absolute right-0.5 min-w-[44px] min-h-[44px] p-2 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            :class="tema === 'oscuro'
              ? 'text-slate-300 hover:text-white hover:bg-slate-800'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
            @click="mostrarToken = !mostrarToken"
          >
            <svg v-if="!mostrarToken" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </button>
        </div>
      </div>

      <p v-if="errorToken" role="alert" class="text-xs font-semibold" :class="tema === 'oscuro' ? 'text-[#f87171]' : 'text-[#b91c1c]'">
        {{ errorToken }}
      </p>

      <button
        type="submit"
        :disabled="!tokenIngresado || verificando"
        class="w-full min-h-[44px] py-2.5 rounded-xl font-bold font-headline text-xs sm:text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
        :class="!tokenIngresado || verificando
          ? (tema === 'oscuro' ? 'bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-slate-200 text-slate-500 cursor-not-allowed')
          : 'bg-[#15803d] hover:bg-emerald-800 text-white cursor-pointer'"
      >
        <span>{{ verificando ? "Verificando…" : "Ingresar al panel" }}</span>
      </button>
    </form>
  </div>
</template>
