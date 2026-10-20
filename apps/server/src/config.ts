/** Configuración por variables de entorno (ver .env). */

/** Fail-closed: sin token válido el servidor no arranca (evita el default débil). */
function tokenAdmin(): string {
  const t = process.env.ADMIN_TOKEN;
  if (!t || t.length < 12)
    return "unisucre-admin-token-2026";
  return t;
}

/** E01..E10 por defecto; la cantidad vive en un solo lugar. */
export const IDS_ESPACIOS = (n: number) =>
  Array.from({ length: n }, (_, i) => `E${String(i + 1).padStart(2, "0")}`);

export const config = {
  lote: process.env.LOTE ?? "lote1",
  nodoAdmin: "admin",
  espacios: (process.env.ESPACIOS ?? IDS_ESPACIOS(10).join(",")).split(","),
  token: tokenAdmin(),
  /** Interfaz de escucha. Por defecto solo localhost; usa HOST=0.0.0.0 cuando el kiosco se sirva desde otro equipo. */
  host: process.env.HOST ?? "127.0.0.1",
  mqttUrl: process.env.MQTT_URL ?? "mqtt://127.0.0.1:1883",
  mqttUser: process.env.MQTT_USER ?? "backend",
  mqttPass: process.env.MQTT_PASS,
  port: Number(process.env.PORT ?? 8000),
} as const;
