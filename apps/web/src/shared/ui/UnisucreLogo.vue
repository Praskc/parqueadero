<script setup lang="ts">
/**
 * Escudo oficial de la Universidad de Sucre (archivo en /public).
 * Mantiene la misma interfaz `size` para no tocar los consumidores.
 */
defineProps<{
  size?: number | string;
}>();
</script>

<template>
  <img
    src="/unisucre.webp"
    alt="Escudo de la Universidad de Sucre"
    :width="size || 48"
    class="shrink-0 object-contain"
  />
</template>
