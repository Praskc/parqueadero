<script setup lang="ts">
import { computed } from 'vue';
import type { EspacioInfo, AnimacionMotoActiva, EstadoTalanquera } from '../types/parqueadero';

const props = withDefaults(
  defineProps<{
    espacios: EspacioInfo[];
    animacionesActivas?: AnimacionMotoActiva[];
    animacionActiva?: AnimacionMotoActiva | null;
    barrierState: EstadoTalanquera;
    talanqueraBloqueada: boolean;
  }>(),
  {
    animacionesActivas: () => [],
    animacionActiva: null,
  }
);

const emit = defineEmits<{
  (e: 'selectEspacio', id: string): void;
}>();

const listaAnimaciones = computed(() => {
  if (props.animacionesActivas && props.animacionesActivas.length > 0) {
    return props.animacionesActivas;
  }
  if (props.animacionActiva) {
    return [props.animacionActiva];
  }
  return [];
});

const animEspacioIds = computed(() => {
  return new Set(listaAnimaciones.value.map((a) => a.espacioId));
});

// Ángulo de la talanquera: 0° = cerrada bloqueando vía; -85° = levantada
const barrierAngle = computed(() => {
  if (props.talanqueraBloqueada || props.barrierState === 'bloqueada' || props.barrierState === 'cerrada') {
    return 0;
  }
  if (props.barrierState === 'abierta') {
    return -85;
  }
  if (props.barrierState === 'abriendo') {
    return -50;
  }
  if (props.barrierState === 'cerrando') {
    return -25;
  }
  return 0;
});
</script>

