<script setup lang="ts">
import { computed } from "vue";
import type { AnimacionMoto, Bahia, EstadoTalanquera } from "../../types/hmi";
import MotoFigura from "./MotoFigura.vue";
import AutoFigura from "./AutoFigura.vue";
import {
  ALTO_PLANO,
  ANCHO_PLANO,
  CABEZAL_ZONA_ANCHO,
  CABEZAL_ZONA_X,
  ESTAMENTOS,
  FILA_Y,
  esBahiaMoto,
} from "../../config/bahias";
import { movimientoReducidoActivo } from "../../shared/accesibilidad";
import { tema } from "../../shared/theme";

type EstamentoKey = "estudiantes" | "docentes" | "administrativos";

const props = defineProps<{
  bahias: Bahia[];
  animaciones?: AnimacionMoto[];
  talanquera: EstadoTalanquera;
  bloqueada: boolean;
}>();

defineEmits<{ (e: "select-espacio", id: string): void }>();

type EstadoVisualBahia = "LIBRE" | "EN_CAMINO" | "OCUPADO" | "SIN_DATO";

const bahiasEnCamino = computed(() => {
  const asignadas = new Set<string>();
  for (const a of props.animaciones ?? []) {
    if (a.tipo === "ingreso" && a.espacioId && a.espacioId !== "EN_ESPERA") {
      asignadas.add(a.espacioId);
    }
  }
  return asignadas;
});

const animacionesVisibles = computed(() =>
  (props.animaciones ?? []).filter((a) => !a.oculto),
);

function estadoVisual(bahia: Bahia): EstadoVisualBahia {
  if (bahia.estado === "OCUPADO") return "OCUPADO";
  if (bahia.estado === "SIN_DATO") return "SIN_DATO";
  if (bahiasEnCamino.value.has(bahia.id)) return "EN_CAMINO";
  return "LIBRE";
}

function descripcionEstado(bahia: Bahia): string {
  const est = estadoVisual(bahia);
  if (est === "LIBRE") return "disponible";
  if (est === "EN_CAMINO") return "asignada a vehículo en camino";
  if (est === "OCUPADO") return "ocupada";
  return "sin dato";
}

const barrierAngle = computed(() => {
  if (props.bloqueada || props.talanquera === "bloqueada" || props.talanquera === "cerrada") return 0;
  if (props.talanquera === "abierta") return -85;
  if (props.talanquera === "abriendo") return -50;
  if (props.talanquera === "cerrando") return -25;
  return 0;
});

// Carrocerías en tonos metálicos claros de alto contraste sobre la celda ocupada (ISA-101)
const MOTO_MODELOS: ("scooter" | "clasica" | "enduro" | "deportiva")[] = ["clasica", "deportiva", "scooter", "enduro"];
const AUTO_TIPOS: ("sedan" | "suv" | "compacto")[] = ["sedan", "suv", "compacto"];
const VEHICULO_COLORES = ["#f8fafc", "#e2e8f0", "#cbd5e1", "#94a3b8"];

function getMotoModelo(id: string) {
  const n = parseInt(id.replace(/\D/g, ""), 10) || 1;
  return MOTO_MODELOS[(n - 1) % MOTO_MODELOS.length];
}
function getAutoTipo(id: string) {
  const n = parseInt(id.replace(/\D/g, ""), 10) || 1;
  return AUTO_TIPOS[(n - 1) % AUTO_TIPOS.length];
}
function getVehiculoColor(id: string) {
  const n = parseInt(id.replace(/\D/g, ""), 10) || 1;
  return VEHICULO_COLORES[(n - 1) % VEHICULO_COLORES.length];
}

function esAnimacionAuto(anim: AnimacionMoto): boolean {
  if (!anim.espacioId || anim.espacioId === "EN_ESPERA") return false;
  return !esBahiaMoto(anim.espacioId);
}

function etiquetaVehiculoVial(anim: AnimacionMoto): string {
  if (anim.etapa === "esperando") return "ESPERA EN PORTERÍA";
  if (anim.tipo === "ingreso") {
    return anim.espacioId && anim.espacioId !== "EN_ESPERA"
      ? `ENTRANDO → ${anim.espacioId}`
      : "ENTRANDO PORTERÍA";
  }
  return `← SALIENDO ${anim.espacioId}`;
}

function bordeEtiquetaVial(anim: AnimacionMoto): string {
  if (anim.etapa === "esperando") return "#fde047";
  if (anim.tipo === "ingreso") return "#facc15";
  return "#cbd5e1";
}

function posEtiquetaVial(anim: AnimacionMoto) {
  const rawX = (anim.posicionActual.x / 100) * ANCHO_PLANO;
  const rawY = (anim.posicionActual.y / 100) * ALTO_PLANO;
  const texto = etiquetaVehiculoVial(anim);
  const ancho = texto.length * 7.1 + 18;
  const mitad = ancho / 2;
  const x = Math.max(mitad + 8, Math.min(ANCHO_PLANO - mitad - 8, rawX));
  const y = rawY < 56 ? rawY + 28 : Math.min(ALTO_PLANO - 18, rawY - 27);
  return { x, y, ancho };
}

const zonasMapa = computed(() =>
  ESTAMENTOS.map((est, idx) => {
    const plazas = props.bahias.filter((b) => b.estamento === est.key);
    const plazasLibres = plazas.filter(
      (b) => b.estado === "LIBRE" && !bahiasEnCamino.value.has(b.id),
    );
    const libres = plazasLibres.length;
    const sinSenal = plazas.length > 0 && plazas.every((b) => b.estado === "SIN_DATO");
    const tieneCupo = !props.bloqueada && libres > 0;
    const agotada = !sinSenal && (props.bloqueada || libres === 0);
    return {
      ...est,
      y: FILA_Y[idx] - 48,
      libres,
      sinSenal,
      tieneCupo,
      agotada,
    };
  }),
);

const zonasConCupo = computed(() => zonasMapa.value.filter((z) => z.tieneCupo));
const hayCupoGlobal = computed(() => zonasConCupo.value.length > 0);
const hayZonasAgotadas = computed(() => zonasMapa.value.some((z) => z.agotada));

function estadoZonaDe(estamento: EstamentoKey | undefined) {
  if (!estamento) return undefined;
  return zonasMapa.value.find((z) => z.key === estamento);
}

function esZonaAtenuada(estamento: EstamentoKey | undefined): boolean {
  if (!estamento || !hayCupoGlobal.value) return false;
  const zona = estadoZonaDe(estamento);
  return Boolean(zona?.agotada);
}

function esZonaDestacada(estamento: EstamentoKey | undefined): boolean {
  if (!estamento) return false;
  const zona = estadoZonaDe(estamento);
  if (!zona || !zona.tieneCupo) return false;
  return hayZonasAgotadas.value;
}
</script>

