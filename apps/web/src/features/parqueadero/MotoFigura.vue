<script setup lang="ts">
/**
 * Figura de motocicleta en VISTA AÉREA (cenital), apuntando a +x
 * (sentido de marcha), coherente con el plano en planta del parqueadero.
 * Una sola fuente de verdad para la moto en movimiento y la estacionada.
 *
 * Propiedades:
 *  - color: tono de carrocería (verde institucional por defecto)
 *  - faro: faro encendido (moto en movimiento)
 *  - pata: pedal de apoyo visible (moto estacionada)
 *
 * Huella total: x ∈ [-18.5, 19], y ∈ [-9, 9]. Ruedas en el eje de marcha:
 * el grupo rota limpio sobre el origen.
 */
withDefaults(
  defineProps<{
    color?: string;
    faro?: boolean;
    pata?: boolean;
  }>(),
  { color: "#15803d", faro: false, pata: false },
);
</script>

<template>
  <g class="moto-figura">
    <!-- Ruedas: cápsulas oscuras asomando en los extremos del eje -->
    <rect x="7" y="-2.7" width="11.5" height="5.4" rx="2.7" fill="#0f172a" />
    <rect x="-18.5" y="-2.7" width="11.5" height="5.4" rx="2.7" fill="#0f172a" />

    <!-- Guardabarros sobre las ruedas, con cresta central -->
    <g>
      <rect x="8.6" y="-3.4" width="8.6" height="6.8" rx="3.2" :fill="color" stroke="#ffffff" stroke-width="0.5" />
      <line x1="9.5" y1="0" x2="16.3" y2="0" stroke="#ffffff" stroke-width="0.6" opacity="0.45" />
      <rect x="-17.2" y="-3.1" width="8.8" height="6.2" rx="2.9" :fill="color" stroke="#ffffff" stroke-width="0.5" />
      <line x1="-16.4" y1="0" x2="-9.4" y2="0" stroke="#ffffff" stroke-width="0.6" opacity="0.45" />
    </g>

    <!-- Escape y silenciadores a los costados -->
    <line x1="3.5" y1="4.6" x2="-12" y2="4.6" stroke="#94a3b8" stroke-width="1.2" opacity="0.85" />
    <line x1="3.5" y1="-4.6" x2="-12" y2="-4.6" stroke="#94a3b8" stroke-width="1.2" opacity="0.85" />
    <rect x="-17" y="3.6" width="6" height="2" rx="1" fill="#64748b" stroke="#475569" stroke-width="0.4" />
    <rect x="-17" y="-5.6" width="6" height="2" rx="1" fill="#64748b" stroke="#475569" stroke-width="0.4" />

    <!-- Aletas del motor asomando a los costados -->
    <rect x="-2.5" y="-5.2" width="4.5" height="1.5" rx="0.75" fill="#1e293b" />
    <rect x="-2.5" y="3.7" width="4.5" height="1.5" rx="0.75" fill="#1e293b" />

    <!-- Tanque: la parte ancha de la silueta -->
    <path
      d="M 0.5 -4.7 C 3 -5.6, 5.8 -5.4, 7.6 -4.3
         L 7.6 4.3
         C 5.8 5.4, 3 5.6, 0.5 4.7 Z"
      :fill="color"
      stroke="#ffffff"
      stroke-width="0.7"
    />
    <line x1="1.8" y1="0" x2="6.8" y2="0" stroke="#ffffff" stroke-width="0.7" opacity="0.5" stroke-linecap="round" />

    <!-- Asiento -->
    <path
      d="M -0.6 -3.9 C -4.5 -4.3, -7 -3.6, -8.2 -2.9
         C -9 -2.5, -9 2.5, -8.2 2.9
         C -7 3.6, -4.5 4.3, -0.6 3.9 Z"
      fill="#0f172a"
      stroke="#334155"
      stroke-width="0.5"
    />
    <line x1="-2" y1="-2.6" x2="-2" y2="2.6" stroke="#475569" stroke-width="0.5" opacity="0.7" />

    <!-- Cola: estrechamiento tras el asiento -->
    <path d="M -8.4 -2.9 L -15 -2 L -15 2 L -8.4 2.9 Z" :fill="color" stroke="#ffffff" stroke-width="0.4" />

    <!-- Manubrio: el punto más ancho de una moto vista desde arriba -->
    <line x1="9.4" y1="-6.9" x2="9.4" y2="6.9" stroke="#334155" stroke-width="1.7" stroke-linecap="round" />
    <rect x="8.3" y="-8.4" width="2.2" height="3" rx="1.1" fill="#0f172a" />
    <rect x="8.3" y="5.4" width="2.2" height="3" rx="1.1" fill="#0f172a" />

    <!-- Espejos: sobresalen por encima del manubrio en la vista cenital -->
    <line x1="9.4" y1="-5.6" x2="7.6" y2="-8.4" stroke="#334155" stroke-width="0.9" />
    <line x1="9.4" y1="5.6" x2="7.6" y2="8.4" stroke="#334155" stroke-width="0.9" />
    <circle cx="7.4" cy="-8.9" r="1.4" fill="#38bdf8" stroke="#0f172a" stroke-width="0.5" />
    <circle cx="7.4" cy="8.9" r="1.4" fill="#38bdf8" stroke="#0f172a" stroke-width="0.5" />

    <!-- Pedal de apoyo (solo estacionada): asoma por un costado -->
    <g v-if="pata">
      <line x1="-2.5" y1="4.2" x2="-6.2" y2="8.2" stroke="#0f172a" stroke-width="1.4" stroke-linecap="round" />
    </g>

    <!-- Faro: el punto más avanzado -->
    <ellipse
      cx="18.6"
      cy="0"
      rx="1.4"
      ry="2.1"
      :fill="faro ? '#fef08a' : '#94a3b8'"
      :stroke="faro ? '#f59e0b' : '#64748b'"
      stroke-width="0.6"
    />

    <!-- Luz trasera -->
    <ellipse cx="-18.3" cy="0" rx="0.9" ry="1.7" fill="#ef4444" stroke="#991b1b" stroke-width="0.4" />
  </g>
</template>
