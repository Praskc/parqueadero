import type { Estado } from "@parq/shared";
import { limpiarToken, tokenAdmin } from "../../../services/adminToken";
import { setEstado } from "../../../services/api";
import { logPublicacion } from "../../../services/logMqtt";
import { notificar, omitir } from "../estado";

/** Publica en MQTT real (vía backend). Exige token para acciones manuales del operador. */
export async function publicar(
  id: string,
  estado: Estado,
  nodo: string,
): Promise<boolean> {
  const t = tokenAdmin();
  if (!t) {
    notificar(
      "alerta",
      "Sin token de operador",
      "Abre la consola de operador e ingresa el token.",
      undefined,
      "alta",
    );
    return false;
  }
  omitir.add(`${id}:${estado}`);
  const r = await setEstado(id, estado, t, nodo);
  if (r.status === 401) {
    omitir.delete(`${id}:${estado}`);
    limpiarToken();
    notificar(
      "alerta",
      "Token inválido",
      "Vuelve a ingresarlo en la consola de operador.",
      undefined,
      "alta",
    );
    return false;
  }
  if (r.ok) logPublicacion(id, estado, nodo);
  return r.ok;
}
