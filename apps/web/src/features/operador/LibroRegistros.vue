<script setup lang="ts">
import { logMqtt } from "../../services/logMqtt";
import { tema } from "../../shared/theme";
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <span class="text-xs font-semibold" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-700'">
        Eventos recibidos desde sensores y órdenes manuales de portería
      </span>
      <span class="text-xs font-mono tabular-nums" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
        Mostrando últimos {{ Math.min(30, logMqtt.length) }} de {{ logMqtt.length }}
      </span>
    </div>

    <div
      class="border rounded-xl overflow-hidden"
      :class="tema === 'oscuro' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'"
    >
      <div class="overflow-x-auto max-h-[52dvh]">
        <table class="w-full text-left text-xs">
          <thead
            class="uppercase text-[10px] font-bold border-b sticky top-0"
            :class="tema === 'oscuro' ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'"
          >
            <tr>
              <th class="px-3.5 py-2.5">Plaza / Tópico</th>
              <th class="px-3.5 py-2.5">Estado</th>
              <th class="px-3.5 py-2.5">Origen</th>
              <th class="px-3.5 py-2.5">Hora</th>
            </tr>
          </thead>
          <tbody class="divide-y font-mono text-[11px]" :class="tema === 'oscuro' ? 'divide-slate-800' : 'divide-slate-100'">
            <tr v-if="logMqtt.length === 0">
              <td colspan="4" class="px-4 py-8 text-center font-sans text-xs" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
                Aún no se han recibido eventos en esta sesión. Ejecuta un ingreso o salida en «Control de portería».
              </td>
            </tr>
            <tr
              v-for="log in logMqtt.slice(0, 30)"
              :key="log.id"
              class="transition-colors"
              :class="tema === 'oscuro' ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'"
            >
              <td class="px-3.5 py-2 font-bold" :class="tema === 'oscuro' ? 'text-slate-200' : 'text-slate-800'">{{ log.topic }}</td>
              <td class="px-3.5 py-2 font-bold" :class="log.estado === 'LIBRE' ? (tema === 'oscuro' ? 'text-emerald-400' : 'text-[#15803d]') : (tema === 'oscuro' ? 'text-red-400' : 'text-[#dc2626]')">
                {{ log.estado }}
              </td>
              <td class="px-3.5 py-2 font-sans" :class="tema === 'oscuro' ? 'text-slate-300' : 'text-slate-600'">
                {{ log.direccion === "in" ? "Sensor / Broker" : "Orden de portería" }}
              </td>
              <td class="px-3.5 py-2 tabular-nums" :class="tema === 'oscuro' ? 'text-slate-400' : 'text-slate-600'">
                {{ new Date(log.ts).toLocaleTimeString("es-CO", { hour12: false }) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