<template>
  <div class="relative w-full aspect-16/9 max-h-[500px] bg-slate-200 rounded-2xl border-2 border-slate-300 overflow-hidden shadow-md select-none">
    
    <svg
      viewBox="0 0 1000 560"
      class="w-full h-full block"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <!-- Gradiente para el faro de la moto -->
        <radialGradient id="headlight-unisucre" cx="15%" cy="50%" r="85%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95" />
          <stop offset="50%" stop-color="#fef08a" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#fef08a" stop-opacity="0" />
        </radialGradient>

        <!-- Rayado amarillo de seguridad vial para bahías -->
        <pattern id="bay-hatch-unisucre" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="14" fill="rgba(234, 179, 8, 0.25)" />
          <rect x="7" width="7" height="14" fill="transparent" />
        </pattern>

        <!-- Sombra realista de vehículos -->
        <filter id="shadow-unisucre" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="#0f172a" flood-opacity="0.45" />
        </filter>
      </defs>

      <!-- 1. BASE: TERRENO DEL CAMPUS Y CALLE EXTERIOR -->
      <rect x="0" y="0" width="1000" height="560" fill="#e2e8f0" />

      <!-- ÁREAS VERDES Y JARDINES INTEGRADOS DEL CAMPUS PUERTA ROJA (UNISUCRE) -->
      <!-- Jardinería y andenes perimetrales norte (vegetación ornamental sin textos invasivos) -->
      <g id="jardineria-norte">
        <!-- Terreno con césped verde institucional -->
        <rect x="235" y="0" width="765" height="42" fill="#166534" />
        <!-- Sardinel de concreto divisorio -->
        <line x1="235" y1="42" x2="1000" y2="42" stroke="#cbd5e1" stroke-width="3" />
        <!-- Árboles y vegetación ornamental de Sucre -->
        <circle cx="280" cy="21" r="14" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
        <circle cx="450" cy="21" r="12" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
        <circle cx="650" cy="21" r="14" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
        <circle cx="850" cy="21" r="13" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
      </g>

      <!-- Jardinería y andenes perimetrales sur -->
      <g id="jardineria-sur">
        <rect x="235" y="518" width="765" height="42" fill="#166534" />
        <line x1="235" y1="518" x2="1000" y2="518" stroke="#cbd5e1" stroke-width="3" />
        <circle cx="320" cy="538" r="13" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
        <circle cx="550" cy="538" r="14" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
        <circle cx="780" cy="538" r="12" fill="#15803d" stroke="#14532d" stroke-width="1.5" />
      </g>

      <!-- 2. LA CALLE PÚBLICA EXTERIOR: DOBLE CALZADA CON DOBLE CARRIL NORTE Y SUR (Norma Colombiana) -->
      <!-- Ancho total de vía pública: x = 0 a 126 -->
      <rect x="0" y="0" width="126" height="560" fill="#334155" />

      <!-- CALZADA OCCIDENTAL: SENTIDO NORTE A SUR (Bajando) -->
      <!-- Carril 1 (exterior): x = 0 a 28 | Carril 2 (interior / giro hacia Unisucre): x = 28 a 58 -->
      <!-- Línea continua blanca divisoria de carril (norma colombiana: continua, sin puntos) -->
      <line x1="28" y1="0" x2="28" y2="560" stroke="#ffffff" stroke-width="1.8" opacity="0.85" />

      <!-- Flechas viales pintadas en el asfalto (Carril Sentido Sur) -->
      <!-- Carril 1: Flecha recta hacia abajo -->
      <g transform="translate(14, 65)" opacity="0.85">
        <line x1="0" y1="-14" x2="0" y2="14" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
        <path d="M -5 7 L 0 16 L 5 7" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </g>
      <!-- Carril 2: Flecha combinada de giro hacia la Universidad de Sucre -->
      <g transform="translate(43, 135)" opacity="0.85">
        <line x1="0" y1="-14" x2="0" y2="10" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
        <path d="M 0 4 Q 0 14, 10 14 L 14 14" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
        <path d="M 8 9 L 17 14 L 8 19" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </g>

      <!-- SEPARADOR CENTRAL VIAL: DOBLE LÍNEA CONTINUA AMARILLA (NORMA COLOMBIANA) -->
      <line x1="59" y1="0" x2="59" y2="560" stroke="#facc15" stroke-width="2.5" />
      <line x1="65" y1="0" x2="65" y2="560" stroke="#facc15" stroke-width="2.5" />

      <!-- CALZADA ORIENTAL: SENTIDO SUR A NORTE (Subiendo) -->
      <!-- Carril 3 (interior / giro hacia Unisucre): x = 66 a 96 | Carril 4 (exterior): x = 96 a 126 -->
      <!-- Línea continua blanca divisoria de carril -->
      <line x1="96" y1="0" x2="96" y2="560" stroke="#ffffff" stroke-width="1.8" opacity="0.85" />

      <!-- Flechas viales pintadas en el asfalto (Carril Sentido Norte) -->
      <!-- Carril 3: Flecha de giro hacia la Universidad de Sucre -->
      <g transform="translate(81, 425)" opacity="0.85">
        <line x1="0" y1="14" x2="0" y2="-10" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
        <path d="M 0 -4 Q 0 -14, 10 -14 L 14 -14" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
        <path d="M 8 -19 L 17 -14 L 8 -9" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </g>
      <!-- Carril 4: Flecha recta hacia arriba -->
      <g transform="translate(111, 495)" opacity="0.85">
        <line x1="0" y1="14" x2="0" y2="-14" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
        <path d="M -5 -7 L 0 -16 L 5 -7" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </g>

      <!-- ANDÉN PEATONAL PÚBLICO EXTERIOR CON BORDILLO DE CONCRETO -->
      <rect x="126" y="0" width="18" height="560" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1" />

      <!-- BOCA Y RAMPA DE ACCESO CON DOBLE CARRIL (NORTE Y SUR) AL CAMPUS PUERTA ROJA -->
      <!-- Pavimento asfáltico amplio que integra ambos sentidos de la calle -->
      <path
        d="M 59 100 
           C 95 145, 122 205, 240 205 
           L 240 355 
           C 122 355, 95 415, 65 460 
           L 59 460 Z"
        fill="#334155"
      />

      <!-- Bordes de calzada continuos blancos en la rampa -->
      <path
        d="M 59 110 C 95 150, 122 210, 240 210"
        stroke="#ffffff"
        stroke-width="2.5"
        fill="none"
        opacity="0.95"
      />
      <path
        d="M 65 450 C 95 410, 122 350, 240 350"
        stroke="#ffffff"
        stroke-width="2.5"
        fill="none"
        opacity="0.95"
      />

      <!-- LÍNEA CONTINUA BLANCA DIVISORIA CENTRAL DEL DOBLE CARRIL DE ACCESO -->
      <!-- Separa el Carril Norte del Carril Sur para evitar superposición en la animación -->
      <path
        d="M 65 280 C 105 280, 150 280, 235 280"
        stroke="#ffffff"
        stroke-width="2.2"
        fill="none"
        opacity="0.9"
      />

      <!-- Rótulos viales sutiles de carril en el pavimento -->
      <text x="145" y="244" fill="#94a3b8" font-size="6" font-weight="bold" letter-spacing="0.5" opacity="0.75">
        CARRIL NORTE
      </text>
      <text x="145" y="324" fill="#94a3b8" font-size="6" font-weight="bold" letter-spacing="0.5" opacity="0.75">
        CARRIL SUR
      </text>

      <!-- 3. PORTERÍA Y CASETA DE VIGILANCIA INSTITUCIONAL (UNIVERSIDAD DE SUCRE) -->
      <g id="caseta-porteria" transform="translate(182, 126)">
        <!-- Sombra base suave proyectada en el suelo -->
        <rect x="-42" y="-34" width="84" height="78" rx="8" fill="#0f172a" opacity="0.22" filter="blur(3px)" />

        <!-- Isleta / Andén de concreto perimetral elevado -->
        <rect x="-40" y="-32" width="80" height="74" rx="7" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5" />
        <!-- Sardinel de protección vehicular con borde reflectivo amarillo en el frente hacia la vía -->
        <rect x="-38" y="36" width="76" height="5" rx="1.5" fill="#eab308" stroke="#ca8a04" stroke-width="0.8" />
        <rect x="-26" y="36" width="13" height="5" fill="#0f172a" />
        <rect x="0" y="36" width="13" height="5" fill="#0f172a" />
        <rect x="26" y="36" width="10" height="5" fill="#0f172a" />

        <!-- Muros exteriores de la cabina (diseño arquitectónico moderno blanco puro) -->
        <rect x="-34" y="-26" width="68" height="60" rx="5" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.8" />
        <!-- Zócalo perimetral de protección inferior en verde Unisucre -->
        <path d="M -34 26 L 34 26 L 34 32 C 34 33.5, 32.5 34, 30 34 L -30 34 C -32.5 34, -34 33.5, -34 32 Z" fill="#14532d" />

        <!-- Ventanal panorámico de seguridad con esquinas pulidas y perfiles de aluminio negro grafito -->
        <rect x="-28" y="-6" width="56" height="30" rx="3" fill="#0f172a" />
        <rect x="-27" y="-5" width="54" height="28" rx="2" fill="#0284c7" fill-opacity="0.2" stroke="#334155" stroke-width="1.4" />
        
        <!-- Interior de la cabina: monitor de telemetría y consola de control del vigilante -->
        <rect x="-24" y="11" width="12" height="9" rx="1.5" fill="#1e293b" stroke="#475569" stroke-width="0.8" />
        <rect x="-23" y="12" width="10" height="7" rx="1" fill="#0369a1" />
        <!-- Pantalla con datos del sistema (punto verde de estado en línea) -->
        <circle cx="-18" cy="15.5" r="1" fill="#22c55e" />

        <!-- Silueta del vigilante en su puesto de control -->
        <circle cx="5" cy="5" r="4.8" fill="#1e293b" />
        <!-- Gorra institucional de vigilancia verde -->
        <path d="M 1 3 Q 5 0 9 3 L 11 5 L 1 5 Z" fill="#15803d" />
        <!-- Hombros y uniforme con charretera -->
        <path d="M -3 21 C -3 13, 13 13, 13 21 Z" fill="#334155" />
        <rect x="3" y="13" width="4" height="5" fill="#f8fafc" />

        <!-- Montantes verticales de perfilería de aluminio estructural -->
        <line x1="-9" y1="-5" x2="-9" y2="23" stroke="#334155" stroke-width="1.4" />
        <line x1="16" y1="-5" x2="16" y2="23" stroke="#334155" stroke-width="1.4" />

        <!-- Reflejo diagonal de cristal limpio en ventanal -->
        <polygon points="-25,18 -15,18 -5,-4 -15,-4" fill="#ffffff" opacity="0.22" />
        <polygon points="-3,18 7,18 17,-4 7,-4" fill="#ffffff" opacity="0.15" />

        <!-- Mostrador exterior de atención en acero inoxidable con bandeja pasadocumentos -->
        <rect x="-24" y="21" width="48" height="4.5" rx="1" fill="#94a3b8" stroke="#64748b" stroke-width="0.8" />
        <rect x="-4" y="22" width="12" height="2" rx="0.5" fill="#475569" />

        <!-- Intercomunicador / citófono digital de comunicación exterior -->
        <rect x="18" y="14" width="6" height="8" rx="1" fill="#0f172a" stroke="#0284c7" stroke-width="0.7" />
        <circle cx="21" cy="17" r="1" fill="#38bdf8" />
        <line x1="19.5" y1="19.5" x2="22.5" y2="19.5" stroke="#64748b" stroke-width="0.6" />

        <!-- Cámara de seguridad CCTV tipo bullet orientada a la vía de acceso -->
        <g transform="translate(-31, 2)">
          <!-- Brazo de montaje articulado -->
          <line x1="0" y1="0" x2="-3" y2="4" stroke="#475569" stroke-width="1.5" />
          <!-- Cuerpo de la cámara -->
          <rect x="-9" y="3" width="8" height="4.5" rx="1.2" fill="#1e293b" stroke="#64748b" stroke-width="0.6" />
          <!-- Lente con LED de grabación activo -->
          <circle cx="-9" cy="5.25" r="1.5" fill="#0f172a" />
          <circle cx="-9" cy="5.25" r="0.7" fill="#ef4444" />
        </g>

        <!-- Cubierta / Alero voladizo moderno (Canopy institucional de la Universidad de Sucre) -->
        <rect x="-38" y="-30" width="76" height="15" rx="3" fill="#14532d" stroke="#0f172a" stroke-width="0.8" />
        <rect x="-37" y="-29" width="74" height="13" rx="2" fill="#15803d" />
        <!-- Moldura biselada frontal blanca -->
        <line x1="-37" y1="-17" x2="37" y2="-17" stroke="#ffffff" stroke-width="1.2" />

        <!-- Rótulo institucional contenido y centrado perfectamente sin salirse -->
        <text
          x="0"
          y="-21"
          fill="#ffffff"
          font-size="4.2"
          font-weight="800"
          font-family="'Plus Jakarta Sans', system-ui, sans-serif"
          text-anchor="middle"
          letter-spacing="0.3"
        >
          CONTROL DE ACCESO
        </text>

        <!-- Foco / Luminaria LED de cortesía en el alero -->
        <circle cx="28" cy="-17" r="1.8" fill="#fef08a" stroke="#ca8a04" stroke-width="0.6" />
      </g>

      <!-- SEÑAL REGLAMENTARIA DE TRÁNSITO DE COLOMBIA: PARE (R-01) -->
      <!-- SEÑAL REGLAMENTARIA DE TRÁNSITO DE COLOMBIA: PARE (R-01) EN LA ACERA / ANDÉN -->
      <!-- Ubicada en la acera de la portería (fuera del asfalto de la vía) -->
      <g id="senal-pare-colombia" transform="translate(195, 180)">
        <!-- Poste metálico sobre la acera -->
        <line x1="0" y1="0" x2="0" y2="18" stroke="#475569" stroke-width="2.5" />
        <circle cx="0" cy="18" r="2.5" fill="#1e293b" />
        
        <!-- Octágono reglamentario PARE -->
        <polygon
          points="-13,-5.5 -5.5,-13 5.5,-13 13,-5.5 13,5.5 5.5,13 -5.5,13 -13,5.5"
          fill="#dc2626"
          stroke="#ffffff"
          stroke-width="1.5"
        />
        <polygon
          points="-11,-4.5 -4.5,-11 4.5,-11 11,-4.5 11,4.5 4.5,11 -4.5,11 -11,4.5"
          fill="#dc2626"
          stroke="#ffffff"
          stroke-width="0.8"
        />
        <text x="0" y="3.5" fill="#ffffff" font-size="7" font-weight="900" font-family="sans-serif" text-anchor="middle">
          PARE
        </text>
      </g>

      <!-- SEÑAL REGLAMENTARIA DE VELOCIDAD 10 km/h (SR-30) EN LA ACERA / ANDÉN EXTERIOR -->
      <g id="senal-velocidad-colombia" transform="translate(135, 172)">
        <line x1="0" y1="0" x2="0" y2="18" stroke="#475569" stroke-width="2" />
        <circle cx="0" cy="-4" r="11" fill="#ffffff" stroke="#dc2626" stroke-width="2.2" />
        <text x="0" y="-1" fill="#0f172a" font-size="8" font-weight="900" text-anchor="middle">10</text>
        <text x="0" y="4.5" fill="#475569" font-size="4" font-weight="bold" text-anchor="middle">km/h</text>
      </g>

      <!-- ESPIRAS MAGNÉTICAS DE DETECCIÓN VEHICULAR INDEPENDIENTES (DOBLE CARRIL) -->
      <!-- Sensor Inductivo Carril Norte -->
      <rect
        x="175"
        y="228"
        width="48"
        height="38"
        rx="3"
        fill="rgba(56, 189, 248, 0.15)"
        stroke="#38bdf8"
        stroke-width="1.8"
        stroke-dasharray="5 3"
      />
      <text x="199" y="250" fill="#0284c7" font-size="6.5" text-anchor="middle" font-weight="bold">
        SENSOR N
      </text>

      <!-- Sensor Inductivo Carril Sur -->
      <rect
        x="175"
        y="294"
        width="48"
        height="38"
        rx="3"
        fill="rgba(56, 189, 248, 0.15)"
        stroke="#38bdf8"
        stroke-width="1.8"
        stroke-dasharray="5 3"
      />
      <text x="199" y="316" fill="#0284c7" font-size="6.5" text-anchor="middle" font-weight="bold">
        SENSOR S
      </text>

      <!-- TALANQUERA VEHICULAR INSTITUCIONAL DE UNISUCRE -->
      <g id="talanquera-unisucre" transform="translate(235, 210)">
        <rect x="-13" y="-26" width="26" height="34" rx="4" fill="#ea580c" stroke="#c2410c" stroke-width="1.5" />
        <rect x="-7" y="-20" width="14" height="10" rx="2" fill="#0f172a" />
        
        <!-- Semáforo LED de acceso -->
        <circle
          cx="0"
          cy="-15"
          r="3.5"
          :fill="talanqueraBloqueada || barrierState === 'cerrada' || barrierState === 'bloqueada' ? '#ef4444' : '#22c55e'"
        />

        <!-- Brazo móvil de la talanquera (Pivota en x=0, y=0) -->
        <g :transform="`rotate(${barrierAngle}, 0, 0)`" class="transition-transform duration-500 ease-out">
          <rect x="-4" y="0" width="8" height="135" rx="3" fill="#ffffff" stroke="#b91c1c" stroke-width="1" />
          <rect x="-4" y="15" width="8" height="18" fill="#dc2626" />
          <rect x="-4" y="45" width="8" height="18" fill="#dc2626" />
          <rect x="-4" y="75" width="8" height="18" fill="#dc2626" />
          <rect x="-4" y="105" width="8" height="18" fill="#dc2626" />
          <circle cx="0" cy="132" r="3.5" fill="#eab308" />

          <!-- Cartel físico en talanquera cuando está bloqueada -->
          <g v-if="talanqueraBloqueada" transform="translate(0, 68)">
            <rect x="-40" y="-10" width="80" height="20" rx="3" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" />
            <text x="0" y="4" fill="#ffffff" font-size="8" font-weight="bold" text-anchor="middle">
              PASO BLOQUEADO
            </text>
          </g>
        </g>

        <!-- Eje pivotante -->
        <circle cx="0" cy="0" r="6" fill="#334155" stroke="#f8fafc" stroke-width="1.5" />
      </g>
      <rect x="229" y="342" width="12" height="14" rx="2" fill="#ea580c" />

      <!-- 4. PATIO DE PARQUEADERO DEL CAMPUS (x = 240 a 990) -->
      <rect x="240" y="42" width="750" height="476" rx="4" fill="#334155" />

      <!-- Línea continua blanca de carril según norma de tránsito colombiana -->
      <line
        x1="260"
        y1="280"
        x2="950"
        y2="280"
        stroke="#ffffff"
        stroke-width="3"
        opacity="0.9"
      />

      <!-- PENDÓN INSTITUCIONAL DE SALIDA SUSPENDIDO (Ahorra espacio de suelo / vía) -->
      <g id="senal-salida-colombia" transform="translate(955, 340)">
        <!-- Brazo y asta metálica horizontal fijada en voladizo -->
        <line x1="-20" y1="-42" x2="20" y2="-42" stroke="#475569" stroke-width="2.2" stroke-linecap="round" />
        <circle cx="-19" cy="-42" r="2.2" fill="#1e293b" />
        <circle cx="19" cy="-42" r="2.2" fill="#1e293b" />

        <!-- Cordinos / tensores de suspensión de acero -->
        <line x1="-15" y1="-42" x2="-15" y2="-34" stroke="#64748b" stroke-width="1.2" />
        <line x1="15" y1="-42" x2="15" y2="-34" stroke="#64748b" stroke-width="1.2" />

        <!-- Sombra del pendón suspendido en el aire -->
        <rect x="-19" y="-34" width="38" height="54" rx="2" fill="rgba(15, 23, 42, 0.2)" filter="blur(2px)" />

        <!-- Cuerpo del Pendón de vinilo/tela institucional azul vial (ahorra todo el espacio del suelo) -->
        <rect x="-18" y="-34" width="36" height="50" rx="3" fill="#1d4ed8" stroke="#ffffff" stroke-width="1.5" />
        
        <!-- Franja institucional superior blanca -->
        <rect x="-18" y="-34" width="36" height="4" rx="1" fill="#ffffff" />

        <!-- Remate inferior estilizado en corte triangular de pendón -->
        <polygon points="-18,16 18,16 0,24" fill="#1d4ed8" stroke="#ffffff" stroke-width="1.5" />

        <!-- Rótulo en el pendón con flecha blanca -->
        <text x="0" y="-18" fill="#ffffff" font-size="7.5" font-weight="900" font-family="'Plus Jakarta Sans', system-ui, sans-serif" text-anchor="middle" letter-spacing="0.8">
          SALIDA
        </text>

        <!-- Flecha indicadora vial blanca -->
        <path d="M -7 -4 L 7 -4 M 2 -8 L 7 -4 L 2 0" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Logo / leyenda institucional compacta en pendón -->
        <text x="0" y="11" fill="#93c5fd" font-size="4.5" font-weight="800" font-family="'Plus Jakarta Sans', system-ui, sans-serif" text-anchor="middle" letter-spacing="0.5">
          UNISUCRE
        </text>
      </g>

      <!-- 5. RENDERIZADO DE LAS 10 PLAZAS DE MOTOS (E01 a E10) -->
      <g v-for="espacio in espacios" :key="espacio.id" class="cursor-pointer" @click="emit('selectEspacio', espacio.id)">
        <g :transform="`translate(${(espacio.posicion.x / 100) * 1000}, ${(espacio.posicion.y / 100) * 560})`">
          
          <!-- Piso de la bahía con demarcación vial amarilla -->
          <rect
            x="-48"
            y="-68"
            width="96"
            height="136"
            rx="4"
            :fill="espacio.estado === 'OCUPADO' ? 'rgba(239, 68, 68, 0.28)' : espacio.estado === 'LIBRE' ? 'rgba(34, 197, 94, 0.24)' : 'rgba(245, 158, 11, 0.22)'"
            stroke="#facc15"
            stroke-width="2.5"
          />

          <!-- Rayado de seguridad -->
          <rect
            x="-42"
            :y="espacio.posicion.y < 50 ? -62 : 40"
            width="84"
            height="22"
            fill="url(#bay-hatch-unisucre)"
          />

          <!-- Identificador de la plaza (E01...E10) -->
          <text
            x="0"
            :y="espacio.posicion.y < 50 ? -38 : 34"
            fill="#ffffff"
            font-size="16"
            font-weight="bold"
            text-anchor="middle"
          >
            {{ espacio.id }}
          </text>

          <!-- Baliza LED de ocupación -->
          <circle
            cx="0"
            :cy="espacio.posicion.y < 50 ? 74 : -74"
            r="6"
            :fill="espacio.estado === 'LIBRE' ? '#22c55e' : espacio.estado === 'OCUPADO' ? '#ef4444' : '#f59e0b'"
            stroke="#ffffff"
            stroke-width="1.2"
          />

          <!-- Moto estacionada si la bahía está ocupada -->
          <g
            v-if="espacio.estado === 'OCUPADO' && !animEspacioIds.has(espacio.id)"
            :transform="`rotate(${espacio.posicion.rotacion})`"
            filter="url(#shadow-unisucre)"
          >
            <ellipse cx="0" cy="2" rx="24" ry="8" fill="rgba(15,23,42,0.6)" />
            <rect x="-22" y="-3.5" width="10" height="7" rx="2" fill="#0f172a" />
            <rect x="13" y="-3.5" width="10" height="7" rx="2" fill="#0f172a" />
            <path d="M -14 -4.5 Q -3 -5.5 3 -4.5 Q 6 -3.5 6 0 Q 6 3.5 3 4.5 Q -3 5.5 -14 4.5 Z" fill="#1e293b" />
            <path d="M -2 -5 C 5 -6 11 -5 13 -2 C 14 0 14 0 13 2 C 11 5 5 6 -2 5 C -5 4 -5 -4 -2 -5 Z" fill="#15803d" stroke="#ffffff" stroke-width="0.8" />
            <path d="M 11 -10 L 13 -5 L 13 5 L 11 10" stroke="#f8fafc" stroke-width="2" stroke-linecap="round" />
            <circle cx="10" cy="-10" r="2" fill="#38bdf8" />
            <circle cx="10" cy="10" r="2" fill="#38bdf8" />
            <circle cx="2" cy="0" r="4.5" fill="#0f172a" stroke="#ffffff" stroke-width="1" />
            <rect x="-28" y="-4" width="7" height="8" rx="1" fill="#facc15" stroke="#713f12" stroke-width="0.5" />
            <text x="-24.5" y="2.5" fill="#000000" font-size="3.2" font-weight="bold" text-anchor="middle" font-family="monospace">
              US
            </text>
          </g>

          <!-- Stencil LIBRE si el puesto está disponible -->
          <g v-if="espacio.estado === 'LIBRE' && !animEspacioIds.has(espacio.id)" opacity="0.85">
            <circle cx="0" cy="0" r="13" fill="none" stroke="#22c55e" stroke-width="1.8" />
            <text x="0" y="4" fill="#22c55e" font-size="9" font-weight="bold" text-anchor="middle">
              LIBRE
            </text>
          </g>
        </g>
      </g>

      <!-- 6. ANIMACIONES REALISTAS DE MOTOS SIMULTÁNEAS Y EN ESPERA -->
      <g
        v-for="anim in listaAnimaciones"
        :key="anim.id"
        :transform="`translate(${(anim.posicionActual.x / 100) * 1000}, ${(anim.posicionActual.y / 100) * 560}) rotate(${anim.posicionActual.rotacion})`"
        filter="url(#shadow-unisucre)"
      >
        <!-- Luz del faro alumbrando el asfalto -->
        <path d="M 26 0 L 100 -34 L 100 34 Z" fill="url(#headlight-unisucre)" opacity="0.85" />

        <!-- Sombra -->
        <ellipse cx="0" cy="2" rx="25" ry="8" fill="rgba(15,23,42,0.6)" />

        <!-- Ruedas -->
        <rect x="-24" y="-3.5" width="12" height="7" rx="2" fill="#0f172a" stroke="#475569" stroke-width="0.8" />
        <rect x="15" y="-3.5" width="12" height="7" rx="2" fill="#0f172a" stroke="#475569" stroke-width="0.8" />

        <!-- Chasis y asiento -->
        <path d="M -15 -4.5 Q -3 -5.5 3 -4.5 Q 6 -3.5 6 0 Q 6 3.5 3 4.5 Q -3 5.5 -15 4.5 Z" fill="#0f172a" />

        <!-- Carrocería deportiva (verde institucional si viene del norte, azul si viene del sur, gris si sale) -->
        <path
          d="M -2 -5.5 C 5 -6.5 12 -5 14 -2 C 15 0 15 0 14 2 C 12 5 5 6.5 -2 5.5 C -5 4 -5 -4 -2 -5.5 Z"
          :fill="anim.tipo === 'salida' ? '#475569' : anim.origen === 'sur' ? '#0369a1' : '#15803d'"
          stroke="#ffffff"
          stroke-width="1.2"
        />

        <!-- Manillar -->
        <path d="M 12 -12 L 14 -5 L 14 5 L 12 12" stroke="#f8fafc" stroke-width="2" stroke-linecap="round" />
        <circle cx="11" cy="-12" r="2.2" fill="#38bdf8" />
        <circle cx="11" cy="12" r="2.2" fill="#38bdf8" />

        <!-- Casco -->
        <circle cx="2" cy="0" r="5" fill="#0f172a" stroke="#ffffff" stroke-width="1.2" />
        <path d="M 4 -3.5 Q 7 0 4 3.5" stroke="#38bdf8" stroke-width="1.5" fill="none" />

        <!-- Faro encendido -->
        <ellipse cx="20" cy="0" rx="2" ry="3.5" fill="#fef08a" />

        <!-- Rótulo sobre la moto -->
        <g transform="translate(0, -32) rotate(0)">
          <!-- Caso 1: Moto esperando en portería a que se desocupe un puesto -->
          <g v-if="anim.etapa === 'esperando'">
            <rect x="-48" y="-11" width="96" height="22" rx="4" fill="#78350f" stroke="#f59e0b" stroke-width="1.6" />
            <circle cx="-38" cy="0" r="3.5" fill="#f59e0b" class="animate-pulse" />
            <text x="4" y="3.5" fill="#fef3c7" font-size="8" font-weight="900" text-anchor="middle">
              ESPERANDO CUPO
            </text>
          </g>
          <!-- Caso 2: Moto en tránsito normal -->
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

    </svg>

  </div>
</template>
