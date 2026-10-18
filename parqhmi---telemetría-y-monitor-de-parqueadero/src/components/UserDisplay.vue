<script setup lang="ts">
import { computed } from 'vue';
import type { EspacioInfo, AnimacionMotoActiva, EstadoTalanquera, NotificacionHMI } from '../types/parqueadero';
import ParkingMap from './ParkingMap.vue';
import UnisucreLogo from './UnisucreLogo.vue';

const props = withDefaults(
  defineProps<{
    espacios: EspacioInfo[];
    disponiblesCount: number;
    totalEspacios: number;
    barrierState: EstadoTalanquera;
    talanqueraBloqueada: boolean;
    animacionActiva?: AnimacionMotoActiva | null;
    animacionesActivas?: AnimacionMotoActiva[];
    notificacionActual: NotificacionHMI | null;
    horaActual: string;
    fechaActual: string;
  }>(),
  {
    animacionActiva: null,
    animacionesActivas: () => [],
  }
);

defineEmits<{
  (e: 'abrirOperador'): void;
  (e: 'selectEspacio', id: string): void;
}>();

const isFull = computed(() => props.disponiblesCount === 0);
const hayMotoEsperando = computed(() => props.animacionesActivas.some((a) => a.etapa === 'esperando'));
</script>

<template>
  <div class="flex flex-col gap-4 max-w-6xl w-full mx-auto">
    
    <!-- ENCABEZADO INSTITUCIONAL UNIVERSIDAD DE SUCRE -->
    <header class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
      <div class="flex items-center gap-3.5">
        <!-- Escudo oficial de la Universidad de Sucre -->
        <UnisucreLogo size="52" />
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-emerald-950 uppercase">
              PARQUEADERO DE MOTOCICLETAS UNIVERSIDAD DE SUCRE
            </h1>
          </div>
          <p class="text-xs text-slate-500 font-medium mt-0.5">
            Campus Puerta Roja · Control de acceso automatizado y telemetría de bahías
          </p>
        </div>
      </div>

      <!-- Pantalla de Disponibilidad del Campus -->
      <div class="flex items-center gap-4 sm:gap-6 self-start md:self-auto">
        <div
          class="px-5 py-2.5 rounded-xl border flex flex-col items-center justify-center transition-all min-w-[210px] shadow-xs"
          :class="
            talanqueraBloqueada
              ? 'bg-red-50 border-red-300 text-red-900'
              : isFull
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          "
        >
          <div class="flex items-center gap-1.5">
            <span
              class="w-2.5 h-2.5 rounded-full"
              :class="
                talanqueraBloqueada
                  ? 'bg-red-600 animate-pulse'
                  : isFull
                  ? 'bg-amber-600'
                  : 'bg-emerald-600 animate-pulse'
              "
            />
            <span
              class="text-[11px] tracking-wider uppercase font-bold"
              :class="
                talanqueraBloqueada
                  ? 'text-red-700'
                  : isFull
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              "
            >
              {{ talanqueraBloqueada ? 'PORTERÍA BLOQUEADA' : isFull ? 'AFORO COMPLETO' : 'PLAZAS DISPONIBLES' }}
            </span>
          </div>

          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-3xl font-extrabold tracking-tight font-tech">
              {{ talanqueraBloqueada ? 'CERRADO' : disponiblesCount }}
            </span>
            <span v-if="!talanqueraBloqueada" class="text-xs font-semibold text-slate-500 font-mono">
              / {{ totalEspacios }} LIBRES
            </span>
          </div>
        </div>

        <!-- Reloj institucional -->
        <div class="hidden sm:flex flex-col text-right font-mono">
          <span class="text-base font-bold text-slate-800 tracking-wide">{{ horaActual }}</span>
          <span class="text-[11px] text-slate-500 font-semibold">{{ fechaActual }}</span>
        </div>
      </div>
    </header>

    <!-- BANNER DINÁMICO DE GUIADO VIAL AL CONDUCTOR -->
    <div
      class="rounded-xl p-3.5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
      :class="
        talanqueraBloqueada
          ? 'bg-red-50 border-red-300 text-red-900'
          : hayMotoEsperando
          ? 'bg-amber-50 border-amber-400 text-amber-950'
          : animacionActiva
          ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
          : isFull
          ? 'bg-amber-50 border-amber-300 text-amber-900'
          : 'bg-slate-50 border-slate-200 text-slate-800'
      "
    >
      <div class="flex items-center gap-3">
        <div
          class="w-3.5 h-3.5 rounded-full shrink-0"
          :class="
            talanqueraBloqueada
              ? 'bg-red-600 animate-pulse'
              : hayMotoEsperando
              ? 'bg-amber-500 animate-pulse'
              : animacionActiva
              ? 'bg-emerald-600 animate-pulse'
              : isFull
              ? 'bg-amber-500'
              : 'bg-emerald-600'
          "
        />
        <div>
          <div class="text-[11px] font-bold uppercase tracking-wider opacity-80">
            {{
              talanqueraBloqueada
                ? 'PORTERÍA UNISUCRE: ACCESO SUSPENDIDO'
                : hayMotoEsperando
                ? 'VEHÍCULO EN ESPERA FRENTE A TALANQUERA'
                : animacionActiva
                ? (animacionActiva.tipo === 'ingreso' ? 'INGRESO DESDE LA CALLE EXTERIOR' : 'SALIDA DEL CAMPUS')
                : isFull
                ? 'PARQUEADERO UNISUCRE COMPLETO'
                : 'ACCESO AL CAMPUS HABILITADO'
            }}
          </div>
          <div class="text-sm font-semibold">
            <template v-if="talanqueraBloqueada">
              Talanquera de portería cerrada por seguridad. Paso restringido hasta nueva indicación de vigilancia.
            </template>
            <template v-else-if="hayMotoEsperando">
              <span class="font-bold text-amber-800">Moto en espera:</span> Aguardando en portería a que se libere un puesto para levantar talanquera y asignar bahía.
            </template>
            <template v-else-if="animacionActiva && animacionActiva.tipo === 'ingreso'">
              ¡Bienvenido a la Universidad de Sucre! Diríjase a la bahía <span class="font-bold underline text-emerald-800">{{ animacionActiva.espacioId }}</span>
            </template>
            <template v-else-if="isFull">
              Todas las 10 bahías del campus están ocupadas. Espere autorización del vigilante.
            </template>
            <template v-else>
              Siga por la rampa de acceso desde la calle exterior. La talanquera se abrirá al detectar su moto.
            </template>
          </div>
        </div>
      </div>

      <div class="text-xs font-mono font-medium self-end sm:self-auto shrink-0">
        <span class="text-slate-500">TALANQUERA: </span>
        <strong :class="talanqueraBloqueada ? 'text-red-700' : 'text-emerald-700'">
          {{ talanqueraBloqueada ? 'BLOQUEADA' : barrierState.toUpperCase() }}
        </strong>
      </div>
    </div>

    <!-- BARRA INFORMATIVA DE PISTA Y CONEXIÓN VIAL -->
    <div class="flex items-center justify-between px-2 text-xs text-slate-600 flex-wrap gap-2">
      <div class="flex items-center gap-2">
        <span class="font-bold text-slate-800">CAMPUS PUERTA ROJA · UNIVERSIDAD DE SUCRE</span>
      </div>
      <div class="flex items-center gap-4 font-medium">
        <span class="flex items-center gap-1.5 text-emerald-700">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Bahía Libre
        </span>
        <span class="flex items-center gap-1.5 text-red-700">
          <span class="w-2.5 h-2.5 rounded-full bg-red-500" /> Bahía Ocupada
        </span>
      </div>
    </div>

    <!-- PLANO DEL PARQUEADERO (CALLE EXTERIOR, PORTERÍA Y 10 BAHÍAS) -->
    <ParkingMap
      :espacios="espacios"
      :animaciones-activas="animacionesActivas"
      :animacion-activa="animacionActiva"
      :barrier-state="barrierState"
      :talanquera-bloqueada="talanqueraBloqueada"
      @select-espacio="(id) => $emit('selectEspacio', id)"
    />

    <!-- TARJETAS DE LAS 10 PLAZAS DE MOTOS (E01 a E10) -->
    <div class="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 w-full">
      <div
        v-for="espacio in espacios"
        :key="espacio.id"
        class="bg-white border rounded-xl p-2.5 flex flex-col justify-between transition-colors shadow-xs min-w-0 min-h-[112px] overflow-hidden"
        :class="
          espacio.estado === 'LIBRE'
            ? 'border-emerald-300 bg-emerald-50/20'
            : espacio.estado === 'OCUPADO'
            ? 'border-red-300 bg-red-50/20'
            : 'border-slate-200'
        "
      >
        <div class="flex items-center justify-between gap-1">
          <span class="text-base font-extrabold text-slate-900 tracking-tight truncate">{{ espacio.id }}</span>
          <span
            class="w-2.5 h-2.5 rounded-full shrink-0 border border-white shadow-xs"
            :class="
              espacio.estado === 'LIBRE'
                ? 'bg-emerald-500'
                : espacio.estado === 'OCUPADO'
                ? 'bg-red-500'
                : 'bg-amber-400'
            "
          />
        </div>

        <div class="my-1 min-w-0">
          <div
            class="text-[10px] font-bold tracking-wide uppercase truncate"
            :class="
              espacio.estado === 'LIBRE'
                ? 'text-emerald-700'
                : espacio.estado === 'OCUPADO'
                ? 'text-red-700'
                : 'text-amber-700'
            "
          >
            {{ espacio.estado === 'LIBRE' ? 'Disponible' : espacio.estado === 'OCUPADO' ? 'Ocupada' : 'Sin Dato' }}
          </div>
          <div v-if="espacio.estado === 'OCUPADO' && espacio.placa" class="text-[11px] font-mono font-semibold text-slate-700 mt-0.5 truncate">
            {{ espacio.placa }}
          </div>
          <div v-else class="text-[11px] font-mono text-slate-400 mt-0.5">
            --
          </div>
        </div>

        <div class="text-[9px] text-slate-500 font-semibold truncate">
          {{ espacio.posicion.y < 50 ? 'Estudiantes' : 'Docentes' }}
        </div>
      </div>
    </div>

    <!-- BOTÓN DISCRETO PARA VIGILANCIA / OPERADOR DE CASETA -->
    <div class="flex items-center justify-end pt-1 px-1">
      <button
        type="button"
        @click="$emit('abrirOperador')"
        class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 shadow-xs transition-colors cursor-pointer text-xs font-semibold"
      >
        <span>Consola de Vigilancia / Operador</span>
      </button>
    </div>

  </div>
</template>
