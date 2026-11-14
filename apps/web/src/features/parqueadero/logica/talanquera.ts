import { sonido } from "../../../lib/sonido";
import { anims, bloqueada, talanquera, talanqueraSentido } from "../estado";

export function abrirTalanquera(sentido: "entrada" | "salida" = "entrada"): void {
  if (bloqueada.value) return;
  talanqueraSentido.value = sentido;
  sonido.talanquera();
  talanquera.value = "abriendo";
  setTimeout(() => {
    if (!bloqueada.value) talanquera.value = "abierta";
  }, 450);
}

export function cerrarTalanquera(): void {
  if (bloqueada.value || hayMotoEnPuerta()) return;
  talanquera.value = "cerrando";
  setTimeout(() => {
    if (bloqueada.value) return;
    talanquera.value = "cerrada";
  }, 500);
}

export function hayMotoEnPuerta(): boolean {
  return (
    anims.size > 0 &&
    [...anims.values()].some(
      (a) =>
        a.etapa === "talanquera" ||
        a.etapa === "esperando" ||
        a.posicionActual.x < 30,
    )
  );
}