<template>
  <div
    class="relative w-full rounded-2xl border overflow-hidden select-none transition-colors duration-200 aspect-[1200/580]"
    :class="tema === 'oscuro'
      ? 'bg-[#0b1120] border-slate-800 shadow-md'
      : 'bg-[#e2e8f0] border-slate-300 shadow-sm'"
  >
    <svg
      :viewBox="`0 0 ${ANCHO_PLANO} ${ALTO_PLANO}`"
      class="w-full h-full block"
      :class="{ 'brisa-activa': !movimientoReducidoActivo }"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="headlight-unisucre" cx="15%" cy="50%" r="85%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="0.92" />
          <stop offset="50%" stop-color="#fef08a" stop-opacity="0.28" />
          <stop offset="100%" stop-color="#fef08a" stop-opacity="0" />
        </radialGradient>
        <filter id="shadow-unisucre" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.42" />
        </filter>

        <!-- Trama diagonal neutra para celdas sin señal de sensor -->
        <pattern id="patron-sin-dato" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="#1e293b" />
          <line x1="0" y1="0" x2="0" y2="10" stroke="#334155" stroke-width="4" />
        </pattern>

        <!-- Paisajismo natural de la Sabana de Sucre: praderas con textura de hierba, rocas calizas y sombras proyectadas NO->SE -->
        <linearGradient id="prado-norte-grad" x1="0%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stop-color="#62a338" />
          <stop offset="52%" stop-color="#4b8429" />
          <stop offset="100%" stop-color="#36641d" />
        </linearGradient>

        <linearGradient id="prado-sur-grad" x1="0%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stop-color="#65a63b" />
          <stop offset="50%" stop-color="#4c852a" />
          <stop offset="100%" stop-color="#36641d" />
        </linearGradient>

        <linearGradient id="prado-isla-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#5a9633" />
          <stop offset="100%" stop-color="#3d6e21" />
        </linearGradient>

        <linearGradient id="cubierta-caseta-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="60%" stop-color="#e2e8f0" />
          <stop offset="100%" stop-color="#cbd5e1" />
        </linearGradient>

        <!-- Textura base de hierba densa sabanera (48x48 px) con múltiples capas de filamentos curvados -->
        <pattern id="textura-hierba-sabana" width="48" height="48" patternUnits="userSpaceOnUse">
          <ellipse cx="11" cy="13" rx="11" ry="6" fill="#6fb63e" opacity="0.25" />
          <ellipse cx="36" cy="34" rx="12" ry="6.5" fill="#1f4911" opacity="0.24" />
          <ellipse cx="37" cy="11" rx="9" ry="5" fill="#84cc16" opacity="0.18" />
          <ellipse cx="14" cy="37" rx="10" ry="5.5" fill="#2b5d19" opacity="0.2" />
          <!-- Filamentos profundos de sombra radicular -->
          <g fill="none" stroke="#16370b" stroke-width="1.05" stroke-linecap="round" opacity="0.62">
            <path d="M 3,10 Q 1.5,5.5 -0.5,2.5 M 5.5,10.5 Q 6.2,5.2 8.2,2.4 M 8,10.2 Q 10.5,6.2 13.2,4.2 M 10.5,10.8 Q 12.2,7.2 14.8,5.8" />
            <path d="M 18,7.8 Q 16.5,3.4 14.6,1.2 M 20.5,8.2 Q 21.8,3.6 23.8,1.2 M 23,8 Q 25.6,4.5 28.4,2.8 M 25.5,8.6 Q 27.8,5.6 30.2,4.4" />
            <path d="M 33,16.5 Q 31.2,11.8 29.2,9.4 M 35.6,17 Q 36.8,12 39,9.5 M 38.2,16.8 Q 41,13 43.8,11.2 M 41,17.4 Q 43.4,14.2 46,12.8" />
            <path d="M 6,25.5 Q 4.4,20.8 2.4,18.4 M 8.8,26 Q 9.8,21 12,18.6 M 11.4,25.8 Q 14.2,22 17,20.2 M 14,26.2 Q 16.2,23 18.6,21.6" />
            <path d="M 22,29.5 Q 20.4,24.8 18.6,22.2 M 24.8,30 Q 26,25 28.2,22.4 M 27.6,29.6 Q 30.4,25.8 33.2,24 M 30.2,30.2 Q 32.6,27 35,25.6" />
            <path d="M 37,33.5 Q 35.5,29 33.8,26.8 M 39.6,34 Q 41,29.2 43.2,26.8 M 42.2,33.8 Q 44.8,30.4 47.2,28.8" />
            <path d="M 4,43.5 Q 2.6,38.8 0.8,36.4 M 6.8,44 Q 8,39.2 10.2,36.6 M 9.5,43.8 Q 12.2,40 15,38.2 M 12.2,44.2 Q 14.5,41.2 16.8,39.8" />
            <path d="M 20,45.5 Q 18.8,41 17,38.6 M 22.8,46 Q 24.2,41.2 26.5,38.8 M 25.5,45.8 Q 28.2,42 31,40.2" />
            <path d="M 34,46.2 Q 32.8,41.8 31,39.4 M 36.8,46.5 Q 38.2,41.8 40.5,39.5 M 39.5,46.2 Q 42.2,42.6 45,40.8" />
          </g>
          <!-- Filamentos intermedios verde esmeralda sabanero -->
          <g fill="none" stroke="#5ba130" stroke-width="0.9" stroke-linecap="round" opacity="0.8">
            <path d="M 4.2,10.2 Q 3.2,5.6 1.8,3 M 6.8,10.4 Q 8.2,5.8 10.5,3.2 M 9.4,10.4 Q 12,6.8 14.5,5.2" />
            <path d="M 19.2,8 Q 18.4,3.6 17.2,1.4 M 21.8,8.2 Q 23.6,4 26,1.8 M 24.4,8.2 Q 27,5 29.6,3.6" />
            <path d="M 34.2,16.8 Q 33.4,12.2 32,9.8 M 36.8,17 Q 38.8,12.4 41.2,10.2 M 39.6,17 Q 42.4,13.6 45,12" />
            <path d="M 7.4,25.8 Q 6.4,21.2 5,18.8 M 10,26 Q 11.8,21.4 14.2,19.2 M 12.8,26 Q 15.6,22.6 18.2,21" />
            <path d="M 23.4,29.8 Q 22.6,25.2 21.2,22.6 M 26.2,30 Q 28,25.4 30.5,23.2 M 29,29.8 Q 31.8,26.4 34.4,24.8" />
            <path d="M 38.2,33.8 Q 37.6,29.4 36.4,27 M 41,34 Q 42.8,29.8 45.2,27.6" />
            <path d="M 5.4,43.8 Q 4.6,39.2 3.2,36.8 M 8.2,44 Q 10,39.5 12.5,37.2 M 10.8,44 Q 13.6,40.6 16.2,39" />
            <path d="M 21.4,45.8 Q 20.8,41.2 19.5,38.8 M 24.2,46 Q 26,41.6 28.5,39.4 M 27,45.8 Q 29.6,42.5 32.2,41" />
            <path d="M 35.4,46.4 Q 34.8,42 33.6,39.6 M 38.2,46.5 Q 40,42.2 42.5,40 M 41,46.2 Q 43.6,43 46.2,41.4" />
          </g>
          <!-- Filamentos finos iluminados por la brisa y el sol del noroeste -->
          <g fill="none" stroke="#bef264" stroke-width="0.72" stroke-linecap="round" opacity="0.76">
            <path d="M 5,9.8 Q 5.2,5.6 6,2.8 M 7.8,10 Q 9.6,6.2 12,4 M 20.2,7.6 Q 20.8,3.6 22,1.4 M 23.2,7.8 Q 25.4,4.4 27.8,2.6" />
            <path d="M 35.2,16.4 Q 36,12 37.4,9.6 M 38.4,16.6 Q 40.8,13.2 43.2,11.4 M 8.4,25.4 Q 9.2,21.2 10.6,18.8 M 11.6,25.6 Q 14,22.2 16.4,20.4" />
            <path d="M 24.4,29.4 Q 25.2,25 26.6,22.6 M 27.8,29.6 Q 30.2,26.2 32.6,24.4 M 39.4,33.4 Q 40.4,29.4 42,27.2" />
            <path d="M 6.4,43.4 Q 7.2,39.2 8.6,36.8 M 9.6,43.6 Q 12,40.2 14.4,38.4 M 22.6,45.4 Q 23.6,41.2 25.2,39 M 36.6,46 Q 37.8,41.8 39.5,39.6" />
          </g>
          <g fill="none" stroke="#ecfccb" stroke-width="0.55" stroke-linecap="round" opacity="0.62">
            <path d="M 6.2,9.6 Q 7,5.8 8.4,3.4 M 21.4,7.4 Q 22.6,3.8 24.4,1.8 M 36.4,16.2 Q 38,12.4 40,10.2 M 9.6,25.2 Q 11,21.4 13,19.4 M 25.8,29.2 Q 27.4,25.6 29.4,23.6 M 7.8,43.2 Q 9.4,39.6 11.4,37.6 M 24,45.2 Q 25.6,41.6 27.6,39.6" />
          </g>
        </pattern>

        <!-- Segunda capa cruzada de filamentos finos (34x34 px, coprima con 48x48 para eliminar cualquier repetición visual) -->
        <pattern id="trama-filamentos-pasto" width="34" height="34" patternUnits="userSpaceOnUse">
          <g fill="none" stroke-linecap="round">
            <path d="M 4,14 C 5.5,10 8.2,7.2 11.5,5.6 M 7,14.5 C 7.2,10.2 6.4,7 4.8,4.6 M 10,14.2 C 12.2,10.8 15,8.6 18.2,7.4" stroke="#245315" stroke-width="0.82" opacity="0.58" />
            <path d="M 5.5,13.8 C 7.2,10 10,7.4 13.2,6 M 8.6,14 C 10.4,10.4 12.8,8 15.6,6.6" stroke="#9be14f" stroke-width="0.68" opacity="0.68" />

            <path d="M 20,9.5 C 21.8,5.8 24.6,3.2 27.8,1.8 M 23,10 C 22.8,5.8 21.8,2.8 20.2,0.8 M 25.8,9.8 C 28,6.5 30.6,4.5 33.4,3.4" stroke="#1b400f" stroke-width="0.82" opacity="0.56" />
            <path d="M 21.5,9.2 C 23.4,5.6 26.2,3.4 29.2,2.2 M 24.5,9.4 C 26.6,6.2 29.2,4.2 31.8,3" stroke="#bef264" stroke-width="0.66" opacity="0.66" />

            <path d="M 11,29 C 12.8,25 15.6,22.2 19,20.8 M 14.2,29.4 C 14,25.2 13,22 11.4,19.8 M 17,29.2 C 19.4,25.8 22.2,23.6 25.4,22.4" stroke="#245315" stroke-width="0.82" opacity="0.58" />
            <path d="M 12.6,28.6 C 14.6,24.8 17.4,22.4 20.6,21 M 15.6,28.8 C 17.8,25.4 20.4,23.4 23.2,22.2" stroke="#a3e635" stroke-width="0.68" opacity="0.68" />

            <path d="M 25,26.5 C 26.8,22.8 29.4,20.2 32.5,18.8 M 28,27 C 27.8,23 26.8,20.2 25.4,18.2 M 2,31 C 3.8,27.2 6.5,24.8 9.6,23.4" stroke="#1b400f" stroke-width="0.78" opacity="0.54" />
            <path d="M 26.5,26.2 C 28.4,22.8 31,20.6 33.6,19.4 M 3.5,30.6 C 5.4,27 8.2,24.8 11,23.6" stroke="#d9f99d" stroke-width="0.62" opacity="0.64" />
          </g>
        </pattern>

        <!-- Macolla densa A: mata frondosa de 18 filamentos asimétricos mecidos por la brisa -->
        <g id="macolla-densa-a">
          <ellipse cx="3.4" cy="3.2" rx="10.2" ry="4" fill="#061504" opacity="0.46" />
          <ellipse cx="0" cy="1.8" rx="7.6" ry="2.8" fill="#1b3e0e" opacity="0.78" />
          <g class="filamentos-brisa-a" fill="none" stroke-linecap="round">
            <path d="M -6.5,2 C -9.2,-2.2 -12.6,-4.4 -15.8,-5.2 M -4.6,2.1 C -6.8,-3.2 -9.4,-6.4 -12.2,-8.2 M -2.4,2.2 C -3.4,-4.2 -4.2,-8 -4.8,-10.8 M 0,2.2 C 0.8,-4.5 2.4,-8.6 4.4,-11.4 M 2.4,2.1 C 4.8,-3.8 7.8,-7.4 11.2,-9.4 M 4.8,1.9 C 8,-2.5 11.6,-5.2 15.2,-6.4 M 6.6,1.6 C 9.8,-1.4 13,-3.2 16.2,-3.8" stroke="#17380c" stroke-width="1.35" />
            <path d="M -5.4,1.9 C -7.6,-2.4 -10.4,-5 -13.4,-6.2 M -3.4,2 C -4.8,-3.6 -6.4,-7.2 -8.2,-9.6 M -1,2.1 C -0.6,-4.2 0.4,-8.2 1.8,-11 M 1.4,2 C 3.4,-4 6,-7.8 9,-10.2 M 3.8,1.8 C 6.6,-3 9.8,-6 13.2,-7.6 M 5.6,1.6 C 8.6,-1.8 11.8,-3.8 14.8,-4.8" stroke="#53982b" stroke-width="1.12" />
            <path d="M -4,1.8 C -5.6,-2.6 -7.6,-5.8 -9.8,-7.8 M -1.8,1.9 C -1.8,-3.8 -1.2,-7.6 -0.2,-10.4 M 0.6,1.9 C 2.2,-3.8 4.4,-7.6 7,-10 M 2.8,1.7 C 5.4,-2.8 8.2,-5.8 11.2,-7.6" stroke="#9be14f" stroke-width="0.92" />
            <path d="M -2.6,1.6 C -3.2,-3.2 -3.4,-6.6 -3.2,-9.2 M 0,1.7 C 1.2,-3.6 2.8,-7 4.8,-9.4 M 2,1.6 C 4.2,-2.6 6.6,-5.2 9.2,-6.8" stroke="#ecfccb" stroke-width="0.68" opacity="0.88" />
          </g>
        </g>

        <!-- Macolla densa B: parche extendido de grama tupida con 20 filamentos entrelazados -->
        <g id="macolla-densa-b">
          <ellipse cx="2.8" cy="2.8" rx="12.5" ry="3.8" fill="#061504" opacity="0.4" />
          <ellipse cx="0" cy="1.6" rx="9.8" ry="2.6" fill="#1e4410" opacity="0.72" />
          <g class="filamentos-brisa-b" fill="none" stroke-linecap="round">
            <path d="M -9,1.8 C -11.4,-1.4 -14,-3.2 -16.8,-4 M -6.8,2 C -8.6,-2.2 -10.6,-4.8 -12.8,-6.2 M -4.4,2.1 C -5.2,-2.6 -5.8,-5.8 -6.2,-8 M -2,2.2 C -1.4,-3 -0.4,-6.2 1,-8.6 M 0.4,2.2 C 1.8,-2.8 3.8,-6 6.2,-8.2 M 3,2.1 C 5,-2.4 7.6,-5.2 10.4,-6.8 M 5.6,2 C 8,-1.8 10.8,-4 13.8,-5.2 M 8.2,1.7 C 10.8,-1.2 13.6,-2.8 16.4,-3.4" stroke="#1a3d0e" stroke-width="1.2" />
            <path d="M -7.8,1.8 C -9.6,-1.8 -11.8,-4 -14.2,-5.2 M -5.4,2 C -6.4,-2.4 -7.4,-5.2 -8.4,-7.2 M -3,2.1 C -2.8,-2.8 -2.2,-5.8 -1.2,-8.2 M -0.6,2.1 C 0.8,-2.8 2.6,-5.8 4.8,-8 M 2,2 C 4,-2.4 6.4,-5 9,-6.8 M 4.6,1.9 C 7,-1.8 9.6,-4 12.4,-5.4 M 7,1.7 C 9.4,-1.4 12,-3 14.6,-3.8" stroke="#62a837" stroke-width="0.98" />
            <path d="M -6,1.7 C -7.2,-1.8 -8.6,-4.2 -10.2,-5.8 M -3.6,1.8 C -3.6,-2.4 -3.2,-5.2 -2.4,-7.4 M -1,1.9 C 0.2,-2.6 1.8,-5.4 3.6,-7.4 M 1.6,1.8 C 3.4,-2.2 5.6,-4.6 8,-6.2 M 4.2,1.7 C 6.4,-1.6 8.8,-3.6 11.2,-4.8" stroke="#bef264" stroke-width="0.78" />
            <path d="M -2.2,1.6 C -1.8,-2.2 -1,-4.8 0.2,-6.6 M 0.8,1.6 C 2.4,-2 4.2,-4.4 6.2,-6 M 3.4,1.5 C 5.4,-1.4 7.4,-3.2 9.6,-4.2" stroke="#f7fee7" stroke-width="0.58" opacity="0.82" />
          </g>
        </g>

        <!-- Macolla espiga en brisa: pasto guinea alto arqueado con panículas sabaneras -->
        <g id="macolla-espiga-brisa">
          <ellipse cx="4" cy="3.4" rx="9.5" ry="3.6" fill="#061504" opacity="0.44" />
          <g class="filamentos-brisa-c" fill="none" stroke-linecap="round">
            <path d="M -4.8,2 C -6.8,-2.6 -9.4,-5.4 -12.4,-6.8 M -2.8,2.2 C -3.2,-3.6 -3,-7.4 -2.2,-10.4 M -0.6,2.2 C 0.8,-4.2 3.2,-8.4 6.4,-11.4 M 1.6,2.1 C 4.2,-3.6 7.8,-7.2 12,-9.4 M 3.8,1.9 C 7.2,-2.6 11.2,-5.2 15.6,-6.4 M 5.4,1.6 C 8.8,-1.4 12.4,-3 16,-3.4" stroke="#183a0d" stroke-width="1.28" />
            <path d="M -3.6,1.9 C -4.8,-2.8 -6.4,-6 -8.4,-8.2 M -1.4,2.1 C -0.4,-4 1.6,-8 4.4,-11 M 0.8,2 C 3.2,-3.8 6.4,-7.6 10.2,-10 M 3,1.8 C 6.2,-2.8 9.8,-5.6 13.8,-7.2" stroke="#65ab3a" stroke-width="1.05" />
            <path d="M -2,1.8 C -1.8,-3.4 -0.8,-7 1,-9.8 M 0.2,1.9 C 2.4,-3.6 5.2,-7.2 8.6,-9.6 M 2.2,1.7 C 5,-2.6 8.2,-5.2 11.8,-6.8" stroke="#a3e635" stroke-width="0.86" />
            <!-- Espigas finas doradas mecidas al extremo de los tallos -->
            <path d="M 4.4,-11 C 5.8,-12.2 7.6,-12.8 9.4,-12.6 M 6.2,-11.8 L 7.8,-13.2 M 7.4,-12.2 L 9.2,-13.1" stroke="#fde68a" stroke-width="0.72" opacity="0.9" />
            <path d="M 10.2,-10 C 11.8,-10.8 13.6,-11.1 15.2,-10.7 M 11.8,-10.5 L 13.4,-11.6" stroke="#fef08a" stroke-width="0.68" opacity="0.86" />
          </g>
        </g>

        <!-- Franja densa de filamentos de borde para suavizar bordillos y pies de roca -->
        <g id="filamentos-borde">
          <g class="filamentos-brisa-b" fill="none" stroke-linecap="round">
            <path d="M -14,1.5 Q -15.5,-2.5 -17.5,-4.2 M -11.5,1.8 Q -12,-2.8 -12.8,-5.2 M -9,1.8 Q -8.2,-2.6 -7,-5 M -6.5,1.8 Q -5,-2.8 -3.2,-5.4 M -4,1.8 Q -3.6,-2.4 -3,-4.8 M -1.5,1.8 Q 0,-2.8 2,-5.2 M 1,1.8 Q 2.8,-2.6 5,-4.8 M 3.5,1.8 Q 3.8,-2.4 4.4,-4.8 M 6,1.8 Q 7.6,-2.6 9.8,-4.8 M 8.5,1.8 Q 10.4,-2.2 12.8,-4.2 M 11,1.6 Q 12.8,-2 15,-3.6 M 13.5,1.5 Q 15.5,-1.6 17.8,-2.8" stroke="#1b400f" stroke-width="1.05" opacity="0.76" />
            <path d="M -12.8,1.6 Q -13.8,-2.2 -15.2,-4.2 M -10.2,1.7 Q -9.8,-2.4 -9,-4.8 M -7.6,1.7 Q -6.2,-2.6 -4.5,-5 M -5,1.7 Q -4,-2.2 -2.8,-4.4 M -2.4,1.7 Q -1,-2.6 0.8,-4.8 M 0.2,1.7 Q 1.8,-2.4 3.8,-4.6 M 2.6,1.7 Q 4,-2.2 5.8,-4.2 M 5,1.7 Q 6.6,-2.4 8.6,-4.4 M 7.6,1.7 Q 9.4,-2 11.4,-3.8 M 10.2,1.6 Q 12,-1.8 14,-3.4 M 12.6,1.5 Q 14.4,-1.4 16.4,-2.6" stroke="#84cc16" stroke-width="0.84" opacity="0.88" />
            <path d="M -8.8,1.6 Q -8,-2.2 -6.8,-4.2 M -3.6,1.6 Q -2.4,-2.2 -0.8,-4.2 M 1.6,1.6 Q 3.2,-2 5,-3.8 M 6.6,1.6 Q 8.2,-2 10,-3.6 M 11.4,1.5 Q 13,-1.4 14.8,-2.6" stroke="#ecfccb" stroke-width="0.6" opacity="0.82" />
          </g>
        </g>

        <!-- ARQUETIPO ROCOSO 1: Laja caliza estratificada alargada con escalones sedimentarios -->
        <g id="roca-laja-estratificada">
          <path d="M -19,2 L -11,-6 L 8,-7 L 20,-1 L 18,7 L 2,10 L -15,8 Z" fill="#061504" opacity="0.54" transform="translate(4.8, 4.8)" />
          <polygon points="-20,1 -13,-6 6,-8 19,-2 16,6 1,9 -15,7" fill="#78716c" stroke="#292524" stroke-width="0.85" stroke-linejoin="round" />
          <!-- Terraza superior iluminada -->
          <polygon points="-20,1 -13,-6 6,-8 11,-3 -2,0 -13,1" fill="#f5f5f4" />
          <!-- Escalón intermedio sedimentario -->
          <polygon points="6,-8 19,-2 14,3 4,2 11,-3" fill="#d6d3d1" />
          <polygon points="-20,1 -13,1 -2,0 1,5 -15,7" fill="#b8b2ad" />
          <!-- Frente sureste en sombra -->
          <polygon points="-2,0 11,-3 4,2 14,3 16,6 1,9 1,5" fill="#57534e" />
          <!-- Estratos minerales horizontales -->
          <polyline points="-13,-6 -2,0 11,-3" fill="none" stroke="#ffffff" stroke-width="0.65" opacity="0.86" />
          <polyline points="-14,3.8 -1,3.2 12,4.4" fill="none" stroke="#292524" stroke-width="0.55" opacity="0.55" />
          <!-- Filamentos de pasto brotando en la junta de la laja -->
          <path d="M -8,7.8 Q -10.5,3.5 -13,1.5 M -5.5,8 Q -5,3.8 -4,1.6 M 9,7.6 Q 11.8,4 14.5,2.4 M 11.2,7.8 Q 13.8,5 16.5,3.8" fill="none" stroke="#a3e635" stroke-width="0.9" stroke-linecap="round" />
        </g>

        <!-- ARQUETIPO ROCOSO 2: Bloque calizo fracturado en dos peñascos con grieta profunda -->
        <g id="roca-bloque-fracturado">
          <path d="M -14,2 L -4,-9 L 13,-5 L 17,5 L 6,11 L -10,9 Z" fill="#061504" opacity="0.55" transform="translate(4.6, 5.2)" />
          <!-- Peñasco noroccidental mayor -->
          <polygon points="-15,2 -11,-7 -1,-10 5,-5 2,4 -7,8 -14,6" fill="#a8a29e" stroke="#292524" stroke-width="0.85" stroke-linejoin="round" />
          <polygon points="-15,2 -11,-7 -1,-10 3,-5 -4,0 -11,2" fill="#fafaf9" />
          <polygon points="-11,2 -4,0 3,-5 2,4 -7,8 -14,6" fill="#57534e" />
          <polyline points="-11,-7 -4,0 3,-5" fill="none" stroke="#ffffff" stroke-width="0.65" opacity="0.85" />
          <!-- Grieta oscura de fractura -->
          <polygon points="3,-4 6,-6 5,5 1.8,4.5" fill="#1c1917" opacity="0.88" />
          <!-- Fragmento oriental desplazado -->
          <polygon points="5,-5 12,-6 16,0 13,7 4,8 3,1" fill="#78716c" stroke="#292524" stroke-width="0.8" stroke-linejoin="round" />
          <polygon points="5,-5 12,-6 14,-1 8,1 3,1" fill="#e7e5e4" />
          <polygon points="3,1 8,1 14,-1 16,0 13,7 4,8" fill="#44403c" />
          <!-- Esquirlas angulares -->
          <polygon points="-18,6 -15,4 -13,7 -16,9" fill="#d6d3d1" stroke="#292524" stroke-width="0.5" />
          <polygon points="15,6 18,5 19,8 16,9" fill="#a8a29e" stroke="#292524" stroke-width="0.5" />
          <path d="M 1,8.5 Q 0.4,3.8 -0.8,1.2 M 2.8,8.6 Q 4.2,4.2 6,2.2" fill="none" stroke="#bef264" stroke-width="0.9" stroke-linecap="round" />
        </g>

        <!-- ARQUETIPO ROCOSO 3: Canto kárstico meteorizado redondeado con musgo húmedo -->
        <g id="roca-canto-meteorizado">
          <ellipse cx="4.5" cy="4.8" rx="13.5" ry="8.8" fill="#061504" opacity="0.52" />
          <path d="M -12,0 C -13,-6 -6,-9 2,-8.5 C 9,-8 13,-3 12,2.5 C 11,7.5 4,9.5 -3,9 C -9,8.5 -11.5,4.5 -12,0 Z" fill="#a8a29e" stroke="#292524" stroke-width="0.8" />
          <!-- Domo suave soleado NO -->
          <path d="M -11,-0.5 C -11.5,-5.5 -5,-8.2 1.5,-7.6 C 6.5,-7 8.5,-3.5 6,-0.5 C 3.5,2 -4,2.8 -8.5,1.5 C -10.2,1 -10.8,0.2 -11,-0.5 Z" fill="#f5f5f4" />
          <!-- Sombra propia SE -->
          <path d="M -6,2.5 C 0,2.5 5.5,0 8.5,-3 C 12,-0.5 12,4.5 8,7.2 C 3.5,9.5 -4,9 -8.5,6.5 C -9,4.5 -8,3 -6,2.5 Z" fill="#57534e" />
          <!-- Cojín de musgo sabanero en la concavidad sombreada -->
          <path d="M 1,3.5 C 4,2.2 7.5,2.8 9,4.8 C 8.5,6.8 5,8 1.5,7.4 C -0.5,6.8 -0.8,4.5 1,3.5 Z" fill="#4d7c0f" opacity="0.9" />
          <circle cx="4.2" cy="5.2" r="1.4" fill="#84cc16" opacity="0.75" />
          <circle cx="6.5" cy="4.6" r="1.0" fill="#a3e635" opacity="0.7" />
          <!-- Guijarros redondeados -->
          <ellipse cx="-13.5" cy="4.8" rx="2.6" ry="1.8" fill="#e7e5e4" stroke="#44403c" stroke-width="0.55" />
          <ellipse cx="13.2" cy="5.8" rx="2.0" ry="1.4" fill="#d6d3d1" stroke="#44403c" stroke-width="0.5" />
        </g>

        <!-- ARQUETIPO ROCOSO 4: Afloramiento triple asimétrico con alturas escalonadas -->
        <g id="roca-afloramiento-triple">
          <ellipse cx="4.5" cy="5" rx="16.5" ry="9.5" fill="#061504" opacity="0.52" />
          <!-- Losa baja oriental -->
          <polygon points="3,-4 14,-5 18,1 15,7 4,7" fill="#d6d3d1" stroke="#292524" stroke-width="0.75" stroke-linejoin="round" />
          <polygon points="4,2 18,1 15,7 4,7" fill="#57534e" />
          <!-- Monolito angular principal NO -->
          <polygon points="-14,-1 -9,-9 2,-8 6,-1 2,6 -9,6" fill="#f5f5f4" stroke="#292524" stroke-width="0.85" stroke-linejoin="round" />
          <polygon points="-3,-1 6,-1 2,6 -9,6" fill="#57534e" />
          <polygon points="-14,-1 -9,-9 2,-8 -1,-2 -8,-1" fill="#ffffff" opacity="0.65" />
          <!-- Cuña frontal suroccidental -->
          <polygon points="-12,5 -4,2 3,5 0,10 -9,10" fill="#e7e5e4" stroke="#292524" stroke-width="0.75" stroke-linejoin="round" />
          <polygon points="-4,6 3,5 0,10 -9,10" fill="#44403c" />
          <!-- Brotes densos entre las juntas de las tres rocas -->
          <path d="M 3,6.5 Q 4.8,2 7,-0.5 M 4.8,7 Q 7.2,3.2 10,1.5 M -10,9.5 Q -12.8,5.8 -15.5,4.2 M -8,9.8 Q -8.8,5.8 -9.5,3.5" fill="none" stroke="#a3e635" stroke-width="0.92" stroke-linecap="round" />
        </g>

        <!-- ARQUETIPO ROCOSO 5: Arista caliza aguda en diagonal (ideal para islas y bordes estrechos) -->
        <g id="roca-arista-aguda">
          <polygon points="-11,2 -4,-4 10,-3 13,2 4,6 -8,6" fill="#061504" opacity="0.5" transform="translate(3.2, 3.4)" />
          <polygon points="-12,1 -5,-5 9,-4 12,1 3,5 -9,5" fill="#78716c" stroke="#292524" stroke-width="0.75" stroke-linejoin="round" />
          <polygon points="-12,1 -5,-5 9,-4 2,0 -7,1" fill="#fafaf9" />
          <polygon points="-7,1 2,0 9,-4 12,1 3,5 -9,5" fill="#57534e" />
          <polyline points="-10,0.6 2,0 8.5,-3.6" fill="none" stroke="#ffffff" stroke-width="0.65" opacity="0.9" />
          <path d="M -5,5.2 Q -7.2,1.5 -9.5,0 M 6,4.8 Q 8.5,1.6 11,0.4" fill="none" stroke="#bef264" stroke-width="0.85" stroke-linecap="round" />
        </g>

        <!-- ARQUETIPO ROCOSO 6: Dispersión natural de gravilla y cantos calizos menudos -->
        <g id="gravilla-caliza">
          <ellipse cx="-7.2" cy="-0.8" rx="3.2" ry="2.1" fill="#061504" opacity="0.42" transform="translate(1.4, 1.5)" />
          <polygon points="-10,-1 -8,-3 -4,-2 -5,1 -9,1" fill="#f5f5f4" stroke="#44403c" stroke-width="0.55" stroke-linejoin="round" />
          <ellipse cx="1.5" cy="2.2" rx="2.5" ry="1.6" fill="#061504" opacity="0.4" transform="translate(1.2, 1.3)" />
          <polygon points="-1,2 1,0.5 4,1.5 3,3.8 0,3.6" fill="#d6d3d1" stroke="#44403c" stroke-width="0.5" stroke-linejoin="round" />
          <ellipse cx="7.8" cy="-1.4" rx="2.1" ry="1.4" fill="#e7e5e4" stroke="#44403c" stroke-width="0.5" />
          <circle cx="-2.8" cy="-3.2" r="1.2" fill="#d6d3d1" stroke="#44403c" stroke-width="0.45" />
          <circle cx="5.2" cy="3.6" r="1.1" fill="#a8a29e" stroke="#44403c" stroke-width="0.4" />
          <circle cx="11.2" cy="1.2" r="0.95" fill="#f5f5f4" />
        </g>

        <!-- Sub-rama pinnada fina para arbustos y borde llorón del árbol de pimiento -->
        <g id="fronda-pimiento-base">
          <path
            d="M 0,0 C 1.8,-2.1 4.6,-3 7,-1.7 C 8.8,-3.8 12,-4 13.8,-1.9 C 16,-3.2 18.8,-2.4 20.4,-0.1 C 18.6,2.1 15.8,2.9 13.5,1.5 C 11.8,3.6 8.6,3.6 6.8,1.5 C 4.5,2.8 1.8,2.1 0,0 Z"
            fill="#215016"
            stroke="#12300a"
            stroke-width="0.42"
            stroke-linejoin="round"
          />
          <path
            d="M 1.1,-0.2 L 4.1,-2.9 L 5.5,-1 L 8.9,-3.4 L 10.3,-1.1 L 13.9,-3 L 15,-0.9 L 18.8,-0.2 L 15,0.8 L 13.7,2.7 L 10.3,1 L 8.7,3.1 L 5.5,1 L 4,2.6 Z"
            fill="#4b8b2d"
          />
          <path d="M 0.8,0 Q 9.5,-0.3 17.8,-0.1" fill="none" stroke="#a3e635" stroke-width="0.52" stroke-linecap="round" opacity="0.86" />
          <path
            d="M 2.3,-0.3 L 4.9,-2.1 L 6.1,-0.7 L 9.3,-2.4 L 10.5,-0.7 L 13.8,-1.9 L 16.4,-0.2 L 13.5,1.3 L 10.5,0.5 L 9,1.7 L 6.1,0.5 L 4.5,1.5 Z"
            fill="#7ec247"
            opacity="0.94"
          />
        </g>

        <!-- Manojo foliar festoneado para construir copas clásicas redondeadas con textura real de hojas compuestas -->
        <g id="masa-foliar-pimiento">
          <path
            d="M -11,-2 C -12,-6 -9,-9.5 -5,-9 C -2,-11.5 3,-11.5 6,-8.8 C 10,-9 12.5,-5.5 11.2,-1.5 C 13,2.5 10.5,6.8 6.5,7.2 C 4,10.2 -1.5,10.5 -4.5,8 C -8.8,8.5 -12,5 -10.8,1 C -12,0 -11.5,-1 -11,-2 Z"
            fill="#2b641c"
            stroke="#15380c"
            stroke-width="0.45"
            stroke-linejoin="round"
          />
          <path
            d="M -9.2,-2.2 C -9.8,-5.5 -6.8,-8.2 -3.5,-7.6 C -0.8,-9.6 3.5,-9.4 5.6,-6.8 C 8.8,-6.8 10.2,-3.6 8.8,-0.5 C 9.8,2.6 7.4,5.4 4.2,5.4 C 1.8,7.6 -2.5,7.6 -4.8,5.5 C -8,5.6 -9.8,2.8 -8.6,0 Z"
            fill="#488c2c"
          />
          <!-- Ramilletes de hojuelas lanceoladas finas iluminadas al noroeste -->
          <path
            d="M -8,-2.8 L -5.8,-6.2 L -4,-4.4 L -1.8,-7.6 L 0.2,-5 L 3.2,-7.2 L 3.8,-4.2 L 6.8,-4.8 L 5.2,-1.8 L 7.2,0.5 L 3.8,1.2 L 2.8,3.8 L -0.4,2.2 L -2.8,4.4 L -4.4,1.8 L -7.6,2.2 L -6.2,-0.8 Z"
            fill="#6cb33f"
          />
          <path
            d="M -6.8,-3.4 L -4.8,-5.8 L -3.2,-4.2 L -1.2,-6.6 L 0.4,-4.5 L 2.8,-5.8 L 2.4,-3.2 L -0.6,-2.2 L -2.8,-0.8 L -5.4,-1.2 Z"
            fill="#9be14f"
          />
        </g>

        <!-- Fleco llorón de folíolos péndulos en el contorno exterior de la copa -->
        <g id="fleco-lloron-pimiento">
          <path
            d="M 0,-3.8 L 3.6,-2.8 L 1.8,-1.3 L 5.8,-0.6 L 2.4,0.4 L 5.2,1.8 L 1.6,2.2 L 3.4,3.5 L -0.2,3.8 Z"
            fill="#235417"
            stroke="#12300a"
            stroke-width="0.35"
            stroke-linejoin="round"
          />
          <path d="M 0.4,-2.4 L 3,-1.8 L 1.4,-0.6 L 4.5,-0.3 L 1.8,0.6 L 3.8,1.5 L 0.4,2.1 Z" fill="#5aa034" />
        </g>

        <!-- ÁRBOL DE PIMIENTO CLÁSICO A (Schinus molle adulto): copa amplia, redondeada y frondosa con textura pinnada y pimienta rosa -->
        <g id="arbol-pimiento-a">
          <!-- Sombra amplia festoneada proyectada al sureste -->
          <path
            d="M -20,-3 C -21,-11.5 -13.5,-19 -4.5,-19 C 3,-21.5 12.5,-19 17.5,-12.5 C 22,-6.5 22,3 18,9.5 C 15,17 6.5,20.5 -2,19.8 C -10.5,20.8 -18,15 -19.8,7.5 C -21.8,3.5 -21,-0.5 -20,-3 Z"
            fill="#051304"
            opacity="0.5"
            transform="translate(8.5, 9.5)"
          />

          <!-- Falda llorona perimetral de hojuelas péndulas alrededor de toda la copa redondeada -->
          <g>
            <use href="#fleco-lloron-pimiento" transform="translate(18.5, -4.5) rotate(-14)" />
            <use href="#fleco-lloron-pimiento" transform="translate(17, 5.5) rotate(20)" />
            <use href="#fleco-lloron-pimiento" transform="translate(11, 14.5) rotate(54)" />
            <use href="#fleco-lloron-pimiento" transform="translate(1, 18.2) rotate(88)" />
            <use href="#fleco-lloron-pimiento" transform="translate(-10, 15.8) rotate(124)" />
            <use href="#fleco-lloron-pimiento" transform="translate(-17.8, 7.5) rotate(158)" />
            <use href="#fleco-lloron-pimiento" transform="translate(-18.8, -3.5) rotate(-168)" />
            <use href="#fleco-lloron-pimiento" transform="translate(-13.5, -13.5) rotate(-132)" />
            <use href="#fleco-lloron-pimiento" transform="translate(-3.5, -18.2) rotate(-96)" />
            <use href="#fleco-lloron-pimiento" transform="translate(8, -16.5) rotate(-58)" />
            <use href="#fleco-lloron-pimiento" transform="translate(15.8, -11) rotate(-32)" />
          </g>

          <!-- Sotocopa continua oscura que unifica la silueta clásica de árbol frondoso -->
          <path
            d="M -19.5,-3 C -20.5,-11 -13,-18.5 -4.5,-18.2 C 2.5,-20.8 12,-18.5 16.8,-12 C 21.2,-6 21,2.8 17.2,9.5 C 14.5,16.5 6,19.8 -2,19 C -10,20 -17.5,14.5 -19.2,7 C -21,3.2 -20.5,-0.5 -19.5,-3 Z"
            fill="#183f10"
            stroke="#102b09"
            stroke-width="0.75"
            stroke-linejoin="round"
          />

          <!-- Seis masas foliares festoneadas superpuestas desde sureste (sombra) hasta noroeste (sol) -->
          <g opacity="0.88">
            <use href="#masa-foliar-pimiento" transform="translate(7.5, 6.8) rotate(135) scale(0.92)" />
          </g>
          <use href="#masa-foliar-pimiento" transform="translate(-6.2, 7.2) rotate(52) scale(0.95)" />
          <use href="#masa-foliar-pimiento" transform="translate(7.8, -5.2) rotate(22) scale(0.96)" />
          <use href="#masa-foliar-pimiento" transform="translate(-2.5, -10.2) rotate(-28) scale(0.94)" />
          <use href="#masa-foliar-pimiento" transform="translate(-9.5, -2.5) rotate(-12) scale(0.98)" />
          <!-- Corona central elevada con folíolos bañados por el sol -->
          <use href="#masa-foliar-pimiento" transform="translate(-1.2, -1.2) rotate(8) scale(1.02)" />

          <!-- Hendiduras orgánicas sutiles entre brazos de follaje y discreta horquilla leñosa interior -->
          <g fill="none" stroke="#13340b" stroke-width="0.95" stroke-linecap="round" opacity="0.58">
            <path d="M 1.5,1.8 C 5,4.8 8.8,8.2 13.5,10.2" />
            <path d="M 2,-1.5 C 6.2,-3.8 10.2,-5.2 14.5,-4.6" />
            <path d="M -2.2,2.5 C -4.8,6.5 -6.8,10.5 -6.2,14.8" />
          </g>
          <path d="M -1.2,1 L 1.2,-0.8 M 0.1,0.1 L 2,1.8" fill="none" stroke="#6b4428" stroke-width="1.2" stroke-linecap="round" opacity="0.62" />

          <!-- Ramilletes finos de hojuelas pinnadas iluminadas al noroeste -->
          <g fill="#c9f27c" opacity="0.88">
            <path d="M -13.5,-6.8 L -11,-9.2 L -9.5,-7.2 L -7.2,-9.6 L -6,-7.2 L -8.8,-5.8 L -11.5,-5.2 Z" />
            <path d="M -5.8,-13.2 L -3.2,-15.2 L -1.8,-13.2 L 0.6,-14.8 L 0.8,-12.4 L -2.5,-11.8 Z" />
            <path d="M -5.2,-3.8 L -2.6,-5.8 L -1,-3.8 L 1.5,-5.2 L 1.2,-2.6 L -2.2,-2 Z" />
            <path d="M -12.2,3.5 L -9.8,1.8 L -8.2,3.4 L -6.4,2.2 L -7,4.5 L -10.2,4.8 Z" opacity="0.76" />
          </g>

          <!-- Racimos colgantes característicos de pimienta rosa (Schinus molle) -->
          <g>
            <circle cx="-15.8" cy="-1.2" r="1.15" fill="#be123c" />
            <circle cx="-17.2" cy="0.2" r="0.95" fill="#fb7185" />
            <circle cx="-14.8" cy="0.5" r="0.85" fill="#fda4af" />

            <circle cx="2.2" cy="-15.6" r="1.1" fill="#e11d48" />
            <circle cx="3.8" cy="-16.4" r="0.92" fill="#fda4af" />
            <circle cx="1.2" cy="-14.2" r="0.82" fill="#fb7185" />

            <circle cx="14.5" cy="-0.8" r="1.12" fill="#be123c" />
            <circle cx="15.9" cy="0.6" r="0.92" fill="#fb7185" />
            <circle cx="13.6" cy="0.9" r="0.82" fill="#fda4af" />

            <circle cx="-3.5" cy="14.8" r="1.08" fill="#be123c" />
            <circle cx="-1.9" cy="15.8" r="0.9" fill="#fb7185" />
          </g>
        </g>

        <!-- ÁRBOL DE PIMIENTO CLÁSICO B (copa ovalada aparasolada con follaje plumoso verde-oliva) -->
        <g id="arbol-pimiento-b">
          <path
            d="M -21,-2 C -22,-10 -14.5,-16.8 -5,-16.8 C 3.5,-19 13.5,-16.8 18.8,-10.5 C 23,-4.8 22.5,3.5 18.2,9 C 13.8,15.8 4.2,18 -4,17.2 C -12.5,18 -19.5,12.8 -21,5.8 C -22.5,2.2 -22,-0.5 -21,-2 Z"
            fill="#051304"
            opacity="0.5"
            transform="translate(8, 9)"
          />
          <g>
            <use href="#fleco-lloron-pimiento" transform="translate(19.2, -2.5) rotate(-8)" />
            <use href="#fleco-lloron-pimiento" transform="translate(15.8, 7.8) rotate(32)" />
            <use href="#fleco-lloron-pimiento" transform="translate(5.2, 15.8) rotate(74)" />
            <use href="#fleco-lloron-pimiento" transform="translate(-8.2, 15.5) rotate(116)" />
            <use href="#fleco-lloron-pimiento" transform="translate(-18.5, 7.2) rotate(154)" />
            <use href="#fleco-lloron-pimiento" transform="translate(-19.5, -4.8) rotate(-162)" />
            <use href="#fleco-lloron-pimiento" transform="translate(-9.5, -14.8) rotate(-114)" />
            <use href="#fleco-lloron-pimiento" transform="translate(6.2, -16) rotate(-62)" />
          </g>
          <path
            d="M -20.5,-2 C -21.5,-9.6 -14,-16.2 -5,-16.2 C 3.2,-18.4 13,-16.2 18.2,-10 C 22.2,-4.6 21.8,3.2 17.6,8.8 C 13.4,15 4.2,17.4 -4,16.6 C -12,17.4 -19,12.2 -20.2,5.5 C -21.8,2 -21.2,-0.5 -20.5,-2 Z"
            fill="#194211"
            stroke="#102b09"
            stroke-width="0.75"
            stroke-linejoin="round"
          />
          <use href="#masa-foliar-pimiento" transform="translate(8.2, 4.8) rotate(142) scale(0.94, 0.86)" />
          <use href="#masa-foliar-pimiento" transform="translate(-7.8, 5.2) rotate(44) scale(0.96, 0.88)" />
          <use href="#masa-foliar-pimiento" transform="translate(7.5, -5.2) rotate(16) scale(0.96, 0.88)" />
          <use href="#masa-foliar-pimiento" transform="translate(-8.5, -5.2) rotate(-18) scale(1.02, 0.92)" />
          <use href="#masa-foliar-pimiento" transform="translate(-0.5, -0.8) rotate(-4) scale(1.0, 0.9)" />

          <g fill="none" stroke="#13340b" stroke-width="0.9" stroke-linecap="round" opacity="0.56">
            <path d="M 1,1 C 5.2,3.8 9.8,6.6 15,8" />
            <path d="M -2,1.5 C -5.8,5.2 -8.8,9 -10,13.2" />
          </g>

          <g fill="#d9f99d" opacity="0.86">
            <path d="M -14.5,-6.5 L -11.8,-8.8 L -10,-6.8 L -7.4,-8.8 L -6.2,-6.5 L -9.6,-5.2 L -12.5,-4.8 Z" />
            <path d="M 2.2,-9.2 L 4.8,-11 L 6.4,-9.2 L 8.6,-10.2 L 8.2,-7.8 L 4.8,-7.5 Z" />
            <path d="M -4.8,-2.8 L -2,-4.6 L -0.4,-2.8 L 2,-4 L 1.6,-1.6 L -1.8,-1.2 Z" />
          </g>

          <g>
            <circle cx="-16.2" cy="-0.8" r="1.12" fill="#e11d48" />
            <circle cx="-17.5" cy="0.6" r="0.92" fill="#fda4af" />
            <circle cx="4.2" cy="-13.8" r="1.08" fill="#be123c" />
            <circle cx="5.8" cy="-14.5" r="0.9" fill="#fb7185" />
            <circle cx="14.8" cy="2.4" r="1.08" fill="#be123c" />
            <circle cx="16.2" cy="3.8" r="0.88" fill="#fb7185" />
          </g>
        </g>

        <!-- ÁRBOL DE PIMIENTO CLÁSICO C (ejemplar frondoso sabanero de doble copa redondeada entrelazada) -->
        <g id="arbol-pimiento-c">
          <g fill="#051304" opacity="0.5" transform="translate(8.5, 9.5)">
            <circle cx="-5.5" cy="-2.5" r="16.8" />
            <circle cx="9.2" cy="3.2" r="13.6" />
          </g>
          <g>
            <use href="#fleco-lloron-pimiento" transform="translate(-20.8, -4) rotate(-172)" />
            <use href="#fleco-lloron-pimiento" transform="translate(-13.5, -16.8) rotate(-124)" />
            <use href="#fleco-lloron-pimiento" transform="translate(1, -17.8) rotate(-78)" />
            <use href="#fleco-lloron-pimiento" transform="translate(15.8, -8.2) rotate(-32)" />
            <use href="#fleco-lloron-pimiento" transform="translate(21, 4.2) rotate(14)" />
            <use href="#fleco-lloron-pimiento" transform="translate(13.8, 14.8) rotate(58)" />
            <use href="#fleco-lloron-pimiento" transform="translate(-1, 14.8) rotate(102)" />
            <use href="#fleco-lloron-pimiento" transform="translate(-15, 11) rotate(142)" />
          </g>
          <path
            d="M -21,-3 C -21.5,-11.5 -14.5,-18.5 -5.8,-18.5 C 1.5,-19.2 7.8,-15 10.2,-9.5 C 16.5,-9.2 21.8,-4 21.8,2.8 C 21.8,9.8 16.2,15.8 9.2,15.8 C 4.2,15.8 0,13.5 -2.8,10.8 C -10.8,13.8 -19.5,8.5 -20.8,0.5 Z"
            fill="#183f10"
            stroke="#102b09"
            stroke-width="0.75"
            stroke-linejoin="round"
          />
          <!-- Copa secundaria suroriental -->
          <use href="#masa-foliar-pimiento" transform="translate(10.5, 4.5) rotate(118) scale(0.88)" />
          <use href="#masa-foliar-pimiento" transform="translate(7.8, 0.8) rotate(18) scale(0.86)" />
          <!-- Copa principal noroccidental -->
          <use href="#masa-foliar-pimiento" transform="translate(-5.2, 4.5) rotate(64) scale(0.92)" />
          <use href="#masa-foliar-pimiento" transform="translate(-1.5, -8.2) rotate(-22) scale(0.92)" />
          <use href="#masa-foliar-pimiento" transform="translate(-10.2, -3.5) rotate(-14) scale(0.96)" />
          <use href="#masa-foliar-pimiento" transform="translate(-4.5, -2.5) rotate(6) scale(0.96)" />
          <path d="M 3.5,-8.8 C 1.8,-2.8 2.8,4.2 7,9.8" fill="none" stroke="#12320a" stroke-width="1.15" stroke-linecap="round" opacity="0.66" />

          <g fill="#c9f27c" opacity="0.88">
            <path d="M -15.5,-6.2 L -12.8,-8.6 L -11,-6.5 L -8.5,-8.5 L -7.4,-6.2 L -10.8,-4.8 L -13.6,-4.5 Z" />
            <path d="M -6.2,-12.5 L -3.5,-14.4 L -2,-12.5 L 0.4,-13.8 L 0.2,-11.4 L -3.2,-11 Z" />
            <path d="M 4.5,-1.5 L 7,-3.2 L 8.5,-1.6 L 10.4,-2.5 L 9.8,-0.2 L 6.8,0 Z" opacity="0.78" />
          </g>
          <g>
            <circle cx="-17.8" cy="1.2" r="1.12" fill="#e11d48" />
            <circle cx="-19.2" cy="2.6" r="0.92" fill="#fda4af" />
            <circle cx="-4.2" cy="-16.2" r="1.08" fill="#be123c" />
            <circle cx="-2.6" cy="-17" r="0.9" fill="#fb7185" />
            <circle cx="16.2" cy="7.2" r="1.08" fill="#be123c" />
            <circle cx="17.6" cy="8.5" r="0.88" fill="#fb7185" />
          </g>
        </g>

        <!-- ÁRBOL DE PIMIENTO JOVEN: copa clásica redondeada compacta con textura foliar compuesta -->
        <g id="arbol-pimiento-joven">
          <circle cx="5.5" cy="6.2" r="13" fill="#051304" opacity="0.48" />
          <g>
            <use href="#fleco-lloron-pimiento" transform="translate(11.4, 0) scale(0.72)" />
            <use href="#fleco-lloron-pimiento" transform="translate(5.2, 10.2) rotate(64) scale(0.72)" />
            <use href="#fleco-lloron-pimiento" transform="translate(-7.2, 9.2) rotate(128) scale(0.72)" />
            <use href="#fleco-lloron-pimiento" transform="translate(-11.6, -1.4) rotate(-172) scale(0.72)" />
            <use href="#fleco-lloron-pimiento" transform="translate(-4.2, -10.6) rotate(-108) scale(0.72)" />
            <use href="#fleco-lloron-pimiento" transform="translate(7.2, -9) rotate(-42) scale(0.72)" />
          </g>
          <path
            d="M -12.4,-2 C -12.8,-7.6 -8,-12.4 -2.2,-12.2 C 3.4,-13.5 9,-11.2 11.6,-6.2 C 13.8,-1.8 13.2,4 10,8 C 6.6,12.2 0.5,13.2 -4.8,12.2 C -10,11.6 -12.8,6.8 -12.5,1.6 Z"
            fill="#183f10"
            stroke="#102b09"
            stroke-width="0.7"
          />
          <use href="#masa-foliar-pimiento" transform="translate(3.2, 3) rotate(125) scale(0.64)" />
          <use href="#masa-foliar-pimiento" transform="translate(3.4, -3.2) rotate(24) scale(0.66)" />
          <use href="#masa-foliar-pimiento" transform="translate(-3.8, 3) rotate(58) scale(0.66)" />
          <use href="#masa-foliar-pimiento" transform="translate(-3.2, -3.2) rotate(-14) scale(0.72)" />
          <path d="M -7.5,-5.2 L -5,-7 L -3.5,-5.2 L -1.4,-6.4 L -1.8,-4.2 L -4.8,-3.8 Z" fill="#c9f27c" opacity="0.88" />
          <circle cx="-9.4" cy="1.8" r="0.95" fill="#e11d48" />
          <circle cx="-10.5" cy="2.9" r="0.78" fill="#fda4af" />
          <circle cx="7.4" cy="-7.2" r="0.92" fill="#be123c" />
        </g>

        <!-- Palma corozo sabanera (acento puntual) -->
        <g id="palmera-campus">
          <line x1="0" y1="0" x2="11.5" y2="12.5" stroke="#061504" stroke-width="2.5" stroke-linecap="round" opacity="0.46" />
          <g fill="#061504" opacity="0.46" transform="translate(11.5, 12.5) scale(0.92)">
            <path d="M 0,0 C 6,-3.4 13,-3.6 19.5,-0.5 C 13,2.2 6,2.6 0,0 Z" />
            <path d="M 0,0 C 6,-3.4 13,-3.6 18.5,-0.5 C 12,2.2 6,2.6 0,0 Z" transform="rotate(51)" />
            <path d="M 0,0 C 6,-3.4 13,-3.6 19.5,-0.5 C 13,2.2 6,2.6 0,0 Z" transform="rotate(102)" />
            <path d="M 0,0 C 6,-3.4 13,-3.6 18.5,-0.5 C 12,2.2 6,2.6 0,0 Z" transform="rotate(153)" />
            <path d="M 0,0 C 6,-3.4 13,-3.6 19.5,-0.5 C 13,2.2 6,2.6 0,0 Z" transform="rotate(204)" />
            <path d="M 0,0 C 6,-3.4 13,-3.6 18.5,-0.5 C 12,2.2 6,2.6 0,0 Z" transform="rotate(255)" />
            <path d="M 0,0 C 6,-3.4 13,-3.6 19.5,-0.5 C 13,2.2 6,2.6 0,0 Z" transform="rotate(306)" />
          </g>
          <g fill="#2b631c" stroke="#183b0f" stroke-width="0.42" stroke-linejoin="round">
            <path d="M 0,0 L 3.8,-1.8 L 3.2,-2.9 L 8.2,-2.5 L 7.5,-3.6 L 12.8,-2.6 L 16.8,-1.5 L 19.4,-0.1 L 16.4,1.4 L 12,2.8 L 12.5,1.9 L 7.4,2.9 L 8,1.9 L 3.3,2.2 Z" />
            <path d="M 0,0 L 3.8,-1.8 L 3.2,-2.9 L 8.2,-2.5 L 7.5,-3.6 L 12.8,-2.6 L 16.8,-1.5 L 19.4,-0.1 L 16.4,1.4 L 12,2.8 L 12.5,1.9 L 7.4,2.9 L 8,1.9 L 3.3,2.2 Z" transform="rotate(51) scale(0.94)" />
            <path d="M 0,0 L 3.8,-1.8 L 3.2,-2.9 L 8.2,-2.5 L 7.5,-3.6 L 12.8,-2.6 L 16.8,-1.5 L 19.4,-0.1 L 16.4,1.4 L 12,2.8 L 12.5,1.9 L 7.4,2.9 L 8,1.9 L 3.3,2.2 Z" transform="rotate(102)" />
            <path d="M 0,0 L 3.8,-1.8 L 3.2,-2.9 L 8.2,-2.5 L 7.5,-3.6 L 12.8,-2.6 L 16.8,-1.5 L 19.4,-0.1 L 16.4,1.4 L 12,2.8 L 12.5,1.9 L 7.4,2.9 L 8,1.9 L 3.3,2.2 Z" transform="rotate(153) scale(0.92)" />
            <path d="M 0,0 L 3.8,-1.8 L 3.2,-2.9 L 8.2,-2.5 L 7.5,-3.6 L 12.8,-2.6 L 16.8,-1.5 L 19.4,-0.1 L 16.4,1.4 L 12,2.8 L 12.5,1.9 L 7.4,2.9 L 8,1.9 L 3.3,2.2 Z" transform="rotate(204)" />
            <path d="M 0,0 L 3.8,-1.8 L 3.2,-2.9 L 8.2,-2.5 L 7.5,-3.6 L 12.8,-2.6 L 16.8,-1.5 L 19.4,-0.1 L 16.4,1.4 L 12,2.8 L 12.5,1.9 L 7.4,2.9 L 8,1.9 L 3.3,2.2 Z" transform="rotate(255) scale(0.95)" />
            <path d="M 0,0 L 3.8,-1.8 L 3.2,-2.9 L 8.2,-2.5 L 7.5,-3.6 L 12.8,-2.6 L 16.8,-1.5 L 19.4,-0.1 L 16.4,1.4 L 12,2.8 L 12.5,1.9 L 7.4,2.9 L 8,1.9 L 3.3,2.2 Z" transform="rotate(306)" />
          </g>
          <g fill="#68ae3d" opacity="0.92">
            <path d="M 0,0 C 4,-2 8.8,-2.1 13,-0.2 C 8.8,1.5 4,1.7 0,0 Z" transform="rotate(24)" />
            <path d="M 0,0 C 4,-2 8.8,-2.1 12.6,-0.2 C 8.5,1.5 4,1.7 0,0 Z" transform="rotate(96)" />
            <path d="M 0,0 C 4,-2 8.8,-2.1 13,-0.2 C 8.8,1.5 4,1.7 0,0 Z" transform="rotate(168)" />
            <path d="M 0,0 C 4,-2 8.8,-2.1 13.4,-0.2 C 9,1.5 4,1.7 0,0 Z" transform="rotate(240)" />
            <path d="M 0,0 C 4,-2 8.8,-2.1 12.8,-0.2 C 8.6,1.5 4,1.7 0,0 Z" transform="rotate(312)" />
          </g>
          <circle cx="1.1" cy="1" r="1.3" fill="#6b4423" />
          <circle cx="-1.2" cy="0.8" r="1.2" fill="#855831" />
          <circle cx="0" cy="0" r="1.3" fill="#bef264" />
        </g>

        <!-- Macizo orgánico de arbustos plumosos bajos -->
        <g id="arbusto-campus">
          <path
            d="M -14,1 C -16,-4 -11,-8 -5,-7 C -1,-10 6,-10 10,-6 C 14,-5 16,0 13,4 C 14,8 8,9.5 3,8 C -2,10 -7,9.5 -11,7 C -15,7 -16,4 -14,1 Z"
            fill="#061504"
            opacity="0.46"
            transform="translate(5.2, 5.8)"
          />
          <use href="#fronda-pimiento-base" transform="rotate(-155) scale(0.68, 0.78)" />
          <use href="#fronda-pimiento-base" transform="rotate(-70) scale(0.65, 0.76)" />
          <use href="#fronda-pimiento-base" transform="rotate(18) scale(0.7, 0.78)" />
          <use href="#fronda-pimiento-base" transform="rotate(108) scale(0.64, 0.74)" />
          <circle cx="-1.5" cy="-1" r="4.2" fill="#5ca333" opacity="0.88" />
          <circle cx="-2.5" cy="-2" r="2.4" fill="#bef264" opacity="0.82" />
        </g>

        <!-- Arbusto bajo con floración amarilla sabanera -->
        <g id="arbusto-flor">
          <use href="#arbusto-campus" />
          <g fill="#fef9c3" opacity="0.95">
            <circle cx="-5.8" cy="-2.4" r="1.35" />
            <circle cx="-3.4" cy="-4" r="1.05" fill="#fde047" />
            <circle cx="5" cy="-1.6" r="1.25" />
            <circle cx="6.8" cy="-0.2" r="0.95" fill="#fde047" />
            <circle cx="0.8" cy="3" r="1.15" />
          </g>
        </g>

        <!-- Roseta tropical de helecho / agave con sombra lateral -->
        <g id="helecho-campus">
          <ellipse cx="3.4" cy="3.8" rx="7.2" ry="5.8" fill="#061504" opacity="0.45" />
          <g fill="#366f20" stroke="#1b3e10" stroke-width="0.35">
            <path d="M 0,0 C 2.5,-1.4 5.8,-1.2 8.6,0 C 5.8,1.2 2.5,1.4 0,0 Z" />
            <path d="M 0,0 C 2.5,-1.4 5.8,-1.2 8.6,0 C 5.8,1.2 2.5,1.4 0,0 Z" transform="rotate(51)" />
            <path d="M 0,0 C 2.5,-1.4 5.8,-1.2 8.6,0 C 5.8,1.2 2.5,1.4 0,0 Z" transform="rotate(102)" />
            <path d="M 0,0 C 2.5,-1.4 5.8,-1.2 8.6,0 C 5.8,1.2 2.5,1.4 0,0 Z" transform="rotate(153)" />
            <path d="M 0,0 C 2.5,-1.4 5.8,-1.2 8.6,0 C 5.8,1.2 2.5,1.4 0,0 Z" transform="rotate(204)" />
            <path d="M 0,0 C 2.5,-1.4 5.8,-1.2 8.6,0 C 5.8,1.2 2.5,1.4 0,0 Z" transform="rotate(255)" />
            <path d="M 0,0 C 2.5,-1.4 5.8,-1.2 8.6,0 C 5.8,1.2 2.5,1.4 0,0 Z" transform="rotate(306)" />
          </g>
          <g fill="#7ac048" opacity="0.94">
            <path d="M 0,0 C 1.8,-0.9 4,-0.8 5.8,0 C 4,0.8 1.8,0.9 0,0 Z" transform="rotate(25)" />
            <path d="M 0,0 C 1.8,-0.9 4,-0.8 5.8,0 C 4,0.8 1.8,0.9 0,0 Z" transform="rotate(97)" />
            <path d="M 0,0 C 1.8,-0.9 4,-0.8 5.8,0 C 4,0.8 1.8,0.9 0,0 Z" transform="rotate(169)" />
            <path d="M 0,0 C 1.8,-0.9 4,-0.8 5.8,0 C 4,0.8 1.8,0.9 0,0 Z" transform="rotate(241)" />
            <path d="M 0,0 C 1.8,-0.9 4,-0.8 5.8,0 C 4,0.8 1.8,0.9 0,0 Z" transform="rotate(313)" />
          </g>
          <circle cx="0" cy="0" r="1.2" fill="#d9f99d" />
        </g>

        <!-- Demarcación horizontal termoplástica: flecha direccional recta esbelta -->
        <g id="flecha-vial-recta">
          <path
            d="M -19,-1.7 L -2,-2.5 L -5.5,-8.2 L 19,0 L -5.5,8.2 L -2,2.5 L -19,1.7 Z"
            fill="#0f172a"
            opacity="0.34"
            transform="translate(0, 1.1)"
          />
          <path
            d="M -19,-1.7 L -2,-2.5 L -5.5,-8.2 L 19,0 L -5.5,8.2 L -2,2.5 L -19,1.7 Z"
            fill="#f8fafc"
          />
        </g>

        <!-- Demarcación horizontal termoplástica: flecha curva de retorno oriental -->
        <g id="flecha-vial-curva-retorno">
          <path
            d="M -5.2,-20 L -1.6,-19.4 Q 2.4,-4 0.4,7 L 6.2,4.2 L -3.6,22 L -9.6,3.2 L -3.8,6.6 Q -1.8,-4 -5.2,-20 Z"
            fill="#0f172a"
            opacity="0.34"
            transform="translate(0, 1.1)"
          />
          <path
            d="M -5.2,-20 L -1.6,-19.4 Q 2.4,-4 0.4,7 L 6.2,4.2 L -3.6,22 L -9.6,3.2 L -3.8,6.6 Q -1.8,-4 -5.2,-20 Z"
            fill="#f8fafc"
          />
        </g>

        <!-- Flecha combinada de calzada exterior (sur + giro izquierdo a portería) -->
        <g id="flecha-calle-recto-giro-izq">
          <g fill="#0f172a" opacity="0.34" transform="translate(0, 1.1)">
            <path d="M -1.9,-20 L 1.9,-20 L 2.3,9.5 L 7.2,6.8 L 0,23 L -7.2,6.8 L -2.3,9.5 Z" />
            <path d="M 1.6,-6.5 C 4.5,-2.5 7.5,1.2 11.2,2.4 L 9.2,-1.8 L 21,4.8 L 8.2,9.8 L 10.4,5.6 C 5.8,4.2 2.6,0.4 0.6,-3 Z" />
          </g>
          <g fill="#f8fafc">
            <path d="M -1.9,-20 L 1.9,-20 L 2.3,9.5 L 7.2,6.8 L 0,23 L -7.2,6.8 L -2.3,9.5 Z" />
            <path d="M 1.6,-6.5 C 4.5,-2.5 7.5,1.2 11.2,2.4 L 9.2,-1.8 L 21,4.8 L 8.2,9.8 L 10.4,5.6 C 5.8,4.2 2.6,0.4 0.6,-3 Z" />
          </g>
        </g>

        <!-- Flecha combinada de calzada exterior (norte + giro derecho a portería) -->
        <g id="flecha-calle-recto-giro-der">
          <g fill="#0f172a" opacity="0.34" transform="translate(0, 1.1)">
            <path d="M -1.9,20 L 1.9,20 L 2.3,-9.5 L 7.2,-6.8 L 0,-23 L -7.2,-6.8 L -2.3,-9.5 Z" />
            <path d="M 1.6,6.5 C 4.5,2.5 7.5,-1.2 11.2,-2.4 L 9.2,1.8 L 21,-4.8 L 8.2,-9.8 L 10.4,-5.6 C 5.8,-4.2 2.6,-0.4 0.6,3 Z" />
          </g>
          <g fill="#f8fafc">
            <path d="M -1.9,20 L 1.9,20 L 2.3,-9.5 L 7.2,-6.8 L 0,-23 L -7.2,-6.8 L -2.3,-9.5 Z" />
            <path d="M 1.6,6.5 C 4.5,2.5 7.5,-1.2 11.2,-2.4 L 9.2,1.8 L 21,-4.8 L 8.2,-9.8 L 10.4,-5.6 C 5.8,-4.2 2.6,-0.4 0.6,3 Z" />
          </g>
        </g>
      </defs>

      <!-- Terreno exterior y huella exacta de concreto/asfalto del recinto (y=48..520, sin asfalto muerto detrás de las bahías) -->
      <rect x="0" y="0" :width="ANCHO_PLANO" :height="ALTO_PLANO" :fill="tema === 'oscuro' ? '#0b1120' : '#e2e8f0'" />
      <rect x="235" y="48" width="953" height="472" rx="12" fill="#1e293b" stroke="#0f172a" stroke-width="2" />

      <!-- Praderas continuas de la Sabana de Sucre con textura real de hierba, relieve de luz/sombra y bordillos -->
      <g id="paisajismo-campus">
        <!-- Pradera norte expandida (y=0..48) y hombro curvo noroccidental -->
        <path
          d="M 235 0 L 1200 0 L 1200 48 L 316 48 L 316 144 C 280 144, 272 208, 235 208 Z"
          fill="url(#prado-norte-grad)"
        />
        <!-- Claros soleados y hondonadas de sombra sobre el pasto norte -->
        <path
          d="M 244 4 C 360 2, 640 4, 1190 6 L 1190 28 C 840 34, 520 26, 306 34 L 302 124 C 278 138, 264 166, 242 184 Z"
          fill="#76ba46"
          opacity="0.34"
        />
        <path
          d="M 246 34 C 282 32, 306 60, 298 120 C 284 136, 268 164, 248 174 C 242 134, 242 70, 246 34 Z"
          fill="#17380e"
          opacity="0.34"
        />
        <!-- Doble tapiz denso de filamentos de hierba en la pradera norte -->
        <path
          d="M 235 0 L 1200 0 L 1200 48 L 316 48 L 316 144 C 280 144, 272 208, 235 208 Z"
          fill="url(#textura-hierba-sabana)"
        />
        <path
          d="M 235 0 L 1200 0 L 1200 48 L 316 48 L 316 144 C 280 144, 272 208, 235 208 Z"
          fill="url(#trama-filamentos-pasto)"
        />

        <!-- Pradera sur expandida (y=520..580) y hombro curvo suroccidental -->
        <path
          d="M 235 352 C 272 352, 280 424, 316 424 L 316 520 L 1200 520 L 1200 580 L 235 580 Z"
          fill="url(#prado-sur-grad)"
        />
        <path
          d="M 242 390 C 264 404, 280 438, 302 452 L 304 536 C 560 532, 880 536, 1190 540 L 1190 574 L 242 574 Z"
          fill="#76ba46"
          opacity="0.34"
        />
        <path
          d="M 248 398 C 268 410, 286 438, 298 458 C 304 514, 286 556, 250 562 C 242 520, 242 440, 248 398 Z"
          fill="#17380e"
          opacity="0.34"
        />
        <!-- Doble tapiz denso de filamentos de hierba en la pradera sur -->
        <path
          d="M 235 352 C 272 352, 280 424, 316 424 L 316 520 L 1200 520 L 1200 580 L 235 580 Z"
          fill="url(#textura-hierba-sabana)"
        />
        <path
          d="M 235 352 C 272 352, 280 424, 316 424 L 316 520 L 1200 520 L 1200 580 L 235 580 Z"
          fill="url(#trama-filamentos-pasto)"
        />

        <!-- Franja ajardinada oriental ajustada al borde exacto de E10 y E30 (x=1134) -->
        <path
          d="M 1134 48 L 1200 48 L 1200 520 L 1134 520 L 1134 424 L 1138 424 Q 1186 424, 1186 376 L 1186 192 Q 1186 144, 1138 144 L 1134 144 Z"
          fill="#467c27"
        />
        <path
          d="M 1146 54 L 1195 54 L 1195 148 Q 1172 142, 1146 134 Z M 1146 434 Q 1172 426, 1195 420 L 1195 514 L 1146 514 Z"
          fill="#74b843"
          opacity="0.36"
        />
        <path
          d="M 1134 48 L 1200 48 L 1200 520 L 1134 520 L 1134 424 L 1138 424 Q 1186 424, 1186 376 L 1186 192 Q 1186 144, 1138 144 L 1134 144 Z"
          fill="url(#textura-hierba-sabana)"
        />
        <path
          d="M 1134 48 L 1200 48 L 1200 520 L 1134 520 L 1134 424 L 1138 424 Q 1186 424, 1186 376 L 1186 192 Q 1186 144, 1138 144 L 1134 144 Z"
          fill="url(#trama-filamentos-pasto)"
        />

        <!-- Sombra corrida de contacto junto a los bordillos perimetrales -->
        <line x1="316" y1="45.5" x2="1135" y2="45.5" stroke="#0b2206" stroke-width="3" opacity="0.52" />
        <line x1="316" y1="48" x2="1135" y2="48" stroke="#cbd5e1" stroke-width="2.2" />
        <line x1="1134" y1="48" x2="1134" y2="144" stroke="#cbd5e1" stroke-width="2.2" />
        <line x1="316" y1="522.5" x2="1135" y2="522.5" stroke="#0b2206" stroke-width="3.2" opacity="0.55" />
        <line x1="316" y1="520" x2="1135" y2="520" stroke="#cbd5e1" stroke-width="2.2" />
        <line x1="1134" y1="424" x2="1134" y2="520" stroke="#cbd5e1" stroke-width="2.2" />
      </g>

      <!-- Plazoleta peatonal de portería -->
      <rect
        x="142"
        y="0"
        width="93"
        :height="ALTO_PLANO"
        :fill="tema === 'oscuro' ? '#0f172a' : '#e2e8f0'"
      />

      <!-- Red vial monolítica continua: calle exterior, portería, distribuidor y calzadas -->
      <g id="red-vial-unificada">
        <path
          fill="#334155"
          fill-rule="evenodd"
          d="
            M 12 0
            L 126 0
            L 126 180
            Q 126 208, 154 208
            L 238 208
            C 272 208, 280 144, 316 144
            L 1138 144
            Q 1186 144, 1186 192
            L 1186 376
            Q 1186 424, 1138 424
            L 316 424
            C 280 424, 272 352, 238 352
            L 154 352
            Q 126 352, 126 380
            L 126 580
            L 12 580
            Z

            M 316 226
            L 1134 226
            C 1156 226, 1156 344, 1134 344
            L 316 344
            C 288 344, 288 226, 316 226
            Z
          "
        />

        <!-- Isla central redondeada con cabeceras densas de hierba y rocallas variadas -->
        <g id="isla-central-separadora">
          <path
            d="M 316 226 L 1134 226 C 1156 226, 1156 344, 1134 344 L 316 344 C 288 344, 288 226, 316 226 Z"
            fill="#0f172a"
            stroke="#cbd5e1"
            stroke-width="2.5"
          />
          <rect x="316" y="322" width="818" height="20.5" fill="url(#prado-isla-grad)" />
          <rect x="316" y="322" width="818" height="20.5" fill="url(#textura-hierba-sabana)" />
          <rect x="316" y="322" width="818" height="20.5" fill="url(#trama-filamentos-pasto)" />
          <path
            d="M 316 230 L 316 342 C 292 342, 292 230, 316 230 Z"
            fill="url(#prado-isla-grad)"
          />
          <path
            d="M 316 230 L 316 342 C 292 342, 292 230, 316 230 Z"
            fill="url(#textura-hierba-sabana)"
          />
          <path
            d="M 316 230 L 316 342 C 292 342, 292 230, 316 230 Z"
            fill="url(#trama-filamentos-pasto)"
          />
          <use href="#roca-arista-aguda" transform="translate(306, 254) scale(0.74) rotate(-22)" />
          <use href="#arbol-pimiento-joven" transform="translate(306, 286) scale(0.68) rotate(18)" />
          <use href="#macolla-densa-a" transform="translate(307, 318) scale(0.66)" />

          <path
            d="M 1134 230 C 1152 230, 1152 342, 1134 342 Z"
            fill="url(#prado-isla-grad)"
          />
          <path
            d="M 1134 230 C 1152 230, 1152 342, 1134 342 Z"
            fill="url(#textura-hierba-sabana)"
          />
          <path
            d="M 1134 230 C 1152 230, 1152 342, 1134 342 Z"
            fill="url(#trama-filamentos-pasto)"
          />
          <use href="#macolla-espiga-brisa" transform="translate(1140, 254) scale(0.64)" />
          <use href="#arbol-pimiento-joven" transform="translate(1141, 286) scale(0.64) rotate(-32)" />
          <use href="#roca-canto-meteorizado" transform="translate(1140, 317) scale(0.58) rotate(14)" />
        </g>

        <!-- Andenes y bordillos de concreto con ochavas curvas -->
        <rect x="0" y="0" width="12" :height="ALTO_PLANO" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1" />
        <line x1="12" y1="0" x2="12" :y2="ALTO_PLANO" stroke="#64748b" stroke-width="2" />

        <path
          d="M 126 0 L 143 0 L 143 178 Q 143 193, 158 193 L 236 193 L 236 208 L 154 208 Q 126 208, 126 180 Z"
          fill="#cbd5e1"
          stroke="#94a3b8"
          stroke-width="1.2"
        />
        <path
          d="M 126 0 L 126 180 Q 126 208, 154 208 L 238 208 C 272 208, 280 144, 316 144"
          fill="none"
          stroke="#64748b"
          stroke-width="3.2"
          stroke-linecap="round"
        />
        <path
          d="M 238 205.5 C 270 205.5, 279 141.5, 316 141.5"
          fill="none"
          stroke="#cbd5e1"
          stroke-width="2"
        />

        <path
          d="M 126 580 L 143 580 L 143 382 Q 143 367, 158 367 L 236 367 L 236 352 L 154 352 Q 126 352, 126 380 Z"
          fill="#cbd5e1"
          stroke="#94a3b8"
          stroke-width="1.2"
        />
        <path
          d="M 126 580 L 126 380 Q 126 352, 154 352 L 238 352 C 272 352, 280 424, 316 424"
          fill="none"
          stroke="#64748b"
          stroke-width="3.2"
          stroke-linecap="round"
        />
        <path
          d="M 238 354.5 C 270 354.5, 279 426.5, 316 426.5"
          fill="none"
          stroke="#cbd5e1"
          stroke-width="2"
        />

        <path
          d="M 1134 144 L 1138 144 Q 1186 144, 1186 192 L 1186 376 Q 1186 424, 1138 424 L 1134 424"
          fill="none"
          stroke="#cbd5e1"
          stroke-width="2.4"
        />

        <!-- Demarcación vial continua -->
        <line x1="18" y1="0" x2="18" :y2="ALTO_PLANO" stroke="#ffffff" stroke-width="2" opacity="0.9" />
        <path
          d="M 121 0 L 121 178 Q 121 212, 134 212"
          fill="none"
          stroke="#ffffff"
          stroke-width="2"
          opacity="0.9"
        />
        <path
          d="M 134 348 Q 121 348, 121 382 L 121 580"
          fill="none"
          stroke="#ffffff"
          stroke-width="2"
          opacity="0.9"
        />

        <line x1="62" y1="0" x2="62" y2="188" stroke="#facc15" stroke-width="2" />
        <line x1="68" y1="0" x2="68" y2="188" stroke="#facc15" stroke-width="2" />
        <line x1="65" y1="196" x2="65" y2="364" stroke="#facc15" stroke-width="1.8" stroke-dasharray="6 8" opacity="0.55" />
        <line x1="62" y1="372" x2="62" :y2="ALTO_PLANO" stroke="#facc15" stroke-width="2" />
        <line x1="68" y1="372" x2="68" :y2="ALTO_PLANO" stroke="#facc15" stroke-width="2" />

        <g id="tachas-amarillas">
          <circle cx="65" cy="40" r="1.5" fill="#fef08a" />
          <circle cx="65" cy="100" r="1.5" fill="#fef08a" />
          <circle cx="65" cy="160" r="1.5" fill="#fef08a" />
          <circle cx="65" cy="400" r="1.5" fill="#fef08a" />
          <circle cx="65" cy="460" r="1.5" fill="#fef08a" />
          <circle cx="65" cy="520" r="1.5" fill="#fef08a" />
        </g>

        <!-- Flechas direccionales termoplásticas en calzada exterior (Carrera 28) -->
        <g id="flechas-calzada-exterior" opacity="0.94">
          <use href="#flecha-vial-recta" transform="translate(40, 86) rotate(90) scale(0.9)" />
          <use href="#flecha-calle-recto-giro-izq" transform="translate(40, 224)" />
          <use href="#flecha-vial-recta" transform="translate(40, 476) rotate(90) scale(0.9)" />

          <use href="#flecha-vial-recta" transform="translate(95, 492) rotate(-90) scale(0.9)" />
          <use href="#flecha-calle-recto-giro-der" transform="translate(95, 290)" />
          <use href="#flecha-vial-recta" transform="translate(95, 86) rotate(-90) scale(0.9)" />
        </g>

        <g id="cebra-peatonal-acceso" opacity="0.94">
          <rect x="138" y="215" width="13" height="7.5" rx="1.5" fill="#ffffff" />
          <rect x="138" y="228" width="13" height="7.5" rx="1.5" fill="#ffffff" />
          <rect x="138" y="241" width="13" height="7.5" rx="1.5" fill="#ffffff" />
          <rect x="138" y="254" width="13" height="7.5" rx="1.5" fill="#ffffff" />
          <rect x="138" y="267" width="13" height="7.5" rx="1.5" fill="#ffffff" />
          <rect x="138" y="285" width="13" height="7.5" rx="1.5" fill="#ffffff" />
          <rect x="138" y="298" width="13" height="7.5" rx="1.5" fill="#ffffff" />
          <rect x="138" y="311" width="13" height="7.5" rx="1.5" fill="#ffffff" />
          <rect x="138" y="324" width="13" height="7.5" rx="1.5" fill="#ffffff" />
          <rect x="138" y="337" width="13" height="7.5" rx="1.5" fill="#ffffff" />
        </g>

        <line x1="222" y1="212" x2="222" y2="276" stroke="#ffffff" stroke-width="3" opacity="0.9" />
        <line x1="160" y1="284" x2="160" y2="348" stroke="#ffffff" stroke-width="3" opacity="0.9" />

        <!-- Separador amarillo de carriles en garganta de portería -->
        <line x1="158" y1="280" x2="264" y2="280" stroke="#facc15" stroke-width="2.2" stroke-dasharray="9 6" opacity="0.92" />

        <!-- Flechas termoplásticas blancas de circulación interna -->
        <g id="flechas-circuito-interno" opacity="0.95">
          <!-- Acceso y salida en garganta de portería -->
          <use href="#flecha-vial-recta" transform="translate(188, 244) scale(0.86)" />
          <use href="#flecha-vial-recta" transform="translate(194, 316) rotate(180) scale(0.86)" />

          <!-- Transiciones curvas de ingreso y evacuación -->
          <use href="#flecha-vial-recta" transform="translate(280, 214) rotate(-33) scale(0.84)" />
          <use href="#flecha-vial-recta" transform="translate(280, 350) rotate(-144) scale(0.84)" />

          <!-- Carril norte unidireccional (sentido oriente) -->
          <use href="#flecha-vial-recta" transform="translate(446, 185)" />
          <use href="#flecha-vial-recta" transform="translate(749, 185)" />
          <use href="#flecha-vial-recta" transform="translate(1034, 185)" />

          <!-- Retorno oriental centrado en el carril asfáltico -->
          <use href="#flecha-vial-curva-retorno" transform="translate(1170, 284)" />

          <!-- Carril sur unidireccional (sentido occidente hacia salida) -->
          <use href="#flecha-vial-recta" transform="translate(1034, 384) rotate(180)" />
          <use href="#flecha-vial-recta" transform="translate(749, 384) rotate(180)" />
          <use href="#flecha-vial-recta" transform="translate(446, 384) rotate(180)" />
        </g>
      </g>

      <!-- Paisajismo natural sabanero en dos estratos: sotobosque (rocas, hierba densa, arbustos) debajo y copas clásicas de pimiento encima -->
      <g id="dosel-paisajismo" pointer-events="none">
        <!-- ESTRATO INFERIOR: 6 arquetipos de roca caliza, macollas densas de filamentos en brisa y arbustos bajos -->
        <!-- Hombro noroccidental -->
        <use href="#gravilla-caliza" transform="translate(284, 70) rotate(14)" />
        <use href="#roca-afloramiento-triple" transform="translate(258, 84) scale(0.96) rotate(-8)" />
        <use href="#macolla-densa-a" transform="translate(292, 74) scale(0.96)" />
        <use href="#macolla-densa-b" transform="translate(250, 152) scale(0.9)" />
        <use href="#roca-arista-aguda" transform="translate(296, 134) scale(1.02) rotate(22)" />
        <use href="#filamentos-borde" transform="translate(280, 148) rotate(-28)" />
        <use href="#macolla-espiga-brisa" transform="translate(250, 184) scale(0.94)" />
        <use href="#helecho-campus" transform="translate(304, 56) scale(0.84)" />
        <use href="#arbusto-flor" transform="translate(302, 102) scale(0.8) rotate(-18)" />

        <!-- Franja norte detrás de Estudiantes (y=0..48) -->
        <use href="#filamentos-borde" transform="translate(342, 42)" />
        <use href="#macolla-densa-b" transform="translate(330, 28) scale(0.92)" />
        <use href="#roca-laja-estratificada" transform="translate(370, 26) scale(0.94) rotate(-5)" />
        <use href="#gravilla-caliza" transform="translate(396, 35)" />
        <use href="#filamentos-borde" transform="translate(468, 42)" />
        <use href="#arbusto-flor" transform="translate(476, 30) scale(0.8) rotate(14)" />
        <use href="#macolla-densa-a" transform="translate(500, 36) scale(0.88)" />
        <use href="#roca-bloque-fracturado" transform="translate(566, 26) scale(0.98) rotate(9)" />
        <use href="#gravilla-caliza" transform="translate(590, 36) rotate(-18)" />
        <use href="#filamentos-borde" transform="translate(658, 42)" />
        <use href="#helecho-campus" transform="translate(668, 33) scale(0.84)" />
        <use href="#roca-canto-meteorizado" transform="translate(702, 27) scale(0.96) rotate(-12)" />
        <use href="#macolla-espiga-brisa" transform="translate(726, 36) scale(0.9)" />
        <use href="#roca-afloramiento-triple" transform="translate(756, 25) scale(0.92) rotate(6)" />
        <use href="#filamentos-borde" transform="translate(848, 42)" />
        <use href="#arbusto-flor" transform="translate(854, 30) scale(0.8) rotate(18)" />
        <use href="#macolla-densa-b" transform="translate(932, 35) scale(0.9)" />
        <use href="#roca-arista-aguda" transform="translate(958, 28) scale(1.1) rotate(-14)" />
        <use href="#gravilla-caliza" transform="translate(980, 35) rotate(22)" />
        <use href="#filamentos-borde" transform="translate(1054, 42)" />
        <use href="#arbusto-campus" transform="translate(1062, 29) scale(0.78) rotate(-10)" />
        <use href="#roca-laja-estratificada" transform="translate(1100, 26) scale(0.9) rotate(8)" />
        <use href="#macolla-densa-a" transform="translate(1124, 35) scale(0.86)" />
        <use href="#helecho-campus" transform="translate(1184, 28) scale(0.82)" />

        <!-- Jardinera lineal de la isla central (y=322..344) -->
        <use href="#macolla-densa-b" transform="translate(344, 334) scale(0.76)" />
        <use href="#filamentos-borde" transform="translate(378, 337) scale(0.82)" />
        <use href="#roca-arista-aguda" transform="translate(410, 332) scale(0.86) rotate(6)" />
        <use href="#macolla-espiga-brisa" transform="translate(444, 334) scale(0.72)" />
        <use href="#arbusto-flor" transform="translate(480, 332) scale(0.58)" />
        <use href="#macolla-densa-a" transform="translate(522, 334) scale(0.74)" />
        <use href="#gravilla-caliza" transform="translate(556, 333) scale(0.85)" />
        <use href="#roca-canto-meteorizado" transform="translate(592, 332) scale(0.68) rotate(-10)" />
        <use href="#filamentos-borde" transform="translate(628, 337) scale(0.82)" />
        <use href="#macolla-densa-b" transform="translate(702, 334) scale(0.76)" />
        <use href="#arbusto-flor" transform="translate(738, 332) scale(0.56) rotate(14)" />
        <use href="#roca-laja-estratificada" transform="translate(784, 332) scale(0.62) rotate(-4)" />
        <use href="#macolla-espiga-brisa" transform="translate(826, 334) scale(0.74)" />
        <use href="#filamentos-borde" transform="translate(866, 337) scale(0.82)" />
        <use href="#macolla-densa-a" transform="translate(946, 334) scale(0.74)" />
        <use href="#roca-bloque-fracturado" transform="translate(986, 332) scale(0.62) rotate(12)" />
        <use href="#gravilla-caliza" transform="translate(1018, 333) scale(0.82)" />
        <use href="#arbusto-flor" transform="translate(1050, 332) scale(0.58)" />
        <use href="#macolla-densa-b" transform="translate(1096, 334) scale(0.76)" />

        <!-- Hombro suroccidental -->
        <use href="#macolla-densa-b" transform="translate(250, 382) scale(0.92)" />
        <use href="#filamentos-borde" transform="translate(278, 412) rotate(32)" />
        <use href="#roca-bloque-fracturado" transform="translate(256, 434) scale(0.96) rotate(-14)" />
        <use href="#gravilla-caliza" transform="translate(280, 444) rotate(18)" />
        <use href="#roca-canto-meteorizado" transform="translate(300, 500) scale(0.92) rotate(16)" />
        <use href="#macolla-espiga-brisa" transform="translate(304, 554) scale(0.94)" />
        <use href="#helecho-campus" transform="translate(300, 442) scale(0.82)" />
        <use href="#arbusto-flor" transform="translate(248, 488) scale(0.82) rotate(16)" />

        <!-- Franja sur detrás de Administrativos (y=520..580) -->
        <use href="#filamentos-borde" transform="translate(344, 527)" />
        <use href="#macolla-densa-a" transform="translate(334, 544) scale(0.94)" />
        <use href="#roca-laja-estratificada" transform="translate(382, 550) scale(0.98) rotate(6)" />
        <use href="#gravilla-caliza" transform="translate(410, 540)" />
        <use href="#macolla-densa-b" transform="translate(486, 542) scale(0.92)" />
        <use href="#arbusto-flor" transform="translate(504, 538) scale(0.8) rotate(-12)" />
        <use href="#roca-canto-meteorizado" transform="translate(546, 552) scale(1.0) rotate(-14)" />
        <use href="#macolla-espiga-brisa" transform="translate(572, 540) scale(0.92)" />
        <use href="#filamentos-borde" transform="translate(642, 527)" />
        <use href="#arbusto-flor" transform="translate(652, 538) scale(0.8) rotate(-10)" />
        <use href="#roca-arista-aguda" transform="translate(756, 548) scale(1.1) rotate(15)" />
        <use href="#helecho-campus" transform="translate(780, 538) scale(0.84)" />
        <use href="#roca-afloramiento-triple" transform="translate(812, 550) scale(0.96) rotate(-6)" />
        <use href="#filamentos-borde" transform="translate(908, 527)" />
        <use href="#arbusto-campus" transform="translate(918, 538) scale(0.8) rotate(14)" />
        <use href="#roca-bloque-fracturado" transform="translate(1006, 550) scale(0.98) rotate(12)" />
        <use href="#gravilla-caliza" transform="translate(1030, 542) rotate(-20)" />
        <use href="#roca-laja-estratificada" transform="translate(1114, 550) scale(0.9) rotate(-9)" />

        <!-- Bolsillos orientales (rocas y macollas de base) -->
        <use href="#macolla-densa-a" transform="translate(1148, 58) scale(0.86)" />
        <use href="#roca-bloque-fracturado" transform="translate(1152, 108) scale(0.82) rotate(26)" />
        <use href="#macolla-espiga-brisa" transform="translate(1154, 132) scale(0.82)" />
        <use href="#macolla-densa-b" transform="translate(1194, 222) scale(0.68) rotate(90)" />
        <use href="#roca-arista-aguda" transform="translate(1194, 284) scale(0.72) rotate(86)" />
        <use href="#macolla-espiga-brisa" transform="translate(1194, 346) scale(0.68) rotate(-90)" />
        <use href="#macolla-espiga-brisa" transform="translate(1152, 442) scale(0.82)" />
        <use href="#roca-canto-meteorizado" transform="translate(1152, 470) scale(0.82) rotate(-20)" />
        <use href="#macolla-densa-a" transform="translate(1148, 514) scale(0.86)" />

        <!-- ESTRATO SUPERIOR ARBÓREO: copas clásicas redondeadas y frondosas de árbol de pimiento por encima del sotobosque -->
        <g id="copas-arboles-pimiento">
          <!-- Hombro noroccidental -->
          <use href="#arbol-pimiento-a" transform="translate(272, 36) scale(1.05) rotate(8)" />
          <use href="#arbol-pimiento-b" transform="translate(274, 114) scale(0.96) rotate(-18)" />
          <use href="#arbol-pimiento-joven" transform="translate(262, 168) scale(0.92) rotate(24)" />

          <!-- Dosel norte (encuadrado en y=24..26 para lucir la copa redondeada completa sin recortes) -->
          <use href="#arbol-pimiento-a" transform="translate(432, 24) scale(0.98) rotate(-10)" />
          <use href="#arbol-pimiento-joven" transform="translate(524, 25) scale(1.02) rotate(26)" />
          <use href="#arbol-pimiento-c" transform="translate(622, 24) scale(0.96) rotate(12)" />
          <use href="#arbol-pimiento-b" transform="translate(806, 24) scale(0.98) rotate(-8)" />
          <use href="#arbol-pimiento-a" transform="translate(896, 24) scale(0.96) rotate(28)" />
          <use href="#arbol-pimiento-c" transform="translate(1014, 24) scale(0.94) rotate(-16)" />
          <use href="#palmera-campus" transform="translate(1152, 23) scale(0.98) rotate(15)" />

          <!-- Pimientos jóvenes compactos en la jardinera de la isla central -->
          <use href="#arbol-pimiento-joven" transform="translate(662, 333) scale(0.58) rotate(18)" />
          <use href="#arbol-pimiento-joven" transform="translate(906, 333) scale(0.56) rotate(-24)" />

          <!-- Hombro suroccidental -->
          <use href="#arbol-pimiento-b" transform="translate(280, 464) scale(0.96) rotate(-14)" />
          <use href="#arbol-pimiento-a" transform="translate(268, 540) scale(1.06) rotate(-10)" />

          <!-- Dosel sur (encuadrado en y=549..551 para lucir copas clásicas completas) -->
          <use href="#arbol-pimiento-a" transform="translate(442, 550) scale(1.02) rotate(16)" />
          <use href="#arbol-pimiento-joven" transform="translate(604, 548) scale(1.06) rotate(-22)" />
          <use href="#arbol-pimiento-c" transform="translate(702, 550) scale(1.0) rotate(-12)" />
          <use href="#arbol-pimiento-b" transform="translate(866, 550) scale(1.02) rotate(18)" />
          <use href="#palmera-campus" transform="translate(958, 548) scale(1.0) rotate(-22)" />
          <use href="#arbol-pimiento-a" transform="translate(1066, 550) scale(0.98) rotate(-28)" />
          <use href="#arbol-pimiento-joven" transform="translate(1156, 551) scale(1.0) rotate(-15)" />

          <!-- Bolsillos orientales -->
          <use href="#arbol-pimiento-b" transform="translate(1172, 78) scale(0.88) rotate(18)" />
          <use href="#arbol-pimiento-joven" transform="translate(1178, 122) scale(0.92) rotate(-26)" />
          <use href="#arbol-pimiento-joven" transform="translate(1176, 452) scale(0.92) rotate(22)" />
          <use href="#arbol-pimiento-a" transform="translate(1172, 498) scale(0.88) rotate(-14)" />
        </g>
      </g>

      <!-- Caseta de vigilancia arquitectónica en planta cenital (coherente con los autos, motos y talanquera) -->
      <g id="caseta-porteria" transform="translate(186, 126)">
        <!-- Canalización subterránea de control hacia la talanquera motorizada (235, 206) -->
        <path
          d="M 28 34 L 42 54 L 49 74"
          fill="none"
          stroke="#64748b"
          stroke-width="2"
          stroke-dasharray="3.5 2.5"
          opacity="0.75"
        />

        <!-- Sombra arquitectónica proyectada hacia el sureste (sol NO 315°) -->
        <polygon
          points="-34,-30 34,-30 40,-24 40,24 28,36 -34,36"
          fill="#0f172a"
          opacity="0.32"
          transform="translate(8, 9)"
        />

        <!-- Plinto perimetral de concreto arquitectónico con ochava hacia el carril de acceso -->
        <polygon
          points="-38,-34 36,-34 42,-28 42,26 28,40 -38,40"
          fill="#cbd5e1"
          stroke="#64748b"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
        <!-- Juntas de dilatación de la loseta perimetral -->
        <line x1="-38" y1="0" x2="42" y2="0" stroke="#94a3b8" stroke-width="0.7" opacity="0.7" />
        <line x1="0" y1="-34" x2="0" y2="40" stroke="#94a3b8" stroke-width="0.7" opacity="0.7" />

        <!-- Franja podotáctil amarilla de seguridad frente a la calzada vehicular -->
        <polyline
          points="-32,37 26,37 39,24"
          fill="none"
          stroke="#eab308"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Tapete de acceso peatonal occidental y barrido de puerta arquitectónica en planta -->
        <rect x="-37" y="-8" width="6" height="16" rx="1" fill="#334155" />
        <path d="M -31,-8 A 12,12 0 0 0 -43,4 L -31,4 Z" fill="#94a3b8" fill-opacity="0.32" stroke="#475569" stroke-width="0.8" stroke-dasharray="2 1.5" />

        <!-- Ventanal panorámico achaflanado de observación (orientado a la talanquera y al ingreso) -->
        <polygon
          points="-26,20 20,20 31,9 31,-18 36,-14 36,13 23,26 -26,26"
          fill="#0f172a"
          stroke="#1e293b"
          stroke-width="1"
          stroke-linejoin="round"
        />
        <polygon
          points="-24,21 20,21 30,11 30,-15 34.5,-12 34.5,12.5 22.5,24.5 -24,24.5"
          fill="#38bdf8"
          fill-opacity="0.78"
        />
        <!-- Destellos oblicuos de vidrio laminado y montantes de aluminio -->
        <line x1="-12" y1="21" x2="-8" y2="24.5" stroke="#e0f2fe" stroke-width="1.6" />
        <line x1="6" y1="21" x2="10" y2="24.5" stroke="#e0f2fe" stroke-width="1.6" />
        <line x1="25" y1="16" x2="29" y2="19" stroke="#bae6fd" stroke-width="1.6" />
        <line x1="30.5" y1="-2" x2="34.5" y2="1" stroke="#e0f2fe" stroke-width="1.5" />
        <line x1="0" y1="20" x2="0" y2="26" stroke="#0f172a" stroke-width="1.3" />
        <line x1="20" y1="20" x2="23" y2="26" stroke="#0f172a" stroke-width="1.3" />
        <line x1="30" y1="10" x2="36" y2="13" stroke="#0f172a" stroke-width="1.3" />

        <!-- Consola interior de monitoreo visible tras el cristal panorámico -->
        <polygon points="-18,15 17,15 26,6 26,-8 29,-8 29,8 19,18 -18,18" fill="#1e293b" />
        <rect x="6" y="15.4" width="7" height="2" rx="0.6" fill="#22c55e" />
        <rect x="-6" y="15.4" width="6" height="2" rx="0.6" fill="#facc15" />

        <!-- Cubierta arquitectónica termoacústica con junta alzada y alero institucional -->
        <polygon
          points="-31,-28 27,-28 31,-24 31,10 19,22 -31,22"
          fill="url(#cubierta-caseta-grad)"
          stroke="#334155"
          stroke-width="1.6"
          stroke-linejoin="round"
        />
        <!-- Cenefa institucional verde Unisucre en el borde suroriental de la cubierta -->
        <polyline
          points="-30,20.2 18.5,20.2 29.2,9.5 29.2,-23"
          fill="none"
          stroke="#15803d"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Costuras metálicas de la cubierta (standing seam) -->
        <line x1="-18" y1="-26.5" x2="-18" y2="18.5" stroke="#cbd5e1" stroke-width="1" />
        <line x1="-6" y1="-26.5" x2="-6" y2="18.5" stroke="#cbd5e1" stroke-width="1" />
        <line x1="6" y1="-26.5" x2="6" y2="18.5" stroke="#cbd5e1" stroke-width="1" />
        <line x1="18" y1="-26.5" x2="18" y2="18.5" stroke="#cbd5e1" stroke-width="1" />

        <!-- Unidad condensadora de aire acondicionado en azotea (esquina NO) -->
        <g transform="translate(-19, -17)">
          <rect x="-7.5" y="-5.5" width="16.5" height="11.5" rx="1.8" fill="#0f172a" opacity="0.22" transform="translate(1.8, 2)" />
          <rect x="-7.5" y="-5.5" width="16.5" height="11.5" rx="1.8" fill="#f1f5f9" stroke="#475569" stroke-width="1" />
          <circle cx="-1.5" cy="0.2" r="4.1" fill="#1e293b" stroke="#64748b" stroke-width="0.6" />
          <line x1="-4.4" y1="-2.6" x2="1.4" y2="3" stroke="#94a3b8" stroke-width="0.9" />
          <line x1="1.4" y1="-2.6" x2="-4.4" y2="3" stroke="#94a3b8" stroke-width="0.9" />
          <circle cx="-1.5" cy="0.2" r="1.1" fill="#cbd5e1" />
          <line x1="5.2" y1="-3.5" x2="5.2" y2="3.8" stroke="#64748b" stroke-width="0.8" />
          <line x1="7" y1="-3.5" x2="7" y2="3.8" stroke="#64748b" stroke-width="0.8" />
        </g>

        <!-- Domo CCTV y brazo orientados hacia la talanquera + baliza operativa -->
        <g transform="translate(27, 22)">
          <line x1="-3" y1="-3" x2="4.5" y2="4.5" stroke="#334155" stroke-width="2.2" stroke-linecap="round" />
          <circle cx="5" cy="5" r="3.4" fill="#f8fafc" stroke="#1e293b" stroke-width="0.9" />
          <circle cx="5.6" cy="5.6" r="1.7" fill="#0f172a" />
          <circle cx="6.1" cy="6.1" r="0.65" fill="#38bdf8" />
        </g>
        <circle cx="24" cy="-22" r="2.5" fill="#0f172a" />
        <circle cx="24" cy="-22" r="1.5" fill="#22c55e" />

        <!-- Bolardos de protección vial en la esquina sureste -->
        <circle cx="38" cy="31" r="2.6" fill="#0f172a" stroke="#facc15" stroke-width="1.3" />
        <circle cx="29" cy="39" r="2.6" fill="#0f172a" stroke="#facc15" stroke-width="1.3" />

        <!-- Placa identificadora cenital de alta legibilidad -->
        <rect x="-25" y="-4" width="46" height="14" rx="3" fill="#0f172a" stroke="#475569" stroke-width="1" />
        <text
          x="-2"
          y="3.2"
          fill="#f8fafc"
          font-size="7.4"
          font-weight="800"
          font-family="'Chakra Petch', 'Barlow', sans-serif"
          text-anchor="middle"
          dominant-baseline="central"
          letter-spacing="0.6"
        >
          PORTERÍA
        </text>
      </g>

      <!-- Poste receptor sur de la talanquera -->
      <rect x="229" y="346" width="12" height="14" rx="2" fill="#475569" stroke="#1e293b" stroke-width="1" />

      <!-- Bordillo interior de separación entre Docentes y la jardinera sabanera de la isla central -->
      <g id="andenes-estructurales-filas" pointer-events="none">
        <line x1="316" y1="322" x2="1134" y2="322" stroke="#cbd5e1" stroke-width="1.8" />
      </g>

      <!-- Talanquera vehicular motorizada -->
      <g id="talanquera-unisucre" transform="translate(235, 206)">
        <rect x="-13" y="-26" width="26" height="34" rx="4" fill="#475569" stroke="#1e293b" stroke-width="1.5" />
        <rect x="-7" y="-20" width="14" height="10" rx="2" fill="#0f172a" />
        <circle
          cx="0"
          cy="-15"
          r="3.4"
          :fill="bloqueada || talanquera === 'cerrada' || talanquera === 'bloqueada'
            ? '#dc2626'
            : talanquera === 'cerrando'
              ? '#facc15'
              : '#22c55e'"
        />
        <g :transform="`rotate(${barrierAngle}, 0, 0)`" class="transition-transform duration-500 ease-out">
          <rect x="-4" y="0" width="8" height="142" rx="3" fill="#ffffff" stroke="#b91c1c" stroke-width="1" />
          <rect x="-4" y="16" width="8" height="18" fill="#dc2626" />
          <rect x="-4" y="48" width="8" height="18" fill="#dc2626" />
          <rect x="-4" y="80" width="8" height="18" fill="#dc2626" />
          <rect x="-4" y="112" width="8" height="18" fill="#dc2626" />
          <circle cx="0" cy="138" r="3.5" fill="#ffffff" stroke="#dc2626" stroke-width="0.8" />
          <g v-if="bloqueada" transform="translate(0, 71)">
            <rect x="-44" y="-10.5" width="88" height="21" rx="3" fill="#991b1b" stroke="#ffffff" stroke-width="1.5" />
            <text x="0" y="3.5" fill="#ffffff" font-size="8.5" font-weight="800" font-family="'Chakra Petch', sans-serif" text-anchor="middle">BLOQUEADA</text>
          </g>
        </g>
        <circle cx="0" cy="0" r="6" fill="#334155" stroke="#f8fafc" stroke-width="1.5" />
      </g>

      <!-- Marcos de orientación sobre filas con cupo cuando alguna otra fila está llena -->
      <g id="marcos-filas-disponibles" pointer-events="none">
        <template v-for="zona in zonasMapa" :key="`marco-${zona.key}`">
          <g v-if="esZonaDestacada(zona.key)">
            <rect
              :x="CABEZAL_ZONA_X - 3"
              :y="zona.y - 3"
              width="824"
              height="102"
              rx="7"
              fill="#22c55e"
              fill-opacity="0.08"
              stroke="#4ade80"
              stroke-width="4.5"
              stroke-opacity="0.28"
            />
            <rect
              :x="CABEZAL_ZONA_X - 2"
              :y="zona.y - 2"
              width="822"
              height="100"
              rx="6"
              fill="none"
              stroke="#22c55e"
              stroke-width="2.2"
            />
          </g>
        </template>
      </g>

      <!-- Las 30 bahías individuales (70x96 px) con atenuación visual automática cuando su zona tiene 0 libres -->
      <g v-for="bahia in bahias" :key="bahia.id">
        <g
          :transform="`translate(${(bahia.posicion.x / 100) * ANCHO_PLANO}, ${(bahia.posicion.y / 100) * ALTO_PLANO})`"
          class="cursor-pointer group focus:outline-none"
          tabindex="0"
          role="button"
          :aria-label="`Plaza ${bahia.id}, ${descripcionEstado(bahia)}`"
          @click="$emit('select-espacio', bahia.id)"
          @keydown.enter.prevent="$emit('select-espacio', bahia.id)"
          @keydown.space.prevent="$emit('select-espacio', bahia.id)"
        >
          <title>{{ `Plaza ${bahia.id}: ${descripcionEstado(bahia)}` }}</title>

          <g :transform="`rotate(${bahia.posicion.rotacion})`">
            <!-- Superficie completa de la bahía (en zonas con 0 libres las ocupadas pasan a pizarra recesiva) -->
            <rect
              x="-48"
              y="-35"
              width="96"
              height="70"
              rx="3"
              :fill="estadoVisual(bahia) === 'LIBRE'
                ? '#113826'
                : estadoVisual(bahia) === 'EN_CAMINO'
                  ? '#383206'
                  : estadoVisual(bahia) === 'OCUPADO'
                    ? (esZonaAtenuada(bahia.estamento) ? '#151e2d' : '#351218')
                    : 'url(#patron-sin-dato)'"
              stroke="#0f172a"
              stroke-width="1.2"
            />

            <!-- Marco interior redundante de estado -->
            <rect
              x="-44"
              y="-31"
              width="88"
              height="62"
              rx="2"
              fill="none"
              :stroke="estadoVisual(bahia) === 'LIBRE'
                ? '#22c55e'
                : estadoVisual(bahia) === 'EN_CAMINO'
                  ? '#facc15'
                  : estadoVisual(bahia) === 'OCUPADO'
                    ? (esZonaAtenuada(bahia.estamento) ? '#334155' : '#f87171')
                    : '#94a3b8'"
              :stroke-width="estadoVisual(bahia) === 'EN_CAMINO' ? '1.7' : '1.45'"
              :stroke-dasharray="estadoVisual(bahia) === 'EN_CAMINO'
                ? '8 4'
                : estadoVisual(bahia) === 'SIN_DATO'
                  ? '4 4'
                  : undefined"
              :stroke-opacity="esZonaAtenuada(bahia.estamento) && estadoVisual(bahia) === 'OCUPADO'
                ? '0.52'
                : estadoVisual(bahia) === 'EN_CAMINO'
                  ? '0.9'
                  : '0.82'"
            />

            <!-- Demarcación termoplástica de bahía -->
            <path
              d="M 48 -35 L -48 -35 L -48 35 L 48 35"
              fill="none"
              :stroke="esZonaAtenuada(bahia.estamento) ? '#64748b' : '#ffffff'"
              stroke-width="2.3"
              stroke-linecap="round"
              stroke-linejoin="round"
              :opacity="esZonaAtenuada(bahia.estamento) ? '0.32' : '0.92'"
            />
            <line
              x1="48"
              y1="-38.5"
              x2="48"
              y2="-31.5"
              :stroke="esZonaAtenuada(bahia.estamento) ? '#64748b' : '#ffffff'"
              stroke-width="2.3"
              stroke-linecap="round"
              :opacity="esZonaAtenuada(bahia.estamento) ? '0.32' : '0.92'"
            />
            <line
              x1="48"
              y1="31.5"
              x2="48"
              y2="38.5"
              :stroke="esZonaAtenuada(bahia.estamento) ? '#64748b' : '#ffffff'"
              stroke-width="2.3"
              stroke-linecap="round"
              :opacity="esZonaAtenuada(bahia.estamento) ? '0.32' : '0.92'"
            />

            <!-- Topellanta arquitectónico neutro en caucho/concreto -->
            <g transform="translate(-42.5, 0)" :opacity="esZonaAtenuada(bahia.estamento) ? '0.55' : '1'">
              <rect x="-1.8" y="-19" width="4.8" height="38" rx="1.4" fill="#020617" opacity="0.45" />
              <rect x="-2.6" y="-17.5" width="4.4" height="35" rx="1.4" fill="#0f172a" stroke="#475569" stroke-width="0.9" />
            </g>

            <!-- Vehículo estacionado en bahías ocupadas (atenuado cuando toda la fila tiene 0 libres) -->
            <g
              v-if="estadoVisual(bahia) === 'OCUPADO'"
              transform="translate(13, 0)"
              :opacity="esZonaAtenuada(bahia.estamento) ? '0.26' : '1'"
            >
              <g v-if="esBahiaMoto(bahia.id)" transform="scale(0.96)">
                <MotoFigura
                  :modelo="getMotoModelo(bahia.id)"
                  :color="getVehiculoColor(bahia.id)"
                  :faro="false"
                  :pata="true"
                />
              </g>
              <g v-else transform="scale(0.96)">
                <AutoFigura
                  :color="getVehiculoColor(bahia.id)"
                  :tipo="getAutoTipo(bahia.id)"
                  :faro="false"
                />
              </g>
            </g>

            <!-- Rótulo textual redundante de alta legibilidad para LIBRE, EN CAMINO y SIN DATO -->
            <g
              v-else
              :transform="`translate(12.5, 0) rotate(${-bahia.posicion.rotacion})`"
            >
              <text
                v-if="estadoVisual(bahia) === 'LIBRE'"
                x="0"
                y="0"
                fill="#bbf7d0"
                font-size="15"
                font-weight="800"
                font-family="'Chakra Petch', 'Barlow', sans-serif"
                text-anchor="middle"
                dominant-baseline="central"
                letter-spacing="0.5"
              >
                LIBRE
              </text>
              <g v-else-if="estadoVisual(bahia) === 'EN_CAMINO'">
                <text
                  x="0"
                  y="-6.5"
                  fill="#fef08a"
                  font-size="11.5"
                  font-weight="800"
                  font-family="'Chakra Petch', 'Barlow', sans-serif"
                  text-anchor="middle"
                  dominant-baseline="central"
                  letter-spacing="0.4"
                >
                  EN
                </text>
                <text
                  x="0"
                  y="6.5"
                  fill="#fef08a"
                  font-size="11.5"
                  font-weight="800"
                  font-family="'Chakra Petch', 'Barlow', sans-serif"
                  text-anchor="middle"
                  dominant-baseline="central"
                  letter-spacing="0.3"
                >
                  CAMINO
                </text>
              </g>
              <g v-else>
                <text
                  x="0"
                  y="-6.5"
                  fill="#f8fafc"
                  font-size="12"
                  font-weight="800"
                  font-family="'Chakra Petch', 'Barlow', sans-serif"
                  text-anchor="middle"
                  dominant-baseline="central"
                  letter-spacing="0.4"
                >
                  SIN
                </text>
                <text
                  x="0"
                  y="6.5"
                  fill="#f8fafc"
                  font-size="12"
                  font-weight="800"
                  font-family="'Chakra Petch', 'Barlow', sans-serif"
                  text-anchor="middle"
                  dominant-baseline="central"
                  letter-spacing="0.4"
                >
                  DATO
                </text>
              </g>
            </g>

            <!-- Placa de código de plaza en capa superior (contraste >= 12.02:1 incluso en filas atenuadas) -->
            <g :transform="`translate(-29, 0) rotate(${-bahia.posicion.rotacion})`">
              <rect
                x="-20"
                y="-10"
                width="40"
                height="20"
                rx="3.5"
                fill="#0f172a"
                :stroke="estadoVisual(bahia) === 'LIBRE'
                  ? '#22c55e'
                  : estadoVisual(bahia) === 'EN_CAMINO'
                    ? '#facc15'
                    : estadoVisual(bahia) === 'OCUPADO'
                      ? (esZonaAtenuada(bahia.estamento) ? '#334155' : '#f87171')
                      : '#cbd5e1'"
                stroke-width="1.25"
              />
              <text
                x="0"
                y="0.5"
                :fill="esZonaAtenuada(bahia.estamento) && estadoVisual(bahia) === 'OCUPADO' ? '#cbd5e1' : '#ffffff'"
                font-size="12.5"
                font-weight="800"
                font-family="'JetBrains Mono', 'Barlow', monospace"
                text-anchor="middle"
                dominant-baseline="central"
                letter-spacing="0.4"
              >
                {{ bahia.id }}
              </text>
            </g>

            <!-- Baliza lineal ancha en el umbral de acceso a la bahía -->
            <rect
              x="41"
              y="-23"
              width="5"
              height="46"
              rx="2"
              :fill="estadoVisual(bahia) === 'LIBRE'
                ? '#22c55e'
                : estadoVisual(bahia) === 'EN_CAMINO'
                  ? '#facc15'
                  : estadoVisual(bahia) === 'OCUPADO'
                    ? (esZonaAtenuada(bahia.estamento) ? '#475569' : '#f87171')
                    : '#94a3b8'"
            />

            <!-- Resaltado de foco y cursor de alto contraste -->
            <rect
              x="-48"
              y="-35"
              width="96"
              height="70"
              rx="3"
              fill="none"
              stroke="#f8fafc"
              stroke-width="2.6"
              class="opacity-0 group-hover:opacity-85 group-focus-visible:opacity-100 transition-opacity pointer-events-none"
            />
          </g>
        </g>
      </g>

      <!-- Cabezales arquitectónicos de fila: únicamente nombre del estamento y rango de bahías -->
      <g id="rotulos-sectores" pointer-events="none">
        <g
          v-for="zona in zonasMapa"
          :key="zona.key"
          :transform="`translate(${CABEZAL_ZONA_X}, ${zona.y})`"
        >
          <rect
            x="0"
            y="0"
            :width="CABEZAL_ZONA_ANCHO"
            height="96"
            rx="4"
            :fill="zona.tieneCupo && !esZonaAtenuada(zona.key) ? '#092918' : '#0f172a'"
            :stroke="zona.tieneCupo && !esZonaAtenuada(zona.key)
              ? '#22c55e'
              : (esZonaAtenuada(zona.key) ? '#334155' : '#64748b')"
            :stroke-width="esZonaDestacada(zona.key) ? '2.2' : '1.4'"
          />
          <rect
            x="0"
            y="0"
            width="5.5"
            height="96"
            rx="2"
            :fill="zona.tieneCupo && !esZonaAtenuada(zona.key)
              ? '#22c55e'
              : (zona.agotada && !hayCupoGlobal ? '#dc2626' : '#475569')"
          />
          <text
            x="61.5"
            y="35"
            :fill="zona.tieneCupo && !esZonaAtenuada(zona.key) ? '#ffffff' : '#cbd5e1'"
            :font-size="zona.label.length > 12 ? '11.8' : '13.2'"
            font-weight="800"
            font-family="'Chakra Petch', 'Barlow', sans-serif"
            text-anchor="middle"
            dominant-baseline="central"
            letter-spacing="0.2"
          >
            {{ zona.label }}
          </text>
          <line
            x1="14"
            y1="50"
            x2="108"
            y2="50"
            :stroke="zona.tieneCupo && !esZonaAtenuada(zona.key) ? '#14532d' : '#1e293b'"
            stroke-width="1.2"
          />
          <text
            x="61.5"
            y="65"
            :fill="zona.tieneCupo && !esZonaAtenuada(zona.key) ? '#dcfce7' : '#94a3b8'"
            font-size="11.8"
            font-weight="700"
            font-family="'JetBrains Mono', monospace"
            text-anchor="middle"
            dominant-baseline="central"
            letter-spacing="0.2"
          >
            {{ zona.rango }}
          </text>
        </g>
      </g>

      <!-- Vehículos detectados en circulación con sentido y plaza explícitos -->
      <g v-for="anim in animacionesVisibles" :key="anim.id" pointer-events="none">
        <g
          :transform="`translate(${(anim.posicionActual.x / 100) * ANCHO_PLANO}, ${(anim.posicionActual.y / 100) * ALTO_PLANO})`"
          filter="url(#shadow-unisucre)"
        >
          <g :transform="`rotate(${anim.posicionActual.rotacion})`">
            <g v-if="esAnimacionAuto(anim)" transform="scale(0.84)">
              <AutoFigura
                :color="anim.color ?? '#e2e8f0'"
                :tipo="getAutoTipo(anim.espacioId)"
                :faro="anim.etapa !== 'esperando'"
              />
            </g>
            <MotoFigura
              v-else
              :modelo="anim.modelo ?? 'clasica'"
              :color="anim.color ?? '#e2e8f0'"
              :cascoColor="anim.cascoColor ?? '#f8fafc'"
              :faro="anim.etapa !== 'esperando'"
              :pata="false"
              etiqueta=""
            />
          </g>
        </g>

        <!-- Etiqueta horizontal de telemetría vial con flecha de sentido -->
        <g :transform="`translate(${posEtiquetaVial(anim).x}, ${posEtiquetaVial(anim).y})`">
          <rect
            :x="-posEtiquetaVial(anim).ancho / 2"
            y="-10.5"
            :width="posEtiquetaVial(anim).ancho"
            height="21"
            rx="4"
            fill="#0f172a"
            :stroke="bordeEtiquetaVial(anim)"
            stroke-width="1.35"
          />
          <text
            x="0"
            y="0.5"
            fill="#ffffff"
            font-size="11"
            font-weight="800"
            font-family="'JetBrains Mono', monospace"
            text-anchor="middle"
            dominant-baseline="central"
            letter-spacing="0.25"
          >
            {{ etiquetaVehiculoVial(anim) }}
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
/* Brisa sutil asíncrona sobre los filamentos de hierba (solo transform en compositor, desactivada en reducir-movimiento / prefers-reduced-motion) */
.brisa-activa .filamentos-brisa-a {
  transform-origin: 0px 2px;
  animation: mecer-filamentos-a 5.4s ease-in-out infinite alternate;
}

.brisa-activa .filamentos-brisa-b {
  transform-origin: 0px 2px;
  animation: mecer-filamentos-b 6.8s ease-in-out -1.9s infinite alternate;
}

.brisa-activa .filamentos-brisa-c {
  transform-origin: 0px 2px;
  animation: mecer-filamentos-c 4.7s ease-in-out -3.1s infinite alternate;
}

@keyframes mecer-filamentos-a {
  0% {
    transform: rotate(-1.6deg) skewX(-1.2deg);
  }
  100% {
    transform: rotate(2.4deg) skewX(1.8deg);
  }
}

@keyframes mecer-filamentos-b {
  0% {
    transform: rotate(1.4deg) skewX(1deg);
  }
  100% {
    transform: rotate(-2.1deg) skewX(-1.6deg);
  }
}

@keyframes mecer-filamentos-c {
  0% {
    transform: rotate(-1.2deg) skewX(-0.8deg);
  }
  100% {
    transform: rotate(2.6deg) skewX(2.1deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .brisa-activa .filamentos-brisa-a,
  .brisa-activa .filamentos-brisa-b,
  .brisa-activa .filamentos-brisa-c {
    animation: none;
  }
}
</style>

