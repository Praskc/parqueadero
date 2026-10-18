<script setup lang="ts">
import { computed } from "vue";
import type { AnimacionMoto, Bahia, EstadoTalanquera } from "../../types/hmi";
import MotoAnimada from "./MotoAnimada.vue";
import MotoFigura from "./MotoFigura.vue";
import { ALTO_PLANO, ANCHO_PLANO, BAHIA_ALTO, BAHIA_ANCHO, CORREDOR, PATIO } from "../../config/bahias";

const props = defineProps<{
  bahias: Bahia[];
  animaciones: AnimacionMoto[];
  talanquera: EstadoTalanquera;
  bloqueada: boolean;
}>();

const animEspacioIds = computed(() => new Set(props.animaciones.map((a) => a.espacioId)));

const barrierAngle = computed(() => {
  if (props.bloqueada || props.talanquera === "bloqueada" || props.talanquera === "cerrada") return 0;
  if (props.talanquera === "abierta") return -85;
  if (props.talanquera === "abriendo") return -50;
  if (props.talanquera === "cerrando") return -25;
  return 0;
});
</script>

<template>
  <div
    class="relative w-full bg-slate-200 rounded-2xl border-2 border-slate-300 overflow-hidden shadow-md select-none"
    :style="{ aspectRatio: `${ANCHO_PLANO} / ${ALTO_PLANO}` }"
  >
    <svg :viewBox="`0 0 ${ANCHO_PLANO} ${ALTO_PLANO}`" class="w-full h-full block" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="headlight-unisucre" cx="15%" cy="50%" r="85%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95" />
          <stop offset="50%" stop-color="#fef08a" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#fef08a" stop-opacity="0" />
        </radialGradient>
        <pattern id="bay-hatch-unisucre" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="14" fill="rgba(234, 179, 8, 0.25)" />
          <rect x="7" width="7" height="14" fill="transparent" />
        </pattern>
        <filter id="shadow-unisucre" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="#0f172a" flood-opacity="0.45" />
        </filter>
      </defs>

      <!-- 1. TERRENO -->
      <rect x="0" y="0" :width="ANCHO_PLANO" :height="ALTO_PLANO" fill="#e2e8f0" />

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

      <!-- 2. CALLE PÚBLICA -->
      <rect x="0" y="0" width="126" :height="ALTO_PLANO" fill="#334155" />
      <line x1="28" y1="0" x2="28" :y2="ALTO_PLANO" stroke="#f8fafc" stroke-width="1.8" opacity="0.85" />
      <g transform="translate(14, 65)" opacity="0.85">
        <line x1="0" y1="-14" x2="0" y2="14" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
        <path d="M -5 7 L 0 16 L 5 7" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </g>
      <g transform="translate(43, 135)" opacity="0.85">
        <line x1="0" y1="-14" x2="0" y2="10" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
        <path d="M 0 4 Q 0 14, 10 14 L 14 14" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
        <path d="M 8 9 L 17 14 L 8 19" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </g>
      <line x1="58" y1="0" x2="58" :y2="ALTO_PLANO" stroke="#facc15" stroke-width="2.2" />
      <line x1="64" y1="0" x2="64" :y2="ALTO_PLANO" stroke="#facc15" stroke-width="2.2" />
      <line x1="95" y1="0" x2="95" y2="185" stroke="#f8fafc" stroke-width="1.8" opacity="0.85" />
      <line x1="95" y1="185" x2="95" :y2="ALTO_PLANO - 185" stroke="#f8fafc" stroke-width="1.8" stroke-dasharray="6 6" opacity="0.7" />
      <line x1="95" :y1="ALTO_PLANO - 185" x2="95" :y2="ALTO_PLANO" stroke="#f8fafc" stroke-width="1.8" opacity="0.85" />
      <g transform="translate(80, 425)" opacity="0.85">
        <line x1="0" y1="14" x2="0" y2="-10" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
        <path d="M 0 -4 Q 0 -14, 10 -14 L 14 -14" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
        <path d="M 8 -19 L 17 -14 L 8 -9" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </g>
      <g transform="translate(110, 495)" opacity="0.85">
        <line x1="0" y1="14" x2="0" y2="-14" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
        <path d="M -5 -7 L 0 -16 L 5 -7" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </g>

      <!-- Andén -->
      <rect x="126" y="0" width="16" height="190" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.2" />
      <line x1="126" y1="0" x2="126" y2="190" stroke="#64748b" stroke-width="2.2" />
      <rect x="126" y="370" width="16" height="190" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1.2" />
      <line x1="126" y1="370" x2="126" :y2="ALTO_PLANO - 42" stroke="#64748b" stroke-width="2.2" />

      <!-- Rampa -->
      <path d="M 126 190 C 155 190, 185 205, 240 205 L 240 355 C 185 355, 155 370, 126 370 Z" fill="#334155" />
      <path d="M 126 190 C 155 190, 185 205, 240 205" stroke="#94a3b8" stroke-width="3" fill="none" stroke-linecap="round" />
      <path d="M 126 188 C 155 188, 185 203, 240 203" stroke="#f8fafc" stroke-width="1.5" fill="none" />
      <path d="M 126 370 C 155 370, 185 355, 240 355" stroke="#94a3b8" stroke-width="3" fill="none" stroke-linecap="round" />
      <path d="M 126 372 C 155 372, 185 357, 240 357" stroke="#f8fafc" stroke-width="1.5" fill="none" />

      <!-- Cebra -->
      <g id="cebra-peatonal-acceso" opacity="0.9">
        <rect x="128" y="202" width="11" height="7" rx="1" fill="#ffffff" />
        <rect x="128" y="215" width="11" height="7" rx="1" fill="#ffffff" />
        <rect x="128" y="228" width="11" height="7" rx="1" fill="#ffffff" />
        <rect x="128" y="241" width="11" height="7" rx="1" fill="#ffffff" />
        <rect x="128" y="254" width="11" height="7" rx="1" fill="#ffffff" />
        <rect x="128" y="267" width="11" height="7" rx="1" fill="#ffffff" />
        <rect x="128" y="286" width="11" height="7" rx="1" fill="#ffffff" />
        <rect x="128" y="299" width="11" height="7" rx="1" fill="#ffffff" />
        <rect x="128" y="312" width="11" height="7" rx="1" fill="#ffffff" />
        <rect x="128" y="325" width="11" height="7" rx="1" fill="#ffffff" />
        <rect x="128" y="338" width="11" height="7" rx="1" fill="#ffffff" />
        <rect x="128" y="351" width="11" height="7" rx="1" fill="#ffffff" />
      </g>

      <!-- Ramp: divisoria y flechas -->
      <line x1="145" y1="280" x2="235" y2="280" stroke="#ffffff" stroke-width="2.2" stroke-dasharray="8 5" opacity="0.85" />
      <g opacity="0.8">
        <path d="M 154 245 L 166 245 M 161 241 L 166 245 L 161 249" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
        <path d="M 154 315 L 166 315 M 161 311 L 166 315 L 161 319" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
      </g>
      <text x="175" y="222" fill="#94a3b8" font-size="5.5" font-weight="bold" letter-spacing="0.5" opacity="0.8">CARRIL NORTE</text>
      <text x="175" y="338" fill="#94a3b8" font-size="5.5" font-weight="bold" letter-spacing="0.5" opacity="0.8">CARRIL SUR</text>

      <!-- 3. PORTERÍA Y CASETA (original) -->
      <g id="caseta-porteria" transform="translate(182, 126)">
        <rect x="-42" y="-34" width="84" height="78" rx="8" fill="#0f172a" opacity="0.22" />
        <rect x="-40" y="-32" width="80" height="74" rx="7" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
        <rect x="-38" y="36" width="76" height="5" rx="1.5" fill="#eab308" stroke="#ca8a04" stroke-width="0.8" />
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
        <circle cx="28" cy="-17" r="1.8" fill="#fef08a" stroke="#ca8a04" stroke-width="0.6" />
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

      <!-- Velocidad -->
      <g id="senal-velocidad-colombia" transform="translate(135, 172)">
        <line x1="0" y1="0" x2="0" y2="18" stroke="#475569" stroke-width="2" />
        <circle cx="0" cy="-4" r="11" fill="#ffffff" stroke="#dc2626" stroke-width="2.2" />
        <text x="0" y="-1" fill="#0f172a" font-size="8" font-weight="900" text-anchor="middle">10</text>
        <text x="0" y="4.5" fill="#475569" font-size="4" font-weight="bold" text-anchor="middle">km/h</text>
      </g>

      <!-- Sensores -->
      <rect x="175" y="228" width="48" height="38" rx="3" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="5 3" />
      <text x="199" y="250" fill="#0284c7" font-size="6.5" text-anchor="middle" font-weight="bold">SENSOR N</text>
      <rect x="175" y="294" width="48" height="38" rx="3" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="5 3" />
      <text x="199" y="316" fill="#0284c7" font-size="6.5" text-anchor="middle" font-weight="bold">SENSOR S</text>

      <!-- Talanquera -->
      <g id="talanquera-unisucre" transform="translate(235, 210)">
        <rect x="-13" y="-26" width="26" height="34" rx="4" fill="#ea580c" stroke="#c2410c" stroke-width="1.5" />
        <rect x="-7" y="-20" width="14" height="10" rx="2" fill="#0f172a" />
        <circle cx="0" cy="-15" r="3.5" :fill="bloqueada || talanquera === 'cerrada' || talanquera === 'bloqueada' ? '#ef4444' : '#22c55e'" />
        <g :transform="`rotate(${barrierAngle}, 0, 0)`" class="transition-transform duration-500 ease-out">
          <rect x="-4" y="0" width="8" height="135" rx="3" fill="#ffffff" stroke="#b91c1c" stroke-width="1" />
          <rect x="-4" y="15" width="8" height="18" fill="#dc2626" />
          <rect x="-4" y="45" width="8" height="18" fill="#dc2626" />
          <rect x="-4" y="75" width="8" height="18" fill="#dc2626" />
          <rect x="-4" y="105" width="8" height="18" fill="#dc2626" />
          <circle cx="0" cy="132" r="3.5" fill="#eab308" />
          <g v-if="bloqueada" transform="translate(0, 68)">
            <rect x="-40" y="-10" width="80" height="20" rx="3" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" />
            <text x="0" y="4" fill="#ffffff" font-size="8" font-weight="bold" text-anchor="middle">PASO BLOQUEADO</text>
          </g>
        </g>
        <circle cx="0" cy="0" r="6" fill="#334155" stroke="#f8fafc" stroke-width="1.5" />
      </g>
      <rect x="229" y="342" width="12" height="14" rx="2" fill="#ea580c" />

      <!-- 4. PATIO: fondo verde, corredor central, una sola isla de asfalto -->
      <rect x="240" y="42" :width="ANCHO_PLANO - 240" height="476" rx="4" fill="#166534" opacity="0.22" />

      <!-- Patio de asfalto: las dos filas de puestos -->
      <rect :x="PATIO.x" :y="PATIO.y" :width="PATIO.w" :height="PATIO.h" rx="14" fill="#334155" stroke="#1e293b" stroke-width="2.5" />

      <!-- Corredor central: empalma con la rampa (y=280) y cruza el patio -->
      <rect x="240" :y="CORREDOR.y" :width="ANCHO_PLANO - 260" :height="CORREDOR.h" fill="#475569" />
      <line x1="245" :y1="CORREDOR.y + CORREDOR.h / 2" :x2="ANCHO_PLANO - 25" :y2="CORREDOR.y + CORREDOR.h / 2" stroke="#facc15" stroke-width="1.2" stroke-dasharray="12 8" opacity="0.85" />
      <path :d="`M 400 ${CORREDOR.y + CORREDOR.h / 2} l 24 -7 l 0 14 z`" fill="#facc15" opacity="0.9" />
      <path :d="`M 700 ${CORREDOR.y + CORREDOR.h / 2} l 24 -7 l 0 14 z`" fill="#facc15" opacity="0.9" />

      <!-- Letrero pintado sobre el corredor (demarcación vial, no flotante) -->
      <g id="letrero-parqueadero">
        <rect x="250" :y="CORREDOR.y + 6" width="330" height="20" rx="4" fill="rgba(71, 85, 105, 0.85)" />
        <text x="260" :y="CORREDOR.y + 20" fill="#facc15" font-size="10" font-weight="800" font-family="'Barlow', system-ui, sans-serif" letter-spacing="1.5">PARQUEADERO</text>
        <text x="368" :y="CORREDOR.y + 20" fill="#cbd5e1" font-size="7" font-weight="600" font-family="'Barlow', system-ui, sans-serif">E01 – E10 · 10 cupos</text>
      </g>

      <!-- Bahías: 80px de gap entre columnas, distribuidas en TODA la isla -->
      <g v-for="bahia in bahias" :key="bahia.id">
        <g :transform="`translate(${(bahia.posicion.x / 100) * ANCHO_PLANO}, ${(bahia.posicion.y / 100) * ALTO_PLANO})`">
          <rect
            :x="-BAHIA_ANCHO / 2"
            :y="-BAHIA_ALTO / 2"
            :width="BAHIA_ANCHO"
            :height="BAHIA_ALTO"
            rx="3"
            :fill="bahia.estado === 'OCUPADO' ? 'rgba(239, 68, 68, 0.28)' : bahia.estado === 'LIBRE' ? 'rgba(34, 197, 94, 0.24)' : 'rgba(245, 158, 11, 0.22)'"
            stroke="#facc15"
            stroke-width="2"
          />
          <text x="0" :y="bahia.posicion.rotacion === 90 ? -BAHIA_ALTO / 2 + 13 : BAHIA_ALTO / 2 - 6" fill="#ffffff" font-size="8.5" font-weight="bold" text-anchor="middle">{{ bahia.id }}</text>
          <circle cx="0" :cy="bahia.posicion.rotacion === 90 ? BAHIA_ALTO / 2 - 5 : -BAHIA_ALTO / 2 + 5" r="3.5" :fill="bahia.estado === 'LIBRE' ? '#22c55e' : bahia.estado === 'OCUPADO' ? '#ef4444' : '#f59e0b'" stroke="#ffffff" stroke-width="0.8" />

          <g v-if="bahia.estado === 'OCUPADO' && !animEspacioIds.has(bahia.id)" :transform="`rotate(${bahia.posicion.rotacion})`" filter="url(#shadow-unisucre)">
            <ellipse cx="0.8" cy="1" rx="20" ry="9.5" fill="rgba(15,23,42,0.3)" />
            <MotoFigura color="#15803d" pata />
          </g>

          <g v-if="bahia.estado === 'LIBRE' && !animEspacioIds.has(bahia.id)" opacity="0.85">
            <circle cx="0" cy="0" r="8" fill="none" stroke="#22c55e" stroke-width="1.2" />
            <text x="0" y="2" fill="#22c55e" font-size="5.5" font-weight="bold" text-anchor="middle">LIBRE</text>
          </g>
        </g>
      </g>

      <!-- Motos en movimiento -->
      <MotoAnimada v-for="anim in animaciones" :key="anim.id" :anim="anim" />
    </svg>
  </div>
</template>
