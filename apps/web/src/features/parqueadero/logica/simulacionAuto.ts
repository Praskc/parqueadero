import { autoSimulacion, bloqueada, hayEsperando } from "../estado";
import { primeraLibre, primeraOcupada } from "./bahias";
import { ingreso, salida } from "./maniobras";

let timer: number | null = null;

export function toggleAutoSimulacion(): void {
  if (timer !== null) {
    detenerAutoSimulacion();
    return;
  }
  autoSimulacion.value = true;
  timer = window.setInterval(() => {
    const libre = primeraLibre();
    const ocupada = primeraOcupada();
    if (hayEsperando.value && ocupada) {
      salida();
      return;
    }
    if (!bloqueada.value && libre && (!ocupada || Math.random() > 0.4)) {
      if (Math.random() > 0.65) {
        ingreso(undefined, "norte");
        setTimeout(() => ingreso(undefined, "sur"), 250);
      } else {
        ingreso();
      }
    } else if (ocupada) {
      salida();
    }
  }, 7500);
}

/** Detiene el ciclo automático: el panel lo llama al cerrarse para no seguir publicando. */
export function detenerAutoSimulacion(): void {
  if (timer === null) return;
  clearInterval(timer);
  timer = null;
  autoSimulacion.value = false;
}
