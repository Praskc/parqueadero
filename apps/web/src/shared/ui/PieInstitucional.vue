<script setup lang="ts">
// Pie de página institucional oficial de la Universidad de Sucre (visible únicamente al desplazarse debajo del tablero).
// Métricas del parqueadero en tiempo real (no estáticas): alimentadas desde App.vue vía WebSocket.
import { computed } from "vue";

const props = defineProps<{
  ocupadas: number;
  disponibles: number;
  sinDato: number;
  total: number;
  conectado: boolean;
}>();

const ocupadasPct = computed(() =>
  props.total > 0 ? Math.round((props.ocupadas / props.total) * 100) : 0,
);
const libresPct = computed(() =>
  props.total > 0 ? Math.round((props.disponibles / props.total) * 100) : 0,
);
</script>

<template>
  <footer
    aria-label="Información institucional Universidad de Sucre"
    class="superficie-accesible w-full bg-[#184320] text-white border-t border-[#24592e] select-text"
  >
    <div class="max-w-[1280px] mx-auto px-6 pt-12 pb-20 sm:py-16 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 lg:gap-10 items-start">
      <!-- Columna 1: Escudo oficial, nombre institucional y NIT -->
      <div class="flex flex-col items-center text-center">
        <img
          src="/unisucre.webp"
          alt="Escudo oficial de la Universidad de Sucre"
          width="116"
          height="139"
          loading="lazy"
          decoding="async"
          class="w-[108px] sm:w-[116px] h-auto object-contain select-none [filter:drop-shadow(0_3px_8px_rgba(0,0,0,0.28))]"
        />
        <h2 class="mt-4 font-body font-bold text-xl text-[#f3e69f] leading-snug">
          Universidad de Sucre
        </h2>
        <p class="mt-1 text-sm text-white leading-relaxed">
          Institución de Educación Superior
        </p>
        <p class="text-sm text-white leading-relaxed tabular-nums">
          NIT: 892.200.323-9
        </p>
        <hr class="mt-5 w-full max-w-[240px] border-0 border-t border-white/80" aria-hidden="true" />
      </div>

      <!-- Columna 2: Contáctenos, correos, horario y dirección -->
      <div class="text-sm leading-relaxed min-w-0">
        <h2 class="font-body font-bold text-lg text-[#f3e69f]">
          Contáctenos
        </h2>

        <div class="mt-3">
          <p class="font-bold text-white">Correos:</p>
          <div class="flex flex-col items-start">
            <a
              href="mailto:atencionalciudadano@unisucre.edu.co"
              class="min-h-[44px] inline-flex items-center text-white hover:text-[#f3e69f] underline-offset-4 hover:underline break-all rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e69f]"
            >
              atencionalciudadano@unisucre.edu.co
            </a>
            <a
              href="mailto:notificacionesjudiciales@unisucre.edu.co"
              class="min-h-[44px] inline-flex items-center text-white hover:text-[#f3e69f] underline-offset-4 hover:underline break-all rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e69f]"
            >
              notificacionesjudiciales@unisucre.edu.co
            </a>
          </div>
        </div>

        <div class="mt-3">
          <p class="font-bold text-white inline-flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 shrink-0 text-white" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="currentColor" />
              <path d="M12 6.5v5.5l3.5 2.2" fill="none" stroke="#184320" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>Horario:</span>
          </p>
          <p class="text-white mt-0.5">Lunes a Viernes,</p>
          <p class="text-white tabular-nums">8:00 a.m. - 12:00 m.</p>
          <p class="text-white tabular-nums">2:00 p.m. - 6:00 p.m.</p>
        </div>

        <div class="mt-4">
          <p class="font-bold text-white inline-flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 shrink-0 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5Z" />
            </svg>
            <span>Dirección:</span>
          </p>
          <p class="text-white mt-0.5">Cra 28 # 5-267 Barrio Puerta Roja, Sucre</p>
          <p class="text-white">Colombia - Sincelejo</p>
        </div>
      </div>

      <!-- Columna 3: Estado del parqueadero (tiempo real, no estático) -->
      <div class="text-sm leading-relaxed min-w-0">
        <div>
          <h2 class="font-body font-bold text-lg text-[#f3e69f]">
            Estado del parqueadero
          </h2>
          <ul class="mt-3 space-y-0.5 text-white tabular-nums">
            <li>
              <span class="inline-block w-20">Ocupadas:</span>
              <span>{{ ocupadas }} / {{ total }} ({{ ocupadasPct }}%)</span>
            </li>
            <li>
              <span class="inline-block w-20">Disponibles:</span>
              <span>{{ disponibles }} ({{ libresPct }}%)</span>
            </li>
            <li>
              <span class="inline-block w-20">Sin dato:</span>
              <span>{{ sinDato }}</span>
            </li>
            <li>
              <span class="inline-block w-20">Conectado:</span>
              <span>{{ props.conectado ? "SÍ" : "NO" }}</span>
            </li>
          </ul>
        </div>

        <div class="mt-6">
          <h2 class="font-body font-bold text-lg text-[#f3e69f]">
            Síguenos
          </h2>
          <div class="mt-2 flex items-center gap-1.5 -ml-2">
            <a
              href="https://x.com/Unisucre"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Universidad de Sucre en X"
              title="X"
              class="w-[44px] h-[44px] rounded-xl inline-flex items-center justify-center text-white hover:text-[#f3e69f] hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e69f]"
            >
              <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            <a
              href="https://www.facebook.com/Unisucreco/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Universidad de Sucre en Facebook"
              title="Facebook"
              class="w-[44px] h-[44px] rounded-xl inline-flex items-center justify-center text-white hover:text-[#f3e69f] hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e69f]"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
              </svg>
            </a>

            <a
              href="https://www.instagram.com/unisucreco/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Universidad de Sucre en Instagram"
              title="Instagram"
              class="w-[44px] h-[44px] rounded-xl inline-flex items-center justify-center text-white hover:text-[#f3e69f] hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e69f]"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>

            <a
              href="https://www.flickr.com/photos/unisucre/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Universidad de Sucre en Flickr"
              title="Flickr"
              class="w-[44px] h-[44px] rounded-xl inline-flex items-center justify-center text-white hover:text-[#f3e69f] hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e69f]"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3.5 11.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Zm7 0a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <!-- Columna 4: Reporte de errores por GitHub y correo institucional -->
      <div class="text-sm leading-relaxed min-w-0">
        <h2 class="font-body font-bold text-lg text-[#f3e69f]">
          ¿Encontró algún bug?
        </h2>
        <p class="mt-3 font-bold text-white">
          Contacte a:
        </p>
        <ul class="mt-1.5 flex flex-col gap-1">
          <li class="flex items-center gap-0.5 min-w-0">
            <a
              href="https://github.com/Praskc"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Esteban Eduardo Cotera Prasca en GitHub"
              title="GitHub: Praskc"
              class="min-h-[44px] min-w-0 pr-0.5 inline-flex items-center gap-1.5 text-white hover:text-[#f3e69f] underline-offset-4 hover:underline rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e69f]"
            >
              <span class="leading-snug">Esteban Eduardo Cotera Prasca</span>
              <svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.648.5.5 5.648.5 12c0 5.084 3.292 9.392 7.862 10.914.575.106.785-.25.785-.555 0-.274-.01-1-.016-1.963-3.198.695-3.873-1.541-3.873-1.541-.523-1.328-1.277-1.682-1.277-1.682-1.044-.714.079-.699.079-.699 1.154.081 1.762 1.185 1.762 1.185 1.026 1.758 2.692 1.25 3.348.956.104-.743.401-1.25.729-1.538-2.553-.29-5.238-1.277-5.238-5.682 0-1.255.448-2.281 1.184-3.085-.119-.29-.513-1.459.112-3.042 0 0 .965-.309 3.162 1.179a11.02 11.02 0 0 1 2.88-.387c.977.005 1.961.132 2.88.387 2.195-1.488 3.159-1.179 3.159-1.179.627 1.583.233 2.752.114 3.042.738.804 1.183 1.83 1.183 3.085 0 4.416-2.69 5.388-5.252 5.673.413.356.781 1.058.781 2.133 0 1.54-.014 2.782-.014 3.16 0 .308.207.667.792.554C20.211 21.388 23.5 17.082 23.5 12 23.5 5.648 18.352.5 12 .5Z" />
              </svg>
            </a>
            <a
              href="mailto:Esteban.Cotera@unisucrevirtual.edu.co"
              aria-label="Enviar correo a Esteban Eduardo Cotera Prasca (Esteban.Cotera@unisucrevirtual.edu.co)"
              title="Esteban.Cotera@unisucrevirtual.edu.co"
              class="enlace-icono-compacto group min-w-[44px] min-h-[44px] pl-1 pr-3.5 shrink-0 rounded inline-flex items-center justify-start text-white hover:text-[#f3e69f] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e69f]"
            >
              <svg class="w-[26px] h-[26px] p-1 rounded-md group-hover:bg-white/10 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
                <path d="m3.5 6.5 8.5 6 8.5-6" />
              </svg>
            </a>
          </li>

          <li class="flex items-center gap-0.5 min-w-0">
            <a
              href="https://github.com/pjms2214"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Pedro José Mercado Salazar en GitHub"
              title="GitHub: pjms2214"
              class="min-h-[44px] min-w-0 pr-0.5 inline-flex items-center gap-1.5 text-white hover:text-[#f3e69f] underline-offset-4 hover:underline rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e69f]"
            >
              <span class="leading-snug">Pedro José Mercado Salazar</span>
              <svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.648.5.5 5.648.5 12c0 5.084 3.292 9.392 7.862 10.914.575.106.785-.25.785-.555 0-.274-.01-1-.016-1.963-3.198.695-3.873-1.541-3.873-1.541-.523-1.328-1.277-1.682-1.277-1.682-1.044-.714.079-.699.079-.699 1.154.081 1.762 1.185 1.762 1.185 1.026 1.758 2.692 1.25 3.348.956.104-.743.401-1.25.729-1.538-2.553-.29-5.238-1.277-5.238-5.682 0-1.255.448-2.281 1.184-3.085-.119-.29-.513-1.459.112-3.042 0 0 .965-.309 3.162 1.179a11.02 11.02 0 0 1 2.88-.387c.977.005 1.961.132 2.88.387 2.195-1.488 3.159-1.179 3.159-1.179.627 1.583.233 2.752.114 3.042.738.804 1.183 1.83 1.183 3.085 0 4.416-2.69 5.388-5.252 5.673.413.356.781 1.058.781 2.133 0 1.54-.014 2.782-.014 3.16 0 .308.207.667.792.554C20.211 21.388 23.5 17.082 23.5 12 23.5 5.648 18.352.5 12 .5Z" />
              </svg>
            </a>
            <a
              href="mailto:Pedro.Mercado@unisucrevirtual.edu.co"
              aria-label="Enviar correo a Pedro José Mercado Salazar (Pedro.Mercado@unisucrevirtual.edu.co)"
              title="Pedro.Mercado@unisucrevirtual.edu.co"
              class="enlace-icono-compacto group min-w-[44px] min-h-[44px] pl-1 pr-3.5 shrink-0 rounded inline-flex items-center justify-start text-white hover:text-[#f3e69f] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e69f]"
            >
              <svg class="w-[26px] h-[26px] p-1 rounded-md group-hover:bg-white/10 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
                <path d="m3.5 6.5 8.5 6 8.5-6" />
              </svg>
            </a>
          </li>

          <li class="min-w-0">
            <a
              href="mailto:Angie.Torrecilla@unisucrevirtual.edu.co"
              aria-label="Enviar correo a Angie Torrecilla Pineda (Angie.Torrecilla@unisucrevirtual.edu.co)"
              title="Angie.Torrecilla@unisucrevirtual.edu.co"
              class="min-h-[44px] inline-flex items-center gap-1.5 text-white hover:text-[#f3e69f] underline-offset-4 hover:underline rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e69f]"
            >
              <span class="leading-snug">Angie Torrecilla Pineda</span>
              <svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
                <path d="m3.5 6.5 8.5 6 8.5-6" />
              </svg>
            </a>
          </li>

          <li class="min-w-0">
            <a
              href="mailto:Diego.Acosta@unisucrevirtual.edu.co"
              aria-label="Enviar correo a Diego Andrés Acosta Durán (Diego.Acosta@unisucrevirtual.edu.co)"
              title="Diego.Acosta@unisucrevirtual.edu.co"
              class="min-h-[44px] inline-flex items-center gap-1.5 text-white hover:text-[#f3e69f] underline-offset-4 hover:underline rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3e69f]"
            >
              <span class="leading-snug">Diego Andrés Acosta Durán</span>
              <svg class="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
                <path d="m3.5 6.5 8.5 6 8.5-6" />
              </svg>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </footer>
</template>
