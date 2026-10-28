<script setup lang="ts">
// Silueta cenital arquitectónica de automóvil orientada a +x (sedan, suv o compacto) en tonos metálicos neutros.
withDefaults(
  defineProps<{
    color?: string;
    tipo?: "sedan" | "suv" | "compacto";
    faro?: boolean;
  }>(),
  {
    color: "#e2e8f0",
    tipo: "sedan",
    faro: false,
  },
);
</script>

<template>
  <g class="auto-figura select-none pointer-events-none">
    <!-- Haz luminoso proyectado únicamente cuando el automóvil circula en vía -->
    <g v-if="faro">
      <path d="M 24 -9 L 64 -20 C 68 -13, 68 -3, 64 0 L 24 -5 Z" fill="url(#headlight-unisucre)" opacity="0.68" />
      <path d="M 24 5 L 64 0 C 68 3, 68 13, 64 20 L 24 9 Z" fill="url(#headlight-unisucre)" opacity="0.68" />
    </g>

    <!-- Sombra de contacto nítida bajo el chasis (sin desenfoque difuso que invada textos vecinos) -->
    <path
      d="M -22.5,-11.5 C -16,-13.2 -8,-13.2 0,-12.8 C 8,-13.2 17,-13 22.5,-10.5 C 25.5,-8.2 26,-4.2 26,0 C 26,4.2 25.5,8.2 22.5,10.5 C 17,13 8,13.2 0,12.8 C -8,13.2 -16,13.2 -22.5,11.5 C -25.2,9.2 -25.5,4.8 -25.5,0 C -25.5,-4.8 -25.2,-9.2 -22.5,-11.5 Z"
      fill="#020617"
      opacity="0.46"
      transform="translate(0.8, 1.8)"
    />

    <!-- Neumáticos retranqueados en los pasos de rueda -->
    <g fill="#090d16" stroke="#1e293b" stroke-width="0.5">
      <rect x="10.2" y="-13.6" width="8.2" height="2.4" rx="1.1" />
      <rect x="10.2" y="11.2" width="8.2" height="2.4" rx="1.1" />
      <rect :x="tipo === 'compacto' ? -17.2 : -18.6" y="-13.6" width="8.2" height="2.4" rx="1.1" />
      <rect :x="tipo === 'compacto' ? -17.2 : -18.6" y="11.2" width="8.2" height="2.4" rx="1.1" />
    </g>

    <!-- Carrocería esculpida con frente ahusado, pasos de rueda y cintura entallada -->
    <path
      v-if="tipo === 'compacto'"
      d="M -21.2,-10.8
         C -18.5,-12.6 -12.5,-12.8 -7.5,-12.2
         C -2.5,-11.7 3.5,-11.7 8.5,-12.3
         C 13.5,-12.9 18.8,-12.3 21.8,-9.8
         C 24.2,-7.6 24.8,-3.8 24.8,0
         C 24.8,3.8 24.2,7.6 21.8,9.8
         C 18.8,12.3 13.5,12.9 8.5,12.3
         C 3.5,11.7 -2.5,11.7 -7.5,12.2
         C -12.5,12.8 -18.5,12.6 -21.2,10.8
         C -23.4,8.6 -23.8,4.4 -23.8,0
         C -23.8,-4.4 -23.4,-8.6 -21.2,-10.8 Z"
      :fill="color"
      stroke="#0f172a"
      stroke-width="1.15"
      stroke-linejoin="round"
    />
    <path
      v-else
      d="M -22.6,-10.8
         C -19.2,-12.8 -12.8,-13 -7.2,-12.3
         C -1.8,-11.7 4.2,-11.7 9.5,-12.4
         C 14.8,-13.1 19.8,-12.4 22.8,-9.8
         C 25.2,-7.5 25.8,-3.8 25.8,0
         C 25.8,3.8 25.2,7.5 22.8,9.8
         C 19.8,12.4 14.8,13.1 9.5,12.4
         C 4.2,11.7 -1.8,11.7 -7.2,12.3
         C -12.8,13 -19.2,12.8 -22.6,10.8
         C -24.8,8.5 -25.2,4.4 -25.2,0
         C -25.2,-4.4 -24.8,-8.5 -22.6,-10.8 Z"
      :fill="color"
      stroke="#0f172a"
      stroke-width="1.15"
      stroke-linejoin="round"
    />

    <!-- Bisel interior sutil de hombros de carrocería y nervaduras del capó -->
    <path
      d="M 9,-9.8 C 14.5,-9.5 19.5,-8.3 22.5,-6.2 M 9,9.8 C 14.5,9.5 19.5,8.3 22.5,6.2"
      fill="none"
      stroke="#334155"
      stroke-width="0.65"
      stroke-linecap="round"
      opacity="0.55"
    />
    <path
      d="M 10.5,-5.8 L 22.2,-3.8 M 10.5,5.8 L 22.2,3.8"
      fill="none"
      stroke="#0f172a"
      stroke-width="0.55"
      stroke-linecap="round"
      opacity="0.32"
    />

    <!-- Parrilla frontal e inserto aerodinámico -->
    <path
      d="M 24.1,-5.2 C 25.3,-3.5 25.3,3.5 24.1,5.2 L 23.1,4.2 C 23.9,2.5 23.9,-2.5 23.1,-4.2 Z"
      fill="#0f172a"
    />

    <!-- Espejos retrovisores aerodinámicos con brazo oscuro y carcasa en color carrocería -->
    <g>
      <path d="M 6.8,-11.6 L 8.2,-14.6" stroke="#0f172a" stroke-width="1.3" stroke-linecap="round" />
      <path d="M 6.8,11.6 L 8.2,14.6" stroke="#0f172a" stroke-width="1.3" stroke-linecap="round" />
      <path
        d="M 6.2,-13.6 C 7.6,-15.5 9.8,-15.4 10.2,-13.8 C 9.4,-12.8 7.5,-12.8 6.2,-13.6 Z"
        :fill="color"
        stroke="#0f172a"
        stroke-width="0.8"
      />
      <path
        d="M 6.2,13.6 C 7.6,15.5 9.8,15.4 10.2,13.8 C 9.4,12.8 7.5,12.8 6.2,13.6 Z"
        :fill="color"
        stroke="#0f172a"
        stroke-width="0.8"
      />
    </g>

    <!-- Habitáculo acristalado envolvente en cristal ahumado arquitectónico (#0f172a / #1e293b) -->
    <path
      v-if="tipo === 'suv'"
      d="M -19.5,-8.8
         C -11,-9.8 1,-9.8 9.2,-8.8
         C 11.8,-6.2 12.6,-3.2 12.6,0
         C 12.6,3.2 11.8,6.2 9.2,8.8
         C 1,9.8 -11,9.8 -19.5,8.8
         C -21.2,6.2 -21.6,3.2 -21.6,0
         C -21.6,-3.2 -21.2,-6.2 -19.5,-8.8 Z"
      fill="#0f172a"
      stroke="#334155"
      stroke-width="0.75"
    />
    <path
      v-else-if="tipo === 'compacto'"
      d="M -18.2,-8.6
         C -10.5,-9.6 0.5,-9.6 8.6,-8.6
         C 11.4,-6 12.2,-3.1 12.2,0
         C 12.2,3.1 11.4,6 8.6,8.6
         C 0.5,9.6 -10.5,9.6 -18.2,8.6
         C -20,5.8 -20,-5.8 -18.2,-8.6 Z"
      fill="#0f172a"
      stroke="#334155"
      stroke-width="0.75"
    />
    <path
      v-else
      d="M -16.8,-8.8
         C -9.2,-9.8 1,-9.8 9,-8.8
         C 11.8,-6.2 12.6,-3.2 12.6,0
         C 12.6,3.2 11.8,6.2 9,8.8
         C 1,9.8 -9.2,9.8 -16.8,8.8
         C -18.8,6 -19.4,3.1 -19.4,0
         C -19.4,-3.1 -18.8,-6 -16.8,-8.8 Z"
      fill="#0f172a"
      stroke="#334155"
      stroke-width="0.75"
    />

    <!-- Reflejo especular oblicuo en parabrisas delantero y medallón trasero -->
    <path
      d="M 5.4,-7.4 C 8.8,-6.8 10.6,-3.8 10.8,0 C 10.6,2.2 10,4.2 8.8,5.8 L 4.8,4.6 C 6.2,2.6 6.6,-2.6 5.4,-7.4 Z"
      fill="#94a3b8"
      opacity="0.24"
    />
    <path
      v-if="tipo === 'sedan'"
      d="M -13.2,-6.8 L -17.4,-5.4 C -18.2,-2.2 -18.2,2.2 -17.4,5.4 L -13.2,6.8 Z"
      fill="#94a3b8"
      opacity="0.18"
    />

    <!-- Panel metálico central del techo y pilares A / B / C en color de carrocería -->
    <g v-if="tipo === 'suv'">
      <rect x="-15.8" y="-7.1" width="19.8" height="14.2" rx="2.4" :fill="color" stroke="#1e293b" stroke-width="0.7" />
      <!-- Techo panorámico oscuro y barras longitudinales portaequipaje -->
      <rect x="-8.5" y="-4.8" width="9.8" height="9.6" rx="1.4" fill="#1e293b" stroke="#334155" stroke-width="0.5" />
      <line x1="-14.2" y1="-6.1" x2="2.4" y2="-6.1" stroke="#475569" stroke-width="1" stroke-linecap="round" />
      <line x1="-14.2" y1="6.1" x2="2.4" y2="6.1" stroke="#475569" stroke-width="1" stroke-linecap="round" />
      <!-- Pilares A, B y C -->
      <line x1="3.6" y1="-7" x2="8.8" y2="-8.6" :stroke="color" stroke-width="1.35" stroke-linecap="round" />
      <line x1="3.6" y1="7" x2="8.8" y2="8.6" :stroke="color" stroke-width="1.35" stroke-linecap="round" />
      <line x1="-4.5" y1="-7.1" x2="-4.5" y2="-9.4" :stroke="color" stroke-width="1.15" />
      <line x1="-4.5" y1="7.1" x2="-4.5" y2="9.4" :stroke="color" stroke-width="1.15" />
      <line x1="-15.4" y1="-6.9" x2="-19.2" y2="-8.5" :stroke="color" stroke-width="1.4" stroke-linecap="round" />
      <line x1="-15.4" y1="6.9" x2="-19.2" y2="8.5" :stroke="color" stroke-width="1.4" stroke-linecap="round" />
    </g>

    <g v-else-if="tipo === 'compacto'">
      <rect x="-14.8" y="-6.9" width="18" height="13.8" rx="2.6" :fill="color" stroke="#1e293b" stroke-width="0.7" />
      <!-- Alerón trasero integrado sobre el portón -->
      <path d="M -18.5,-7.6 L -16.5,-7.2 L -16.5,7.2 L -18.5,7.6 Z" :fill="color" stroke="#0f172a" stroke-width="0.55" />
      <!-- Pilares A y B -->
      <line x1="2.8" y1="-6.8" x2="8.2" y2="-8.4" :stroke="color" stroke-width="1.35" stroke-linecap="round" />
      <line x1="2.8" y1="6.8" x2="8.2" y2="8.4" :stroke="color" stroke-width="1.35" stroke-linecap="round" />
      <line x1="-5.2" y1="-6.9" x2="-5.2" y2="-9.2" :stroke="color" stroke-width="1.15" />
      <line x1="-5.2" y1="6.9" x2="-5.2" y2="9.2" :stroke="color" stroke-width="1.15" />
    </g>

    <g v-else>
      <rect x="-12.4" y="-7" width="16.2" height="14" rx="2.6" :fill="color" stroke="#1e293b" stroke-width="0.7" />
      <!-- Línea del maletero trasero (sedán tres volúmenes) -->
      <path
        d="M -19.2,-7.6 L -23,-6.6 M -19.2,7.6 L -23,6.6"
        fill="none"
        stroke="#334155"
        stroke-width="0.6"
        stroke-linecap="round"
        opacity="0.55"
      />
      <!-- Pilares A, B y C -->
      <line x1="3.4" y1="-6.9" x2="8.6" y2="-8.5" :stroke="color" stroke-width="1.35" stroke-linecap="round" />
      <line x1="3.4" y1="6.9" x2="8.6" y2="8.5" :stroke="color" stroke-width="1.35" stroke-linecap="round" />
      <line x1="-4.2" y1="-7" x2="-4.2" y2="-9.4" :stroke="color" stroke-width="1.15" />
      <line x1="-4.2" y1="7" x2="-4.2" y2="9.4" :stroke="color" stroke-width="1.15" />
      <line x1="-12" y1="-6.8" x2="-16.5" y2="-8.5" :stroke="color" stroke-width="1.45" stroke-linecap="round" />
      <line x1="-12" y1="6.8" x2="-16.5" y2="8.5" :stroke="color" stroke-width="1.45" stroke-linecap="round" />
    </g>

    <!-- Ópticas delanteras rasgadas tipo LED -->
    <path d="M 21.8,-10.2 L 24.4,-6.8 L 23.1,-6.1 L 20.6,-9.3 Z" fill="#fef9c3" stroke="#0f172a" stroke-width="0.45" />
    <path d="M 21.8,10.2 L 24.4,6.8 L 23.1,6.1 L 20.6,9.3 Z" fill="#fef9c3" stroke="#0f172a" stroke-width="0.45" />

    <!-- Pilotos traseros envolventes finos -->
    <path
      :d="tipo === 'compacto'
        ? 'M -22.2,-9.8 L -23.5,-6.2 L -22.1,-5.9 L -21,-9.2 Z'
        : 'M -23.6,-9.8 L -24.9,-6.2 L -23.5,-5.9 L -22.4,-9.2 Z'"
      fill="#dc2626"
      stroke="#0f172a"
      stroke-width="0.45"
    />
    <path
      :d="tipo === 'compacto'
        ? 'M -22.2,9.8 L -23.5,6.2 L -22.1,5.9 L -21,9.2 Z'
        : 'M -23.6,9.8 L -24.9,6.2 L -23.5,5.9 L -22.4,9.2 Z'"
      fill="#dc2626"
      stroke="#0f172a"
      stroke-width="0.45"
    />
  </g>
</template>
