<script setup lang="ts">
import type { AnimacionMoto } from "../../types/hmi";
import MotoFigura from "./MotoFigura.vue";
import { ALTO_PLANO, ANCHO_PLANO } from "../../config/bahias";

/**
 * Moto en movimiento. Componente hoja aislado a propósito:
 * mutar `anim.posicionActual` cada frame solo re-renderiza este <g>,
 * no el plano SVG completo (ParkingMap).
 */
const props = defineProps<{ anim: AnimacionMoto }>();

const colorCarroceria = () =>
  props.anim.tipo === "salida"
    ? "#475569"
    : props.anim.origen === "sur"
      ? "#0369a1"
      : "#15803d";
</script>

<template>
  <g
    :transform="`translate(${(anim.posicionActual.x / 100) * ANCHO_PLANO}, ${(anim.posicionActual.y / 100) * ALTO_PLANO}) rotate(${anim.posicionActual.rotacion})`"
    filter="url(#shadow-unisucre)"
  >
    <!-- Haz del faro proyectado al pavimento (vista aérea) -->
    <path d="M 21 0 L 100 -26 L 100 26 Z" fill="url(#headlight-unisucre)" opacity="0.85" />
    <!-- Sombra de contacto en el pavimento -->
    <ellipse cx="0.8" cy="1" rx="21" ry="10" fill="rgba(15,23,42,0.32)" />
    <MotoFigura :color="colorCarroceria()" faro />

    <g transform="translate(0, -34)">
      <g v-if="anim.etapa === 'esperando'">
        <rect x="-48" y="-11" width="96" height="22" rx="4" fill="#0f172a" stroke="#0284c7" stroke-width="1.6" />
        <circle cx="-38" cy="0" r="3.5" fill="#38bdf8" class="animate-pulse" />
        <text x="4" y="3.5" fill="#f0f9ff" font-size="8" font-weight="900" text-anchor="middle">ESPERANDO CUPO</text>
      </g>
      <g v-else>
        <rect
          x="-44"
          y="-10"
          width="88"
          height="20"
          rx="4"
          :fill="anim.tipo === 'ingreso' ? (anim.origen === 'sur' ? '#0c4a6e' : '#064e3b') : '#1e293b'"
          :stroke="anim.tipo === 'ingreso' ? (anim.origen === 'sur' ? '#0284c7' : '#10b981') : '#94a3b8'"
          stroke-width="1.5"
        />
        <text x="0" y="3.5" fill="#ffffff" font-size="8.5" font-weight="bold" text-anchor="middle">
          {{ anim.tipo === 'ingreso' ? (anim.espacioId !== 'EN_ESPERA' ? `ASIGNADA: ${anim.espacioId}` : 'EN ENTRADA') : 'SALIENDO' }}
        </text>
      </g>
    </g>
  </g>
</template>
