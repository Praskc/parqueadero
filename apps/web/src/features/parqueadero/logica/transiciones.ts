import { sonido } from "../../../lib/sonido";
import { publicar } from "../servicios/publicadorMqtt";
import { cerrarTalanquera } from "./talanquera";

/** Publica la ocupación y cierra la barrera cuando el vehículo termina de estacionar. */
export function confirmarOcupacion(espacioId: string): void {
  sonido.parqueo();
  void publicar(espacioId, "OCUPADO", "porteria");
  cerrarTalanquera();
}

/** Cierra la barrera al salir; la liberación se publica solo si el movimiento no vino del sensor. */
export function confirmarLiberacion(
  espacioId: string,
  publicarEstado: boolean,
): void {
  if (publicarEstado) void publicar(espacioId, "LIBRE", "salida");
  cerrarTalanquera();
}
