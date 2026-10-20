<script setup lang="ts">
import type { Bahia } from "../../types/hmi";
import { relativo } from "../../lib/tiempo";

defineProps<{ bahia: Bahia; ahora: number }>();
</script>

<template>
  <div class="relative bg-[#1e293b] border border-slate-700/80 rounded-xl p-3 min-h-[128px] flex flex-col justify-between overflow-hidden shadow-sm select-none">
    <!-- Asfalto interior con tinte sutil según estado -->
    <div
      class="absolute inset-1.5 rounded-lg pointer-events-none transition-colors"
      :class="bahia.estado === 'OCUPADO'
        ? 'bg-[#18202f]/80'
        : bahia.estado === 'LIBRE'
        ? 'bg-[#14261d]/80'
        : 'bg-[#1e293b]/80'"
    />
    
    <!-- Sin dato: demarcación diagonal sutil de mantenimiento -->
    <div
      v-if="bahia.estado === 'SIN_DATO'"
      class="absolute inset-1.5 rounded-lg parking-stripe opacity-40 pointer-events-none"
    />

    <!-- Demarcación vial termo-plástica: pintura blanca nítida reflectiva -->
    <div class="absolute inset-1.5 rounded-t-lg border-t-[2.5px] border-x-[2.5px] border-white/90 pointer-events-none" />
    <!-- Ticks de remate en la boca de entrada -->
    <div class="absolute bottom-1.5 left-0.5 w-2 h-0.5 bg-white pointer-events-none" />
    <div class="absolute bottom-1.5 right-0.5 w-2 h-0.5 bg-white pointer-events-none" />

    <!-- Mini tope de llanta de caucho con franjas reflectivas blancas -->
    <div class="relative mx-auto mt-0.5 w-24 h-2 bg-[#0f172a] rounded-xs border border-slate-700/60 flex items-center justify-around px-1">
      <span class="w-2.5 h-1 bg-slate-200 rounded-[0.5px]" />
      <span class="w-2.5 h-1 bg-slate-200 rounded-[0.5px]" />
      <span class="w-2.5 h-1 bg-slate-200 rounded-[0.5px]" />
      <span class="w-2.5 h-1 bg-slate-200 rounded-[0.5px]" />
    </div>

    <!-- Cabecera de la plaza: código pintado en pavimento y sensor IoT -->
    <div class="relative flex items-center justify-between mt-1 px-1">
      <span class="font-mono font-black text-lg text-white tracking-wider leading-none">{{ bahia.id }}</span>
      <!-- Sensor IoT con halo LED -->
      <div class="flex items-center gap-1.5">
        <span
          class="w-2.5 h-2.5 rounded-full border border-white/60 shadow-xs"
          :class="bahia.estado === 'LIBRE'
            ? 'bg-[#22c55e] animate-pulse shadow-[0_0_8px_#22c55e]'
            : bahia.estado === 'OCUPADO'
            ? 'bg-[#ef4444] shadow-[0_0_8px_#ef4444]'
            : 'bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]'"
        />
      </div>
    </div>

    <!-- Estado vial de la plaza -->
    <div class="relative px-1 mt-auto">
      <div
        class="text-[10px] font-black tracking-widest uppercase font-sans"
        :class="bahia.estado === 'LIBRE' ? 'text-[#22c55e]' : bahia.estado === 'OCUPADO' ? 'text-[#f87171]' : 'text-[#38bdf8]'"
      >
        {{ bahia.estado === "LIBRE" ? "● DISPONIBLE" : bahia.estado === "OCUPADO" ? "■ OCUPADA" : "◆ EN ESPERA" }}
      </div>
      <div class="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{{ relativo(bahia.ts, ahora) }}</div>
    </div>

    <div class="relative text-[9px] font-bold text-slate-500 uppercase tracking-wider px-1 pt-1 border-t border-slate-700/50 flex justify-between">
      <span>{{ bahia.id <= 'E05' ? 'Bahía Norte' : 'Bahía Sur' }}</span>
      <span class="text-slate-400">P{{ bahia.id.replace('E', '') }}</span>
    </div>
  </div>
</template>
