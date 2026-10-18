<script setup lang="ts">
defineProps<{
  size?: number | string;
}>();
</script>

<template>
  <svg
    viewBox="0 0 200 240"
    :width="size || 48"
    :height="size || 58"
    class="shrink-0"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <!-- Escudo exterior oficial verde institucional de la Universidad de Sucre -->
    <path
      d="M 10 14 L 62 14 L 72 26 L 128 26 L 138 14 L 190 14 L 190 170 L 100 228 L 10 170 Z"
      fill="#ffffff"
      stroke="#166534"
      stroke-width="12"
      stroke-linejoin="miter"
    />

    <!-- Textos institucionales -->
    <text x="100" y="42" fill="#166534" font-size="12" font-weight="900" font-family="sans-serif" text-anchor="middle" letter-spacing="1">
      UNIVERSIDAD DE SUCRE
    </text>

    <!-- Texto lateral CIENCIA -->
    <text
      x="-115"
      y="26"
      transform="rotate(-90)"
      fill="#166534"
      font-size="11"
      font-weight="900"
      font-family="sans-serif"
      text-anchor="middle"
      letter-spacing="2"
    >
      CIENCIA
    </text>

    <!-- Texto lateral TECNOLOGÍA -->
    <text
      x="115"
      y="-174"
      transform="rotate(90)"
      fill="#166534"
      font-size="10.5"
      font-weight="900"
      font-family="sans-serif"
      text-anchor="middle"
      letter-spacing="1.5"
    >
      TECNOLOGÍA
    </text>

    <!-- Texto inferior DESARROLLO -->
    <text x="100" y="184" fill="#166534" font-size="12" font-weight="900" font-family="sans-serif" text-anchor="middle" letter-spacing="1.5">
      DESARROLLO
    </text>

    <!-- Monograma institucional estilizado "U" y "S" en barras verdes -->
    <g fill="#166534">
      <!-- Rama izquierda de la U -->
      <rect x="40" y="48" width="18" height="96" />
      
      <!-- Base de la U y diagonal de la S -->
      <polygon points="40,144 58,144 148,80 148,68 130,68 40,132" />
      
      <!-- Barra derecha superior -->
      <rect x="146" y="48" width="18" height="42" />

      <!-- Barra diagonal interior -->
      <polygon points="40,172 164,84 164,98 64,172" />

      <!-- Base inferior derecha de la S -->
      <rect x="122" y="138" width="42" height="18" />
    </g>
  </svg>
</template>
