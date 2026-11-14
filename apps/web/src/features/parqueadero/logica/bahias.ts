import { BAHIA_LAYOUT } from "../../../config/bahias";
import { anims, estados } from "../estado";

/** ¿Hay un vehículo en camino hacia/desde esa bahía? */
export function bahiaReservada(id: string): boolean {
  return [...anims.values()].some((a) => a.espacioId === id);
}

export function primeraLibre(): string | undefined {
  return BAHIA_LAYOUT.find(
    (b) => estados[b.id] === "LIBRE" && !bahiaReservada(b.id),
  )?.id;
}

export function primeraOcupada(): string | undefined {
  return BAHIA_LAYOUT.find(
    (b) => estados[b.id] === "OCUPADO" && !bahiaReservada(b.id),
  )?.id;
}
