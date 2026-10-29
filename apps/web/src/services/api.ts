import type { Estado } from "@parq/shared";
import { tokenAdmin } from "./adminToken";

/** POST admin/operador: publica el estado en MQTT vía backend (topic con `nodo`). */
export const setEstado = (id: string, estado: Estado, token: string, nodo?: string) =>
  fetch(`/api/espacios/${id}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-token": token },
    body: JSON.stringify(nodo ? { estado, nodo } : { estado }),
  });

export interface EventoHoy {
  espacio: string;
  estado: Estado;
  nodo: string;
  ts: number;
}

/** Cabecera de operador: el backend exige la clave en historiales y analítica. */
const cabeceraOperador = (): Record<string, string> => {
  const t = tokenAdmin();
  return t ? { "x-admin-token": t } : {};
};

/** Eventos reales del día (SQLite) para la pestaña de analítica. */
export const getAnaliticaHoy = (): Promise<EventoHoy[]> =>
  fetch("/api/analitica/hoy", { headers: cabeceraOperador() }).then((r) => {
    if (!r.ok) throw new Error("analitica no autorizada");
    return r.json();
  });

/** Verifica el token del operador contra el backend sin publicar nada. */
export const verificarToken = (token: string): Promise<boolean> =>
  fetch("/api/sesion", { headers: { "x-admin-token": token } }).then((r) => r.ok);
