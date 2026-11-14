import { anims, notificar } from "../estado";
import { retardoPorTrafico, tramoRuta } from "./animaciones";
import { primeraLibre } from "./bahias";
import { abrirTalanquera } from "./talanquera";
import { confirmarOcupacion } from "./transiciones";

/** Asigna una plaza libre a la primera moto en espera (si hay). */
export function resolverEsperas(): void {
  const espera = [...anims.values()].find((a) => a.etapa === "esperando");
  const libre = primeraLibre();
  if (!espera || !libre) return;
  espera.espacioId = libre;
  notificar(
    "ingreso",
    "Cupo asignado a vehículo en espera",
    `Plaza ${libre} disponible. Talanquera abriéndose para vehículo en portería.`,
    libre,
    "alta",
  );
  const retardo = retardoPorTrafico();
  window.setTimeout(() => {
    if (!anims.has(espera.id)) return;
    abrirTalanquera("entrada");
    tramoRuta(espera, libre, () => confirmarOcupacion(libre));
  }, retardo);
}
