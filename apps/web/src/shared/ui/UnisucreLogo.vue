<script setup lang="ts">
// Escudo oficial de la Universidad de Sucre (/public/unisucre.webp, relación 583:700).
import { tema } from "../theme";

defineProps<{
  size?: number | string;
  sobreFondoOscuro?: boolean;
}>();
</script>

<template>
  <img
    src="/unisucre.webp"
    alt="Escudo oficial de la Universidad de Sucre"
    :width="size || 48"
    decoding="async"
    class="shrink-0 object-contain select-none transition-[filter] duration-200"
    :class="sobreFondoOscuro || tema === 'oscuro'
      ? '[filter:drop-shadow(0_0_1.25px_rgba(255,255,255,0.92))_drop-shadow(0_3px_8px_rgba(2,6,23,0.5))]'
      : '[filter:drop-shadow(0_2px_5px_rgba(15,23,42,0.10))]'"
  />
</template>
