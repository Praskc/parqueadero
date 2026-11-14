<script setup lang="ts">
import { tema } from "../../shared/theme";
import type { AnimacionMoto, Bahia } from "../../types/hmi";
import { usePanelPublico } from "./usePanelPublico";

const props = defineProps<{
  bahias: Bahia[];
  animaciones: AnimacionMoto[];
  total: number;
  conectado: boolean;
  bloqueada: boolean;
  ultimaActualizacion: number | null;
  ahora: number;
}>();

const {
  ocupadas,
  enCaminoGlobal,
  sinLectura,
  valorCupos,
  valorOcupadas,
  valorEnCamino,
  claseValorCupos,
  claseEtiquetaCupos,
  claseValorOcupadas,
  claseValorCamino,
  estadoFrescuraSensores,
  detalleFrescura,
  resumenSensores,
  claseTextoTono,
  claseBarraTono,
  etiquetaEstadoPrincipal,
} = usePanelPublico(props);
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    class="[grid-area:telemetria] cabecera-telemetria w-full rounded-md border transition-colors duration-200"
    :class="tema === 'oscuro'
      ? 'bg-[#0f172a] border-emerald-300/25'
      : 'bg-white border-[#dfe6db]'"
  >
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
</template>
