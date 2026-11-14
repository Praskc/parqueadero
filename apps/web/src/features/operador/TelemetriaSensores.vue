<script setup lang="ts">
import { tema } from "../../shared/theme";
import { ultimoNodoPorEspacio } from "../../services/logMqtt";
import type { AnimacionMoto, Bahia } from "../../types/hmi";
import { bloqueada, talanquera } from "../parqueadero/simulacionVial";
import { useOperador } from "./useOperador";

const props = defineProps<{
  bahias: Bahia[];
  animaciones: AnimacionMoto[];
  ahora: number;
}>();

const { haceDesde, lazoNorte, lazoSur, fotoceldaInterrumpida } =
  useOperador(props);
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="p-3.5 rounded-xl border" :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/80 border-slate-200'">
        <div class="text-xs font-bold uppercase" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">Servomotor talanquera</div>
        <div class="mt-1.5 text-xs font-mono tabular-nums">
          <div>Ángulo: <b>{{ bloqueada ? "0° (bloqueada)" : talanquera === "abierta" ? "-85° (abierta)" : talanquera === "abriendo" ? "-50°" : talanquera === "cerrando" ? "-25°" : "0° (cerrada)" }}</b></div>
          <div class="mt-0.5" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">Estado: {{ bloqueada ? "bloqueada" : talanquera }}</div>
        </div>
      </div>

      <div class="p-3.5 rounded-xl border" :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/80 border-slate-200'">
        <div class="text-xs font-bold uppercase" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">Lazos inductivos de acceso</div>
        <div class="mt-1.5 text-xs font-mono">
          <div>Carril norte: <b :class="lazoNorte ? (tema === 'oscuro' ? 'text-[#facc15]' : 'text-[#8a6d00]') : (tema === 'oscuro' ? 'text-emerald-400' : 'text-[#15803d]')">{{ lazoNorte ? "Presencia" : "Libre" }}</b></div>
          <div>Carril sur: <b :class="lazoSur ? (tema === 'oscuro' ? 'text-[#facc15]' : 'text-[#8a6d00]') : (tema === 'oscuro' ? 'text-emerald-400' : 'text-[#15803d]')">{{ lazoSur ? "Presencia" : "Libre" }}</b></div>
        </div>
      </div>

      <div class="p-3.5 rounded-xl border" :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/80 border-slate-200'">
        <div class="text-xs font-bold uppercase" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">Fotocelda de seguridad</div>
        <div class="mt-1.5 text-xs font-mono">
          <div>Haz óptico: <b :class="fotoceldaInterrumpida ? (tema === 'oscuro' ? 'text-red-400' : 'text-[#dc2626]') : (tema === 'oscuro' ? 'text-emerald-400' : 'text-[#15803d]')">{{ fotoceldaInterrumpida ? "Interrumpido" : "Despejado" }}</b></div>
          <div class="mt-0.5" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">Protección anti-cierre activa</div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-6 gap-2.5">
      <div
        v-for="b in bahias"
        :key="b.id"
        class="p-3 rounded-xl border flex flex-col justify-between transition-colors"
        :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold font-mono tabular-nums" :class="tema === 'oscuro' ? 'text-white' : 'text-slate-900'">{{ b.id }}</span>
          <span class="text-[10px] font-mono tabular-nums" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">{{ haceDesde(b.ts) }}</span>
        </div>
        <div
          class="my-1 text-[11px] font-mono tabular-nums font-bold"
          :class="b.estado === 'LIBRE'
            ? (tema === 'oscuro' ? 'text-emerald-400' : 'text-[#15803d]')
            : b.estado === 'OCUPADO'
              ? (tema === 'oscuro' ? 'text-red-400' : 'text-[#b91c1c]')
              : (tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600')"
        >
          {{ b.estado === "SIN_DATO" ? "SIN DATO" : b.estado }}
        </div>
        <div class="text-[10px] font-mono truncate" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'" :title="ultimoNodoPorEspacio[b.id]">
          Nodo: {{ ultimoNodoPorEspacio[b.id] ?? "inicial" }}
        </div>
      </div>
    </div>
  </div>
</template>
