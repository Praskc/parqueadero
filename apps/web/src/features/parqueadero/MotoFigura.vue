<script setup lang="ts">
/**
 * Figura de motocicleta en VISTA AÉREA (cenital), orientada a +x (sentido de marcha).
 * Soporta 4 modelos diferenciados y variaciones de color y piloto:
 *  1. Scooter urbana (BWS / NMAX): plataforma plana, baúl trasero, líneas redondeadas.
 *  2. Clásica / Trabajo (Boxer / YBR): tanque alargado de gota, parrilla cromada, asiento corrido.
 *  3. Enduro / Todoterreno (XTZ / XR): guardabarros elevado "pico de pato", manillar ancho con protector, llantas de tacos.
 *  4. Deportiva / Naked (Pulsar / Duke): tanque musculoso con tomas de aire, colín afilado, asiento doble nivel.
 */

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
    cascoColor: "#eab308",
    faro: true,
    pata: false,
    etiqueta: "",
  },
);
</script>

<template>
  <g class="moto-figura select-none">
    <!-- Haz luminoso del faro delantero proyectado al pavimento (cuando está en marcha) -->
    <path
      v-if="faro"
      d="M 18 -3 L 65 -16 C 72 -7, 72 7, 65 16 L 18 3 Z"
      fill="url(#headlight-unisucre)"
      opacity="0.85"
      pointer-events="none"
    />

    <!-- Sombra suave de la moto sobre el asfalto -->
    <ellipse cx="0" cy="1.5" rx="20" ry="7.5" fill="#020617" opacity="0.4" filter="blur(1px)" />

    <!-- ==================== MODELO 1: SCOOTER ==================== -->
    <g v-if="modelo === 'scooter'">
      <!-- Ruedas compactas con rin de aleación -->
      <rect x="8" y="-3" width="9" height="6" rx="3" fill="#0f172a" />
      <rect x="-17" y="-3" width="9" height="6" rx="3" fill="#0f172a" />
      <circle cx="12.5" cy="0" r="1.5" fill="#94a3b8" />
      <circle cx="-12.5" cy="0" r="1.5" fill="#94a3b8" />

      <!-- Plataforma plana para pies -->
      <rect x="-2" y="-5.5" width="8" height="11" rx="2" fill="#1e293b" stroke="#334155" stroke-width="0.5" />
      <line x1="0" y1="-4" x2="0" y2="4" stroke="#475569" stroke-width="0.6" stroke-dasharray="1 1" />

      <!-- Escudo frontal aerodinámico -->
      <path d="M 6 -5.5 C 10 -6, 14 -4.5, 16 0 C 14 4.5, 10 6, 6 5.5 Z" :fill="color" stroke="#ffffff" stroke-width="0.6" />

      <!-- Asiento ancho confortable -->
      <path d="M -1 -4 C -6 -4.5, -10 -4, -12 0 C -10 4, -6 4.5, -1 4 Z" fill="#0f172a" stroke="#334155" stroke-width="0.5" />

      <!-- Baúl trasero porta-casco (Top Box) -->
      <rect x="-18.5" y="-4.2" width="6.5" height="8.4" rx="1.8" :fill="color" stroke="#ffffff" stroke-width="0.5" />
      <line x1="-15" y1="-3.5" x2="-15" y2="3.5" stroke="#ffffff" stroke-width="0.6" opacity="0.6" />

      <!-- Manubrio cubierto con carenado -->
      <path d="M 7 -6.5 Q 10 -7 10 0 Q 10 7 7 6.5" fill="none" stroke="#334155" stroke-width="2" stroke-linecap="round" />
      <circle cx="9" cy="-7.5" r="1.2" fill="#38bdf8" />
      <circle cx="9" cy="7.5" r="1.2" fill="#38bdf8" />

      <!-- Faro delantero doble -->
      <ellipse cx="16" cy="-1.8" rx="1.2" ry="1.5" fill="#fef08a" />
      <ellipse cx="16" cy="1.8" rx="1.2" ry="1.5" fill="#fef08a" />
      <rect x="-19" y="-2" width="1.2" height="4" rx="0.6" fill="#ef4444" />
    </g>

    <!-- ==================== MODELO 2: CLÁSICA / TRABAJO ==================== -->
    <g v-else-if="modelo === 'clasica'">
      <!-- Ruedas de radio estándar -->
      <rect x="7" y="-2.6" width="11.5" height="5.2" rx="2.6" fill="#0f172a" />
      <rect x="-18.5" y="-2.6" width="11.5" height="5.2" rx="2.6" fill="#0f172a" />

      <!-- Guardabarros delantero y trasero -->
      <rect x="8.5" y="-3.2" width="8.5" height="6.4" rx="3" :fill="color" stroke="#ffffff" stroke-width="0.5" />
      <rect x="-17" y="-3" width="8.5" height="6" rx="2.8" :fill="color" stroke="#ffffff" stroke-width="0.5" />

      <!-- Escape cromado lateral -->
      <line x1="3" y1="4.5" x2="-14" y2="4.5" stroke="#cbd5e1" stroke-width="1.4" stroke-linecap="round" />
      <rect x="-18.5" y="3.5" width="6.5" height="2" rx="1" fill="#94a3b8" />

      <!-- Bloque de motor con aletas de refrigeración -->
      <rect x="-3" y="-5" width="5.5" height="1.8" rx="0.8" fill="#1e293b" />
      <rect x="-3" y="3.2" width="5.5" height="1.8" rx="0.8" fill="#1e293b" />

      <!-- Tanque de gota clásico -->
      <path d="M 0 -4.5 C 3 -5.5, 6 -5.2, 7.8 -4 L 7.8 4 C 6 5.2, 3 5.5, 0 4.5 Z" :fill="color" stroke="#ffffff" stroke-width="0.7" />
      <circle cx="4" cy="0" r="1.1" fill="#cbd5e1" stroke="#475569" stroke-width="0.4" />

      <!-- Asiento largo biplaza con costuras -->
      <path d="M -0.5 -3.8 C -4.5 -4.2, -8 -3.8, -10.5 -2.8 C -11.5 -2, -11.5 2, -10.5 2.8 C -8 3.8, -4.5 4.2, -0.5 3.8 Z" fill="#0f172a" stroke="#334155" stroke-width="0.5" />
      <line x1="-3.5" y1="-3" x2="-3.5" y2="3" stroke="#475569" stroke-width="0.5" />

      <!-- Parrilla metálica trasera cromada -->
      <rect x="-16.5" y="-3.5" width="5.5" height="7" rx="1" fill="none" stroke="#cbd5e1" stroke-width="0.8" />
      <line x1="-14" y1="-3.5" x2="-14" y2="3.5" stroke="#cbd5e1" stroke-width="0.7" />

      <!-- Manubrio tubular con puños negros y espejos -->
      <line x1="9" y1="-7" x2="9" y2="7" stroke="#334155" stroke-width="1.8" stroke-linecap="round" />
      <rect x="8" y="-8.5" width="2" height="2.8" rx="0.9" fill="#0f172a" />
      <rect x="8" y="5.7" width="2" height="2.8" rx="0.9" fill="#0f172a" />
      <circle cx="7" cy="-9" r="1.3" fill="#38bdf8" stroke="#0f172a" stroke-width="0.4" />
      <circle cx="7" cy="9" r="1.3" fill="#38bdf8" stroke="#0f172a" stroke-width="0.4" />

      <!-- Faro redondo clásico -->
      <ellipse cx="18.5" cy="0" rx="1.5" ry="2.2" fill="#fef08a" stroke="#f59e0b" stroke-width="0.6" />
      <ellipse cx="-18.8" cy="0" rx="0.9" ry="1.6" fill="#ef4444" stroke="#991b1b" stroke-width="0.4" />
    </g>

    <!-- ==================== MODELO 3: ENDURO / TODOTERRENO ==================== -->
    <g v-else-if="modelo === 'enduro'">
      <!-- Llantas de tacos agresivos -->
      <rect x="7" y="-2.8" width="12" height="5.6" rx="2.8" fill="#0f172a" />
      <rect x="-19" y="-3.2" width="11" height="6.4" rx="3.2" fill="#0f172a" />

      <!-- Guardabarros delantero elevado tipo "pico de pato" -->
      <polygon points="6,-2.8 19,0 6,2.8" :fill="color" stroke="#ffffff" stroke-width="0.6" />

      <!-- Guardabarros trasero alto -->
      <polygon points="-8,-3.2 -18.5,0 -8,3.2" :fill="color" stroke="#ffffff" stroke-width="0.5" />

      <!-- Silenciador alto de escape (estilo rally) -->
      <rect x="-18" y="-5.5" width="8" height="2.2" rx="1.1" fill="#475569" stroke="#64748b" stroke-width="0.5" />
      <line x1="-1" y1="-4.5" x2="-10" y2="-4.8" stroke="#cbd5e1" stroke-width="1.2" />

      <!-- Tanque delgado enduro -->
      <path d="M 0 -3.6 L 5.5 -4.2 L 5.5 4.2 L 0 3.6 Z" :fill="color" stroke="#ffffff" stroke-width="0.6" />

      <!-- Asiento plano y recto hacia el tanque -->
      <path d="M -0.5 -3.2 L -9.5 -3 L -11 0 L -9.5 3 L -0.5 3.2 Z" fill="#1e293b" stroke="#334155" stroke-width="0.5" />

      <!-- Manubrio ancho con protector central y cubre-manos -->
      <line x1="8.5" y1="-8.5" x2="8.5" y2="8.5" stroke="#1e293b" stroke-width="2" stroke-linecap="round" />
      <rect x="7.5" y="-2" width="2" height="4" rx="0.8" fill="#eab308" />
      <!-- Cubre-manos (handguards) -->
      <path d="M 6 -9 Q 10 -9.5 10 -7" fill="none" :stroke="color" stroke-width="1.8" stroke-linecap="round" />
      <path d="M 6 9 Q 10 9.5 10 7" fill="none" :stroke="color" stroke-width="1.8" stroke-linecap="round" />

      <!-- Máscara de faro enduro -->
      <polygon points="15,-2.2 18,0 15,2.2" fill="#fef08a" stroke="#d97706" stroke-width="0.5" />
      <rect x="-19.2" y="-1.2" width="1.2" height="2.4" rx="0.6" fill="#ef4444" />
    </g>

    <!-- ==================== MODELO 4: DEPORTIVA / NAKED ==================== -->
    <g v-else>
      <!-- Llantas anchas de perfil bajo con cinta decorativa -->
      <rect x="7" y="-3.2" width="11.5" height="6.4" rx="3.2" fill="#0f172a" />
      <rect x="-18.5" y="-3.8" width="11.5" height="7.6" rx="3.8" fill="#0f172a" />
      <circle cx="12.5" cy="0" r="2.2" fill="none" stroke="#f43f5e" stroke-width="0.5" />
      <circle cx="-13" cy="0" r="2.6" fill="none" stroke="#f43f5e" stroke-width="0.5" />

      <!-- Escape corto deportivo ventral -->
      <rect x="-4" y="3.8" width="6.5" height="2.5" rx="1.2" fill="#334155" stroke="#64748b" stroke-width="0.6" />
      <circle cx="2" cy="5" r="0.8" fill="#0f172a" />

      <!-- Tanque esculpido con tomas de aire laterales prominentes -->
      <path
        d="M -1 -4 C 1 -6.8, 5.5 -7, 7.5 -5 L 8.5 0 L 7.5 5 C 5.5 7, 1 6.8, -1 4 Z"
        :fill="color"
        stroke="#ffffff"
        stroke-width="0.8"
      />
      <!-- Brillo aerodinámico en hombros del tanque -->
      <line x1="2" y1="-4.5" x2="6" y2="-3.8" stroke="#ffffff" stroke-width="0.7" opacity="0.6" />
      <line x1="2" y1="4.5" x2="6" y2="3.8" stroke="#ffffff" stroke-width="0.7" opacity="0.6" />

      <!-- Asiento doble nivel deportivo (piloto + colín afilado de pasajero) -->
      <polygon points="-1.5,-3.5 -6.5,-3 -6.5,3 -1.5,3.5" fill="#0f172a" stroke="#334155" stroke-width="0.5" />
      <polygon points="-7,-2 -15,0 -7,2" :fill="color" stroke="#ffffff" stroke-width="0.6" />
      <rect x="-10.5" y="-1.8" width="3" height="3.6" rx="0.8" fill="#1e293b" />

      <!-- Semimanillares deportivos con espejos aerodinámicos -->
      <line x1="8.5" y1="-6.5" x2="8.5" y2="6.5" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round" />
      <circle cx="7" cy="-7.5" r="1.1" fill="#38bdf8" />
      <circle cx="7" cy="7.5" r="1.1" fill="#38bdf8" />

      <!-- Óptica frontal afilada LED -->
      <polygon points="16,-3 19,0 16,3" fill="#fef08a" stroke="#eab308" stroke-width="0.6" />
      <!-- Stop trasero LED doble -->
      <circle cx="-15.5" cy="-1" r="0.9" fill="#ef4444" />
      <circle cx="-15.5" cy="1" r="0.9" fill="#ef4444" />
    </g>

    <!-- ==================== CONDUCTOR / PILOTO ==================== -->
    <g transform="translate(-1.5, 0)">
      <!-- Brazos del motociclista extendidos hacia el manubrio -->
      <line x1="0" y1="-3.5" x2="8.5" y2="-5.8" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" />
      <line x1="0" y1="3.5" x2="8.5" y2="5.8" stroke="#1e293b" stroke-width="2.2" stroke-linecap="round" />

      <!-- Hombros / Torso -->
      <ellipse cx="-1.5" cy="0" rx="3.6" ry="4.5" fill="#1e293b" stroke="#334155" stroke-width="0.6" />

      <!-- Casco de seguridad con visera -->
      <circle cx="0.5" cy="0" r="3.2" :fill="cascoColor" stroke="#0f172a" stroke-width="0.8" />
      <!-- Visera reflectiva oscura apuntando hacia adelante (+x) -->
      <path d="M 2.2 -2.1 Q 3.8 0 2.2 2.1" fill="none" stroke="#0f172a" stroke-width="1.2" stroke-linecap="round" />
      <line x1="2.2" y1="-1" x2="3" y2="0" stroke="#38bdf8" stroke-width="0.6" opacity="0.85" />
    </g>

    <!-- Pata de apoyo (solo para motos estacionadas) -->
    <g v-if="pata">
      <line x1="-3" y1="4" x2="-7" y2="8" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round" />
      <circle cx="-7" cy="8" r="1" fill="#475569" />
    </g>

    <!-- ==================== ROTULO / ETIQUETA EN MOVIMIENTO ==================== -->
    <!-- Coincide con probe-track: ASIGNADA, SALIENDO, ESPERANDO -->
    <g v-if="etiqueta" transform="translate(0, -18)" filter="url(#shadow-unisucre)">
      <rect
        :x="-(etiqueta.length * 3.6 + 8)"
        y="-7"
        :width="etiqueta.length * 7.2 + 16"
        height="14"
        rx="7"
        :fill="etiqueta.includes('ASIGNADA') ? '#14532d' : etiqueta.includes('ESPERANDO') ? '#78350f' : '#0c4a6e'"
        stroke="#ffffff"
        stroke-width="1"
      />
      <text
        x="0"
        y="3"
        fill="#ffffff"
        font-size="8.5"
        font-weight="900"
        font-family="'JetBrains Mono', monospace"
        text-anchor="middle"
        letter-spacing="0.5"
      >
        {{ etiqueta }}
      </text>
    </g>
  </g>
</template>
