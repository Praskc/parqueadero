<script setup lang="ts">
// Silueta cenital arquitectónica de motocicleta orientada a +x (estacionada sin piloto o en circulación con piloto).
withDefaults(
  defineProps<{
    modelo?: "scooter" | "clasica" | "enduro" | "deportiva";
    color?: string;
    cascoColor?: string;
    faro?: boolean;
    pata?: boolean;
    etiqueta?: string;
  }>(),
  {
    modelo: "clasica",
    color: "#15803d",
    cascoColor: "#f8fafc",
    faro: true,
    pata: false,
    etiqueta: "",
  },
);
</script>

<template>
  <g class="moto-figura select-none">
    <!-- Haz luminoso proyectado cuando la motocicleta circula -->
    <path
      v-if="faro && !pata"
      d="M 24 -2.5 L 68 -15 C 74 -6, 74 6, 68 15 L 24 2.5 Z"
      fill="url(#headlight-unisucre)"
      opacity="0.78"
      pointer-events="none"
    />

    <!-- Sombra proyectada sobre el asfalto (inclinada cuando reposa sobre la pata lateral) -->
    <ellipse
      :cx="pata ? -0.5 : 0"
      :cy="pata ? 2.8 : 1.4"
      rx="24"
      :ry="pata ? 7.8 : 6.8"
      fill="#020617"
      opacity="0.45"
    />

    <!-- Pata lateral extendida (solo cuando está estacionada en bahía) -->
    <g v-if="pata">
      <line x1="-2" y1="3.5" x2="-7.5" y2="10.2" stroke="#64748b" stroke-width="1.6" stroke-linecap="round" />
      <ellipse cx="-8" cy="10.5" rx="1.6" ry="1" fill="#334155" />
    </g>

    <!-- Posapiés laterales y pedal de freno/cambios -->
    <line x1="-2" y1="-7.2" x2="-2" y2="7.2" stroke="#475569" stroke-width="1.5" stroke-linecap="round" />
    <rect x="-3.4" y="-8" width="2.8" height="1.5" rx="0.6" fill="#0f172a" />
    <rect x="-3.4" y="6.5" width="2.8" height="1.5" rx="0.6" fill="#0f172a" />

    <!-- Llanta trasera expuesta y basculante -->
    <g>
      <rect x="-25.5" y="-2.8" width="12.5" height="5.6" rx="2.6" fill="#090d16" stroke="#1e293b" stroke-width="0.6" />
      <line x1="-24" y1="0" x2="-14.5" y2="0" stroke="#334155" stroke-width="1.2" stroke-dasharray="1.5 1.5" />
      <!-- Basculante trasero y disco/cadena -->
      <line x1="-10" y1="-3.3" x2="-19.5" y2="-3.1" stroke="#64748b" stroke-width="1.2" stroke-linecap="round" />
      <line x1="-10" y1="3.3" x2="-19.5" y2="3.1" stroke="#64748b" stroke-width="1.2" stroke-linecap="round" />
      <rect x="-21" y="-2.2" width="3.5" height="0.7" fill="#94a3b8" />
    </g>

    <!-- Tren delantero articulado (rueda + barras telescópicas + faro + manubrio) -->
    <g :transform="pata ? 'rotate(-10, 10, 0)' : undefined">
      <!-- Llanta delantera sobresaliente -->
      <rect x="13.5" y="-2.5" width="12" height="5" rx="2.4" fill="#090d16" stroke="#1e293b" stroke-width="0.6" />
      <line x1="15" y1="0" x2="24" y2="0" stroke="#334155" stroke-width="1" stroke-dasharray="1.5 1.5" />
      <!-- Disco de freno delantero -->
      <rect x="17.5" y="2.3" width="4.2" height="0.7" fill="#cbd5e1" />

      <!-- Guardabarros delantero corto sobre la llanta -->
      <path
        v-if="modelo === 'enduro'"
        d="M 10 -2.6 L 21.5 -1.1 L 21.5 1.1 L 10 2.6 Z"
        :fill="color"
        stroke="#0f172a"
        stroke-width="0.7"
      />
      <rect
        v-else
        x="12"
        y="-2.8"
        width="7.8"
        height="5.6"
        rx="2.4"
        :fill="modelo === 'deportiva' ? '#1e293b' : color"
        stroke="#0f172a"
        stroke-width="0.7"
      />

      <!-- Barras telescópicas de suspensión (horquilla) -->
      <line x1="9.5" y1="-3.1" x2="19.5" y2="-2.9" stroke="#cbd5e1" stroke-width="1.3" stroke-linecap="round" />
      <line x1="9.5" y1="3.1" x2="19.5" y2="2.9" stroke="#cbd5e1" stroke-width="1.3" stroke-linecap="round" />

      <!-- Óptica / faro delantero y tablero de instrumentos -->
      <path
        d="M 12.2 -3.2 C 15.8 -3, 16.8 -1.8, 16.8 0 C 16.8 1.8, 15.8 3, 12.2 3.2 Z"
        fill="#1e293b"
        stroke="#0f172a"
        stroke-width="0.7"
      />
      <ellipse cx="16.4" cy="0" rx="1.1" ry="2.1" fill="#fef08a" />
      <rect x="10.2" y="-2.2" width="2.2" height="4.4" rx="0.8" fill="#0f172a" stroke="#475569" stroke-width="0.5" />

      <!-- Manubrio curvado hacia atrás con maniguetas, puños y espejos retrovisores -->
      <path
        d="M 7.8 -10.8 L 9.8 -6.2 L 10.6 0 L 9.8 6.2 L 7.8 10.8"
        fill="none"
        stroke="#cbd5e1"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <!-- Maniguetas de embrague y freno delantero -->
      <line x1="9.2" y1="-7.2" x2="11.4" y2="-10.2" stroke="#94a3b8" stroke-width="0.85" stroke-linecap="round" />
      <line x1="9.2" y1="7.2" x2="11.4" y2="10.2" stroke="#94a3b8" stroke-width="0.85" stroke-linecap="round" />
      <!-- Puños de caucho negro -->
      <line x1="8.7" y1="-7.6" x2="7.5" y2="-11.2" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" />
      <line x1="8.7" y1="7.6" x2="7.5" y2="11.2" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" />
      <!-- Espejos retrovisores en varilla -->
      <line x1="9.5" y1="-6.8" x2="11.2" y2="-11.6" stroke="#334155" stroke-width="0.9" />
      <line x1="9.5" y1="6.8" x2="11.2" y2="11.6" stroke="#334155" stroke-width="0.9" />
      <ellipse cx="11.4" cy="-12.3" rx="1.3" ry="2.1" transform="rotate(-18, 11.4, -12.3)" fill="#0f172a" stroke="#64748b" stroke-width="0.5" />
      <ellipse cx="11.4" cy="12.3" rx="1.3" ry="2.1" transform="rotate(18, 11.4, 12.3)" fill="#0f172a" stroke="#64748b" stroke-width="0.5" />
    </g>

    <!-- Motor y sistema de escape lateral derecho -->
    <rect x="-1.5" y="-5.6" width="6.5" height="11.2" rx="1.8" fill="#334155" stroke="#0f172a" stroke-width="0.6" />
    <path d="M 3 4.8 L -7 5.5 L -18.5 5" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" />
    <rect x="-19.5" y="3.8" width="8.5" height="2.6" rx="1.2" fill="#475569" stroke="#0f172a" stroke-width="0.6" />

    <!-- Carrocería según variante (tanque esculpido, asiento biplaza y colín) -->
    <g v-if="modelo === 'scooter'">
      <!-- Plataforma reposapiés plana de scooter -->
      <rect x="0.5" y="-6" width="8.2" height="12" rx="2.2" fill="#1e293b" stroke="#0f172a" stroke-width="0.7" />
      <line x1="2.5" y1="-4.2" x2="6.8" y2="-4.2" stroke="#475569" stroke-width="0.7" />
      <line x1="2.5" y1="4.2" x2="6.8" y2="4.2" stroke="#475569" stroke-width="0.7" />
      <!-- Escudo frontal envolvente -->
      <path
        d="M 7.5 -6.2 C 11 -6.2, 13 -4.2, 13.4 0 C 13 4.2, 11 6.2, 7.5 6.2 Z"
        :fill="color"
        stroke="#0f172a"
        stroke-width="0.8"
      />
      <!-- Carenado trasero lateral y asiento ancho -->
      <path
        d="M 1 -5.6 L -15 -4.6 C -17.5 -3.6, -17.5 3.6, -15 4.6 L 1 5.6 Z"
        :fill="color"
        stroke="#0f172a"
        stroke-width="0.8"
      />
      <path
        d="M 1.2 -4.2 L -12.8 -3.8 C -14.8 -3, -14.8 3, -12.8 3.8 L 1.2 4.2 Z"
        fill="#0f172a"
        stroke="#334155"
        stroke-width="0.6"
      />
      <line x1="-5.5" y1="-3.6" x2="-5.5" y2="3.6" stroke="#334155" stroke-width="0.7" />
    </g>

    <g v-else-if="modelo === 'deportiva'">
      <!-- Colín trasero afilado -->
      <path
        d="M -5 -4.4 L -18.5 -1.8 L -18.5 1.8 L -5 4.4 Z"
        :fill="color"
        stroke="#0f172a"
        stroke-width="0.8"
      />
      <!-- Asiento deportivo escalonado (piloto + pasajero) -->
      <path
        d="M 0.5 -3.8 L -7.8 -4.1 L -9.2 -2.8 L -9.2 2.8 L -7.8 4.1 L 0.5 3.8 Z"
        fill="#0f172a"
        stroke="#334155"
        stroke-width="0.6"
      />
      <rect x="-15.5" y="-2.3" width="4.8" height="4.6" rx="1" fill="#1e293b" stroke="#0f172a" stroke-width="0.5" />
      <!-- Tanque musculoso con aletas laterales y hendidura de rodillas -->
      <path
        d="M -0.5 -3.6 C 1.2 -6.6, 6.8 -7, 10.2 -4.6 L 11.2 0 L 10.2 4.6 C 6.8 7, 1.2 6.6, -0.5 3.6 Z"
        :fill="color"
        stroke="#0f172a"
        stroke-width="0.85"
      />
      <path d="M 2 -4.8 L 8.2 -3.8" stroke="#ffffff" stroke-width="0.8" opacity="0.28" stroke-linecap="round" />
      <circle cx="6.2" cy="0" r="1.2" fill="#cbd5e1" stroke="#334155" stroke-width="0.5" />
    </g>

    <g v-else-if="modelo === 'enduro'">
      <!-- Colín esbelto todoterreno -->
      <path
        d="M -6 -3.2 L -19 -1.8 L -19 1.8 L -6 3.2 Z"
        :fill="color"
        stroke="#0f172a"
        stroke-width="0.75"
      />
      <!-- Asiento corrido angosto -->
      <path
        d="M 2.5 -3.1 L -13.5 -3 C -14.8 -2.2, -14.8 2.2, -13.5 3 L 2.5 3.1 Z"
        fill="#0f172a"
        stroke="#334155"
        stroke-width="0.6"
      />
      <!-- Tanque esbelto con cubiertas de radiador -->
      <path
        d="M 1.5 -3.1 L 5.5 -5.8 L 10.5 -4.2 L 10.5 4.2 L 5.5 5.8 L 1.5 3.1 Z"
        :fill="color"
        stroke="#0f172a"
        stroke-width="0.8"
      />
      <circle cx="6.8" cy="0" r="1.1" fill="#cbd5e1" stroke="#334155" stroke-width="0.5" />
    </g>

    <g v-else>
      <!-- Parrilla trasera tubular y guardabarros de moto urbana clásica -->
      <rect x="-19" y="-3.2" width="5.8" height="6.4" rx="1.4" fill="none" stroke="#94a3b8" stroke-width="0.9" />
      <line x1="-16.2" y1="-3.2" x2="-16.2" y2="3.2" stroke="#94a3b8" stroke-width="0.7" />
      <!-- Asiento biplaza acanalado con cintura estrecha -->
      <path
        d="M 0.5 -3.4 C -3 -4.2, -9.5 -4.3, -13.8 -3.5 C -15 -2.6, -15 2.6, -13.8 3.5 C -9.5 4.3, -3 4.2, 0.5 3.4 Z"
        fill="#0f172a"
        stroke="#334155"
        stroke-width="0.65"
      />
      <line x1="-4.5" y1="-3.5" x2="-4.5" y2="3.5" stroke="#334155" stroke-width="0.6" />
      <line x1="-9.2" y1="-3.6" x2="-9.2" y2="3.6" stroke="#334155" stroke-width="0.6" />
      <!-- Tanque clásico en forma de lágrima -->
      <path
        d="M -0.2 -3.2 C 1.8 -5.8, 6.8 -6, 9.8 -4.1 C 11 -2.6, 11 2.6, 9.8 4.1 C 6.8 6, 1.8 5.8, -0.2 3.2 Z"
        :fill="color"
        stroke="#0f172a"
        stroke-width="0.85"
      />
      <path d="M 2.2 -4.1 Q 5.8 -4.6, 8.6 -3" fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.28" stroke-linecap="round" />
      <circle cx="5.8" cy="0" r="1.2" fill="#cbd5e1" stroke="#334155" stroke-width="0.5" />
    </g>

    <!-- Luz de freno trasera -->
    <rect x="-19.8" y="-1.7" width="1.3" height="3.4" rx="0.5" fill="#dc2626" />

    <!-- Piloto en posición de conducción (únicamente cuando la moto está en marcha) -->
    <g v-if="!pata">
      <!-- Brazos sujetando los puños del manubrio -->
      <path d="M -1.5 -5.2 Q 3.5 -8.5, 7.8 -9.6" fill="none" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" />
      <path d="M -1.5 5.2 Q 3.5 8.5, 7.8 9.6" fill="none" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" />
      <!-- Guantes sobre puños -->
      <circle cx="8" cy="-9.6" r="1.3" fill="#0f172a" />
      <circle cx="8" cy="9.6" r="1.3" fill="#0f172a" />
      <!-- Chaqueta / hombros del motociclista -->
      <ellipse cx="-2.2" cy="0" rx="3.8" ry="6.2" fill="#1e293b" stroke="#0f172a" stroke-width="0.8" />
      <!-- Casco integral con visor oscuro -->
      <ellipse cx="0.6" cy="0" rx="4.1" ry="3.8" :fill="cascoColor" stroke="#0f172a" stroke-width="0.85" />
      <path d="M 2.2 -2.6 C 4.4 -1.6, 4.4 1.6, 2.2 2.6 Z" fill="#0f172a" />
    </g>

    <!-- Rótulo compacto de bahía asignada solo cuando aplica -->
    <g v-if="etiqueta" transform="translate(0, -19)">
      <rect
        :x="-(etiqueta.length * 3.4 + 6)"
        y="-6"
        :width="etiqueta.length * 6.8 + 12"
        height="12"
        rx="2.5"
        :fill="etiqueta === 'ESPERA' ? '#78350f' : '#0f172a'"
        stroke="#64748b"
        stroke-width="0.8"
      />
      <text
        x="0"
        y="2.8"
        fill="#f8fafc"
        font-size="7.5"
        font-weight="700"
        font-family="'JetBrains Mono', monospace"
        text-anchor="middle"
      >
        {{ etiqueta }}
      </text>
    </g>
  </g>
</template>
