<script setup lang="ts">
import type { Bahia } from "../../types/hmi";
import { relativo } from "../../lib/tiempo";

/**
 * Tarjeta de bahía: un puesto del patio del plano, con sus colores literales.
 * Asfalto #334155 (el patio del plano), marco pintado amarillo #facc15,
 * tinte interior con los rgba EXACTOS de las bahías del plano y estado con
 * los colores de los indicadores del plano. Solo presenta: el kiosco no opera.
 */
defineProps<{ bahia: Bahia; ahora: number }>();
</script>

<template>
  <div class="relative bg-[#334155] border border-slate-600 rounded-xl p-2.5 min-h-[118px] flex flex-col justify-between overflow-hidden">
    <!-- Interior del puesto: tinte según estado (rgba exactos del plano) -->
    <div
      class="absolute inset-1.5 rounded-lg pointer-events-none"
      :class="bahia.estado === 'OCUPADO'
        ? 'bg-[rgba(239,68,68,0.28)]'
        : bahia.estado === 'LIBRE'
        ? 'bg-[rgba(34,197,94,0.24)]'
        : 'bg-[rgba(245,158,11,0.22)]'"
    />
    <!-- Sin dato: franja diagonal (la misma lengua del hatch del plano) -->
    <div
      v-if="bahia.estado === 'SIN_DATO'"
      class="absolute inset-1.5 rounded-lg parking-stripe pointer-events-none"
    />

    <!-- Marco pintado amarillo del puesto (#facc15, como las bahías del plano) -->
    <div class="absolute inset-1.5 rounded-lg border-2 border-[#facc15] pointer-events-none" />

    <div class="relative flex items-start justify-between gap-1">
      <span class="font-tech font-bold text-lg text-white leading-none">{{ bahia.id }}</span>
      <span
        class="w-2.5 h-2.5 rounded-full border border-slate-900 shrink-0 mt-0.5"
        :class="bahia.estado === 'LIBRE' ? 'bg-[#22c55e]' : bahia.estado === 'OCUPADO' ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'"
      />
    </div>

    <div class="relative">
      <div
        class="text-[10px] font-extrabold tracking-wider uppercase"
        :class="bahia.estado === 'LIBRE' ? 'text-[#22c55e]' : bahia.estado === 'OCUPADO' ? 'text-[#f87171]' : 'text-[#fbbf24]'"
      >
        {{ bahia.estado === "LIBRE" ? "Libre" : bahia.estado === "OCUPADO" ? "Ocupada" : "Sin dato" }}
      </div>
      <div class="text-[11px] font-mono text-slate-200 mt-0.5 truncate">{{ relativo(bahia.ts, ahora) }}</div>
    </div>

    <div class="relative text-[9px] font-semibold text-slate-400 uppercase tracking-wide truncate">
      {{ bahia.id <= 'E10' ? "Estudiantes" : bahia.id <= 'E20' ? "Docentes" : "Administrativos" }}
    </div>
  </div>
</template>
