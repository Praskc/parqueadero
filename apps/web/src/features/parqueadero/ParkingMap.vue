<script setup lang="ts">
import { computed } from "vue";
import type { AnimacionMoto, Bahia, EstadoTalanquera } from "../../types/hmi";
import MotoFigura from "./MotoFigura.vue";
import { ALTO_PLANO, ANCHO_PLANO, BAHIA_ALTO, BAHIA_ANCHO, CORREDOR, PATIO } from "../../config/bahias";
import { tema } from "../../shared/theme";

const props = defineProps<{
  bahias: Bahia[];
  animaciones?: AnimacionMoto[];
  talanquera: EstadoTalanquera;
  bloqueada: boolean;
}>();

defineEmits<{ (e: "select-espacio", id: string): void }>();

const barrierAngle = computed(() => {
  // El brazo nace apuntando hacia abajo y cruza el carril (cerrado).
  // Al abrir gira 90° hacia el andén: deja libre el paso y no invade
  // la plaza E01, que era lo que pasaba al girar hacia la derecha.
  if (props.bloqueada || props.talanquera === "bloqueada") return 0;
  return props.talanquera === "abriendo" || props.talanquera === "abierta" ? 90 : 0;
});
</script>

<template>
  <div
    class="relative w-full rounded-2xl border overflow-hidden shadow-md select-none transition-colors duration-200"
    :class="tema === 'oscuro' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200 shadow-sm'"
    :style="{ aspectRatio: `${ANCHO_PLANO} / ${ALTO_PLANO}` }"
  >
    <svg :viewBox="`0 0 ${ANCHO_PLANO} ${ALTO_PLANO}`" class="w-full h-full block" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="headlight-unisucre" cx="15%" cy="50%" r="85%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95" />
          <stop offset="50%" stop-color="#fef08a" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#fef08a" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="sensor-glow-green" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#22c55e" stop-opacity="0.85" />
          <stop offset="40%" stop-color="#22c55e" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#22c55e" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="sensor-glow-red" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ef4444" stop-opacity="0.85" />
          <stop offset="40%" stop-color="#ef4444" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#ef4444" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="sensor-glow-amber" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#b45309" stop-opacity="0.85" />
          <stop offset="40%" stop-color="#b45309" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#b45309" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="sensor-glow-sky" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.85" />
          <stop offset="40%" stop-color="#38bdf8" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#38bdf8" stop-opacity="0" />
        </radialGradient>
        <pattern id="bay-hatch-unisucre" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="14" fill="rgba(148, 163, 184, 0.2)" />
          <rect x="7" width="7" height="14" fill="transparent" />
        </pattern>
        <filter id="shadow-unisucre" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="#0f172a" flood-opacity="0.45" />
        </filter>
      </defs>

      <!-- 1. TERRENO -->
      <rect x="0" y="0" :width="ANCHO_PLANO" :height="ALTO_PLANO" :fill="tema === 'oscuro' ? '#0b1120' : '#f1f5f9'" />

      <g id="jardineria-norte">
        <rect x="235" y="0" :width="ANCHO_PLANO - 235" height="42" fill="#166534" />
        <line x1="235" y1="42" :x2="ANCHO_PLANO" y2="42" stroke="#cbd5e1" stroke-width="3" />
        <circle cx="280" cy="21" r="14" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
        <circle cx="450" cy="21" r="12" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
        <circle cx="650" cy="21" r="14" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
        <circle cx="850" cy="21" r="13" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
        <circle cx="1050" cy="21" r="12" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
      </g>
      <g id="jardineria-sur">
        <rect x="235" y="518" :width="ANCHO_PLANO - 235" height="42" fill="#166534" />
        <line x1="235" y1="518" :x2="ANCHO_PLANO" y2="518" stroke="#cbd5e1" stroke-width="3" />
        <circle cx="320" cy="538" r="13" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
        <circle cx="550" cy="538" r="14" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
        <circle cx="780" cy="538" r="12" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
        <circle cx="1000" cy="538" r="13" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
      </g>

      <!-- 2. CALLE PÚBLICA EXTERIOR -->
      <g id="calle-publica">
        <!-- Calzada de asfalto -->
        <rect x="0" y="0" width="130" :height="ALTO_PLANO" fill="#334155" />

        <!-- Andén exterior izquierdo (borde oeste) -->
        <rect x="0" y="0" width="12" :height="ALTO_PLANO" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1" />
        <line x1="12" y1="0" x2="12" :y2="ALTO_PLANO" stroke="#64748b" stroke-width="2" />

        <!-- Línea blanca lateral continua (carril norte) -->
        <line x1="18" y1="0" x2="18" :y2="ALTO_PLANO" stroke="#ffffff" stroke-width="2" opacity="0.9" />

        <!-- Línea blanca lateral (carril sur) interrumpida por la entrada del campus -->
        <line x1="126" y1="0" x2="126" y2="190" stroke="#ffffff" stroke-width="2" opacity="0.9" />
        <line x1="126" y1="370" x2="126" :y2="ALTO_PLANO" stroke="#ffffff" stroke-width="2" opacity="0.9" />

        <!-- Doble línea amarilla continua central con tachas reflectivas (norma colombiana) -->
        <line x1="62" y1="0" x2="62" :y2="ALTO_PLANO" stroke="#facc15" stroke-width="2" />
        <line x1="68" y1="0" x2="68" :y2="ALTO_PLANO" stroke="#facc15" stroke-width="2" />
        <g id="tachas-amarillas">
          <circle cx="65" cy="40" r="1.5" fill="#fef08a" />
          <circle cx="65" cy="100" r="1.5" fill="#fef08a" />
          <circle cx="65" cy="160" r="1.5" fill="#fef08a" />
          <circle cx="65" cy="220" r="1.5" fill="#fef08a" />
          <circle cx="65" cy="280" r="1.5" fill="#fef08a" />
          <circle cx="65" cy="340" r="1.5" fill="#fef08a" />
          <circle cx="65" cy="400" r="1.5" fill="#fef08a" />
          <circle cx="65" cy="460" r="1.5" fill="#fef08a" />
          <circle cx="65" cy="520" r="1.5" fill="#fef08a" />
        </g>

        <!-- Flecha vial carril norte: giro reglamentario hacia la entrada del campus -->
        <g transform="translate(36, 148)" fill="#ffffff" opacity="0.92">
          <path d="M -1.8,-18 L 1.8,-18 L 1.8,-2 C 1.8,4 5.5,8 12,8 L 12,4 L 20,9.5 L 12,15 L 12,11 C 3.5,11 -1.8,6 -1.8,-2 Z" />
        </g>

        <!-- Flecha vial carril sur: giro reglamentario hacia la entrada del campus -->
        <g transform="translate(94, 400)" fill="#ffffff" opacity="0.92">
          <path d="M -1.8,18 L 1.8,18 L 1.8,2 C 1.8,-4 5.5,-8 12,-8 L 12,-4 L 20,-9.5 L 12,-15 L 12,-11 C 3.5,-11 -1.8,-6 -1.8,2 Z" />
        </g>

        <!-- Andén este con cordón de concreto -->
        <rect x="126" y="0" width="16" height="190" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.2" />
        <line x1="126" y1="0" x2="126" y2="190" stroke="#64748b" stroke-width="2.2" />
        <rect x="126" y="370" width="16" height="190" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.2" />
        <line x1="126" y1="370" x2="126" :y2="ALTO_PLANO" stroke="#64748b" stroke-width="2.2" />
      </g>

      <!-- 3. RAMPA Y ACCESO PRINCIPAL AL CAMPUS (x: 126 a 240, y: 190 a 370) -->
      <g id="rampa-acceso">
        <!-- Asfalto de la embocadura de acceso con radios de giro suaves -->
        <path d="M 126 190 C 160 190, 185 205, 240 205 L 240 355 C 185 355, 160 370, 126 370 Z" fill="#334155" />
        <!-- Bordillos curvos con sardinel en relieve -->
        <path d="M 126 190 C 160 190, 185 205, 240 205" stroke="#64748b" stroke-width="4" fill="none" stroke-linecap="round" />
        <path d="M 126 188 C 160 188, 185 203, 240 203" stroke="#cbd5e1" stroke-width="2" fill="none" />
        <path d="M 126 370 C 160 370, 185 355, 240 355" stroke="#64748b" stroke-width="4" fill="none" stroke-linecap="round" />
        <path d="M 126 372 C 160 372, 185 357, 240 357" stroke="#cbd5e1" stroke-width="2" fill="none" />

        <!-- Cebra peatonal sobre el acceso (paso seguro para estudiantes y peatones) -->
        <g id="cebra-peatonal-acceso" opacity="0.95">
          <rect x="130" y="200" width="12" height="8" rx="1.5" fill="#ffffff" />
          <rect x="130" y="214" width="12" height="8" rx="1.5" fill="#ffffff" />
          <rect x="130" y="228" width="12" height="8" rx="1.5" fill="#ffffff" />
          <rect x="130" y="242" width="12" height="8" rx="1.5" fill="#ffffff" />
          <rect x="130" y="256" width="12" height="8" rx="1.5" fill="#ffffff" />
          <rect x="130" y="270" width="12" height="8" rx="1.5" fill="#ffffff" />
          <rect x="130" y="286" width="12" height="8" rx="1.5" fill="#ffffff" />
          <rect x="130" y="300" width="12" height="8" rx="1.5" fill="#ffffff" />
          <rect x="130" y="314" width="12" height="8" rx="1.5" fill="#ffffff" />
          <rect x="130" y="328" width="12" height="8" rx="1.5" fill="#ffffff" />
          <rect x="130" y="342" width="12" height="8" rx="1.5" fill="#ffffff" />
          <rect x="130" y="356" width="12" height="8" rx="1.5" fill="#ffffff" />
        </g>

        <!-- Divisoria de carriles entrada / salida -->
        <line x1="148" y1="280" x2="235" y2="280" stroke="#facc15" stroke-width="2.2" stroke-dasharray="8 6" opacity="0.9" />

        <!-- Señalización carril de entrada (Norte, y = 250) -->
        <g transform="translate(162, 250)" fill="#ffffff" opacity="0.92">
          <path d="M -12,-1.8 L 4,-1.8 L 4,-6 L 14,0 L 4,6 L 4,1.8 L -12,1.8 Z" />
        </g>

        <!-- Señalización carril de salida (Sur, y = 305) -->
        <g transform="translate(162, 305)" fill="#ffffff" opacity="0.92">
          <path d="M 12,-1.8 L -4,-1.8 L -4,-6 L -14,0 L -4,6 L -4,1.8 L 12,1.8 Z" />
        </g>
      </g>

      <!-- 4. PORTERÍA Y CASETA DE VIGILANCIA -->
      <g id="caseta-porteria" transform="translate(182, 126)">
        <rect x="-42" y="-34" width="84" height="78" rx="8" fill="#0f172a" opacity="0.22" />
        <rect x="-40" y="-32" width="80" height="74" rx="7" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
        <rect x="-38" y="36" width="76" height="5" rx="1.5" fill="#64748b" stroke="#475569" stroke-width="0.8" />
        <rect x="-26" y="36" width="13" height="5" fill="#0f172a" />
        <rect x="0" y="36" width="13" height="5" fill="#0f172a" />
        <rect x="26" y="36" width="10" height="5" fill="#0f172a" />
        <rect x="-34" y="-26" width="68" height="60" rx="5" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.8" />
        <path d="M -34 26 L 34 26 L 34 32 C 34 33.5, 32.5 34, 30 34 L -30 34 C -32.5 34, -34 33.5, -34 32 Z" fill="#14532d" />
        <rect x="-28" y="-6" width="56" height="30" rx="3" fill="#0f172a" />
        <rect x="-27" y="-5" width="54" height="28" rx="2" fill="#0284c7" fill-opacity="0.2" stroke="#334155" stroke-width="1.4" />
        <rect x="-24" y="11" width="12" height="9" rx="1.5" fill="#1e293b" stroke="#475569" stroke-width="0.8" />
        <rect x="-23" y="12" width="10" height="7" rx="1" fill="#0369a1" />
        <circle cx="-18" cy="15.5" r="1" fill="#22c55e" />
        <circle cx="5" cy="5" r="4.8" fill="#1e293b" />
        <path d="M 1 3 Q 5 0 9 3 L 11 5 L 1 5 Z" fill="#15803d" />
        <path d="M -3 21 C -3 13, 13 13, 13 21 Z" fill="#334155" />
        <rect x="3" y="13" width="4" height="5" fill="#f8fafc" />
        <line x1="-9" y1="-5" x2="-9" y2="23" stroke="#334155" stroke-width="1.4" />
        <line x1="16" y1="-5" x2="16" y2="23" stroke="#334155" stroke-width="1.4" />
        <polygon points="-25,18 -15,18 -5,-4 -15,-4" fill="#ffffff" opacity="0.22" />
        <polygon points="-3,18 7,18 17,-4 7,-4" fill="#ffffff" opacity="0.15" />
        <rect x="-24" y="21" width="48" height="4.5" rx="1" fill="#94a3b8" stroke="#64748b" stroke-width="0.8" />
        <rect x="-4" y="22" width="12" height="2" rx="0.5" fill="#475569" />
        <rect x="18" y="14" width="6" height="8" rx="1" fill="#0f172a" stroke="#0284c7" stroke-width="0.7" />
        <circle cx="21" cy="17" r="1" fill="#38bdf8" />
        <line x1="19.5" y1="19.5" x2="22.5" y2="19.5" stroke="#64748b" stroke-width="0.6" />
        <g transform="translate(-31, 2)">
          <line x1="0" y1="0" x2="-3" y2="4" stroke="#475569" stroke-width="1.5" />
          <rect x="-9" y="3" width="8" height="4.5" rx="1.2" fill="#1e293b" stroke="#64748b" stroke-width="0.6" />
          <circle cx="-9" cy="5.25" r="1.5" fill="#0f172a" />
          <circle cx="-9" cy="5.25" r="0.7" fill="#ef4444" />
        </g>
        <rect x="-38" y="-30" width="76" height="15" rx="3" fill="#14532d" stroke="#0f172a" stroke-width="0.8" />
        <rect x="-37" y="-29" width="74" height="13" rx="2" fill="#15803d" />
        <line x1="-37" y1="-17" x2="37" y2="-17" stroke="#ffffff" stroke-width="1.2" />
        <text x="0" y="-21" fill="#ffffff" font-size="4.2" font-weight="800" font-family="'Barlow', system-ui, sans-serif" text-anchor="middle" letter-spacing="0.3">CONTROL DE ACCESO</text>
        <circle cx="28" cy="-17" r="1.8" fill="#22c55e" stroke="#15803d" stroke-width="0.6" />
      </g>

      <!-- PARE -->
      <g id="senal-pare-colombia" transform="translate(195, 378)">
        <ellipse cx="0" cy="18" rx="5" ry="2.5" fill="#94a3b8" opacity="0.6" />
        <circle cx="0" cy="18" r="3.5" fill="#cbd5e1" stroke="#64748b" stroke-width="1" />
        <circle cx="0" cy="18" r="1.5" fill="#334155" />
        <line x1="0" y1="0" x2="0" y2="18" stroke="#475569" stroke-width="2.8" />
        <line x1="-0.6" y1="0" x2="-0.6" y2="18" stroke="#94a3b8" stroke-width="1" />
        <polygon points="-13,-3.5 -5.5,-11 5.5,-11 13,-3.5 13,7.5 5.5,15 -5.5,15 -13,7.5" fill="#0f172a" opacity="0.18" filter="blur(1.5px)" />
        <polygon points="-13,-5.5 -5.5,-13 5.5,-13 13,-5.5 13,5.5 5.5,13 -5.5,13 -13,5.5" fill="#dc2626" stroke="#ffffff" stroke-width="1.6" />
        <polygon points="-11,-4.5 -4.5,-11 4.5,-11 11,-4.5 11,4.5 4.5,11 -4.5,11 -11,4.5" fill="#dc2626" stroke="#ffffff" stroke-width="0.8" />
        <text x="0" y="3.5" fill="#ffffff" font-size="7" font-weight="900" font-family="'Barlow', system-ui, sans-serif" letter-spacing="0.4" text-anchor="middle">Pare</text>
      </g>

      <!-- Velocidad 10 km/h -->
      <g id="senal-velocidad-colombia" transform="translate(135, 172)">
        <line x1="0" y1="0" x2="0" y2="18" stroke="#475569" stroke-width="2" />
        <circle cx="0" cy="-4" r="11" fill="#ffffff" stroke="#dc2626" stroke-width="2.2" />
        <text x="0" y="-1" fill="#0f172a" font-size="8" font-weight="900" text-anchor="middle">10</text>
        <text x="0" y="4.5" fill="#475569" font-size="4" font-weight="bold" text-anchor="middle">km/h</text>
      </g>

      <!-- Talanquera -->
      <g id="talanquera-unisucre" transform="translate(235, 210)">
        <rect x="-13" y="-26" width="26" height="34" rx="4" fill="#ea580c" stroke="#c2410c" stroke-width="1.5" />
        <rect x="-7" y="-20" width="14" height="10" rx="2" fill="#0f172a" />
        <circle cx="0" cy="-15" r="3.5" :fill="bloqueada || talanquera === 'cerrada' || talanquera === 'bloqueada' || talanquera === 'cerrando' ? '#ef4444' : '#22c55e'" />
        <g :transform="`rotate(${barrierAngle}, 0, 0)`" class="talanquera-brazo">
          <rect x="-4" y="0" width="8" height="135" rx="3" fill="#ffffff" stroke="#b91c1c" stroke-width="1" />
          <rect x="-4" y="15" width="8" height="18" fill="#dc2626" />
          <rect x="-4" y="45" width="8" height="18" fill="#dc2626" />
          <rect x="-4" y="75" width="8" height="18" fill="#dc2626" />
          <rect x="-4" y="105" width="8" height="18" fill="#dc2626" />
          <circle cx="0" cy="132" r="3.5" fill="#ffffff" stroke="#dc2626" stroke-width="0.8" />
        </g>
        <circle cx="0" cy="0" r="6" fill="#334155" stroke="#f8fafc" stroke-width="1.5" />
        <g v-if="bloqueada" transform="translate(-52, 0)">
          <rect x="-40" y="-10" width="80" height="20" rx="3" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" />
          <text x="0" y="4" fill="#ffffff" font-size="8" font-weight="bold" text-anchor="middle">PASO BLOQUEADO</text>
        </g>
      </g>
      <!-- Soporte del brazo cuando está cerrado, al final del carril. -->
      <rect x="229" y="342" width="12" height="14" rx="2" fill="#ea580c" />

      <!-- 4. PATIO: Calzada y Grilla de Parqueadero Completa (x: 260 a 980, y: 50 a 510) -->
      <rect x="240" y="42" :width="ANCHO_PLANO - 240" height="476" rx="4" fill="#166534" opacity="0.18" />

      <!-- Superficie de asfalto que abarca toda la zona de estacionamiento -->
      <rect :x="PATIO.x" :y="PATIO.y" :width="PATIO.w" :height="PATIO.h" rx="14" fill="#1e293b" stroke="#0f172a" stroke-width="2.5" />

      <!-- Bordillos de concreto perimetrales al fondo de las plazas -->
      <line x1="280" y1="50" x2="960" y2="50" stroke="#64748b" stroke-width="5.5" stroke-linecap="square" />
      <line x1="280" y1="48" x2="960" y2="48" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="square" />
      <line x1="280" y1="510" x2="960" y2="510" stroke="#64748b" stroke-width="5.5" stroke-linecap="square" />
      <line x1="280" y1="512" x2="960" y2="512" stroke="#475569" stroke-width="1.8" stroke-linecap="square" />

      <!-- Corredor central (calzada de maniobra vehicular): y=240 a 320 -->
      <rect x="240" :y="CORREDOR.y" :width="ANCHO_PLANO - 250" :height="CORREDOR.h" fill="#334155" />
      <line x1="245" :y1="CORREDOR.y + CORREDOR.h / 2" :x2="ANCHO_PLANO - 25" :y2="CORREDOR.y + CORREDOR.h / 2" stroke="#ffffff" stroke-width="2.2" stroke-dasharray="16 10" opacity="0.9" />
      <!-- Dos sentidos: carril superior entra al patio, carril inferior sale a portería -->
      <path :d="`M 422 ${CORREDOR.y + CORREDOR.h * 0.25} l -22 -7 l 0 14 z`" fill="#ffffff" opacity="0.9" />
      <path :d="`M 698 ${CORREDOR.y + CORREDOR.h * 0.75} l 22 -7 l 0 14 z`" fill="#ffffff" opacity="0.9" />

      <!-- Bahías: Grilla continua de 10 plazas (5 Norte contiguas, 5 Sur contiguas) -->
      <g v-for="bahia in bahias" :key="bahia.id">
        <g
          :transform="`translate(${(bahia.posicion.x / 100) * ANCHO_PLANO}, ${(bahia.posicion.y / 100) * ALTO_PLANO})`"
          class="cursor-pointer group"
          role="button"
          tabindex="0"
          :aria-label="`Abrir consola para la plaza ${bahia.id}`"
          @click="$emit('select-espacio', bahia.id)"
          @keydown.enter.prevent="$emit('select-espacio', bahia.id)"
          @keydown.space.prevent="$emit('select-espacio', bahia.id)"
        >
          <title>{{ `Plaza ${bahia.id} · ${bahia.estado === 'LIBRE' ? 'Disponible' : bahia.estado === 'OCUPADO' ? 'Ocupada' : 'Sin Dato'}` }}</title>

          <!-- Rotación hacia el corredor central (local +x = entrada abierta desde la vía) -->
          <g :transform="`rotate(${bahia.posicion.rotacion})`">
            
            <!-- 1. Pavimento de la plaza (130x190) que llena la grilla -->
            <rect
              x="-95"
              y="-65"
              width="190"
              height="130"
              rx="4"
              :fill="bahia.estado === 'LIBRE' ? '#14251e' : bahia.estado === 'OCUPADO' ? '#18202d' : '#1e293b'"
              stroke="#0f172a"
              stroke-width="1.8"
            />

            <!-- 2. Demarcación vial termo-plástica: franjas blancas nítidas contiguas compartidas -->
            <path
              d="M 95 -65 L -95 -65 L -95 65 L 95 65"
              fill="none"
              stroke="#ffffff"
              stroke-width="3"
              stroke-linecap="square"
              stroke-linejoin="miter"
              opacity="0.95"
            />
            <!-- T-ticks de remate vial en la entrada desde el corredor -->
            <line x1="95" y1="-70" x2="95" y2="-60" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.95" />
            <line x1="95" y1="60" x2="95" y2="70" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.95" />

            <!-- 3. Tope de llanta de caucho vulcanizado amplio (Wheel Stop) -->
            <g id="tope-llanta" transform="translate(-75, 0)">
              <!-- Sombra del tope sobre el asfalto -->
              <rect x="-2" y="-36" width="12" height="72" rx="3" fill="#020617" opacity="0.65" />
              <!-- Cuerpo de caucho vulcanizado -->
              <rect x="-5" y="-34" width="10" height="68" rx="2" fill="#0f172a" stroke="#334155" stroke-width="1" />
              <!-- Franjas reflectivas blancas del tope -->
              <rect x="-4" y="-28" width="8" height="8" fill="#f8fafc" />
              <rect x="-4" y="-12" width="8" height="8" fill="#f8fafc" />
              <rect x="-4" y="4" width="8" height="8" fill="#f8fafc" />
              <rect x="-4" y="20" width="8" height="8" fill="#f8fafc" />
              <!-- Pernos de fijación -->
              <circle cx="0" cy="-20" r="1.5" fill="#94a3b8" />
              <circle cx="0" cy="20" r="1.5" fill="#94a3b8" />
            </g>

            <!-- 4. Código de plaza pintado en el pavimento en gran tamaño (E01...E10) -->
            <text
              x="-48"
              y="0"
              :transform="bahia.posicion.rotacion === 270 ? 'rotate(180 -48 0)' : undefined"
              fill="#ffffff"
              opacity="0.95"
              font-size="18"
              font-weight="900"
              font-family="'JetBrains Mono', 'Barlow', monospace"
              text-anchor="middle"
              dominant-baseline="central"
              letter-spacing="1.5"
            >
              {{ bahia.id }}
            </text>

            <!-- 5. Demarcación vial para plaza LIBRE: DISPONIBLE -->
            <g v-if="bahia.estado === 'LIBRE'" opacity="0.95">
              <text
                x="25"
                y="0"
                :transform="bahia.posicion.rotacion === 270 ? 'rotate(180 25 0)' : undefined"
                fill="#22c55e"
                font-size="9.5"
                font-weight="900"
                font-family="'Barlow Condensed', 'Barlow', system-ui, sans-serif"
                text-anchor="middle"
                dominant-baseline="central"
                letter-spacing="1.5"
              >
                DISPONIBLE
              </text>
            </g>

            <!-- 6. Demarcación para plaza en CALIBRACIÓN / SIN DATO -->
            <g v-if="bahia.estado === 'SIN_DATO'" opacity="0.85">
              <rect x="-90" y="-60" width="180" height="120" fill="url(#bay-hatch-unisucre)" />
              <text
                x="25"
                y="0"
                :transform="bahia.posicion.rotacion === 270 ? 'rotate(180 25 0)' : undefined"
                fill="#b45309"
                font-size="9.5"
                font-weight="900"
                font-family="'Barlow Condensed', 'Barlow', system-ui, sans-serif"
                text-anchor="middle"
                dominant-baseline="central"
                letter-spacing="1.2"
              >
                EN ESPERA
              </text>
            </g>

            <!-- 7. Demarcación vial para plaza OCUPADA: rótulo limpio y profesional OCUPADO (sin moto ni sombras) -->
            <g v-if="bahia.estado === 'OCUPADO'" opacity="0.95">
              <text
                x="25"
                y="0"
                :transform="bahia.posicion.rotacion === 270 ? 'rotate(180 25 0)' : undefined"
                fill="#f87171"
                font-size="9.5"
                font-weight="900"
                font-family="'Barlow Condensed', 'Barlow', system-ui, sans-serif"
                text-anchor="middle"
                dominant-baseline="central"
                letter-spacing="1.5"
              >
                OCUPADO
              </text>
            </g>

            <!-- 8. Sensor IoT inteligente de plaza con halo LED -->
            <g transform="translate(80, 0)">
              <!-- Halo luminoso proyectado al pavimento -->
              <circle
                cx="0"
                cy="0"
                r="18"
                :fill="bahia.estado === 'LIBRE' ? 'url(#sensor-glow-green)' : bahia.estado === 'OCUPADO' ? 'url(#sensor-glow-red)' : 'url(#sensor-glow-amber)'"
              />
              <!-- Carcasa metálica del sensor de plaza -->
              <circle cx="0" cy="0" r="6" fill="#0f172a" stroke="#475569" stroke-width="1" />
              <!-- Lente LED activa -->
              <circle
                cx="0"
                cy="0"
                r="3.8"
                :fill="bahia.estado === 'LIBRE' ? '#15803d' : bahia.estado === 'OCUPADO' ? '#dc2626' : '#b45309'"
                stroke="#ffffff"
                stroke-width="0.8"
                :class="bahia.estado === 'LIBRE' ? 'animate-pulse' : ''"
              />
              <!-- Brillo especular en lente -->
              <circle cx="-1.2" cy="-1.2" r="1" fill="#ffffff" opacity="0.85" />
            </g>

            <!-- 9. Efecto de foco al pasar el cursor (hover highlight) -->
            <rect
              x="-95"
              y="-65"
              width="190"
              height="130"
              rx="4"
              fill="none"
              stroke="#38bdf8"
              stroke-width="2.5"
              class="opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none"
            />
          </g>
        </g>
      </g>

      <!-- 5. MOTOCICLETAS EN MOVIMIENTO / SIMULACIÓN VIAL -->
      <g v-for="anim in animaciones" :key="anim.id">
        <g
          :transform="`translate(${(anim.posicionActual.x / 100) * ANCHO_PLANO}, ${(anim.posicionActual.y / 100) * ALTO_PLANO})`"
          filter="url(#shadow-unisucre)"
        >
          <g :transform="`rotate(${anim.posicionActual.rotacion})`">
            <MotoFigura
              :modelo="anim.modelo ?? 'clasica'"
              :color="anim.color ?? '#15803d'"
              :cascoColor="anim.cascoColor ?? '#eab308'"
              :faro="anim.etapa !== 'esperando'"
              :pata="false"
              :etiqueta="anim.etapa === 'esperando'
                ? 'ESPERANDO'
                : anim.tipo === 'salida'
                  ? 'SALIENDO'
                  : `ASIGNADA ${anim.espacioId}`"
            />
          </g>
        </g>
      </g>
    </svg>
  </div>
</template>
