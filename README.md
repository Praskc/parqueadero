# Parqueadero Unisucre

HMI de parqueadero en tiempo real. Cada plaza reporta su estado por MQTT, el backend lo valida y lo persiste en SQLite, y la pantalla del kiosco y la consola del operador se actualizan solas por WebSocket.

```
ESP32 (nodo) --MQTT/TLS--> Mosquitto --MQTT--> Fastify (SQLite) --WS--> Vue 3
```

| Carpeta | Contenido |
|---|---|
| `apps/server` | API HTTP, WebSocket, cliente MQTT y base SQLite |
| `apps/web` | HMI del kiosco y panel del operador (Vue 3, Vite, Tailwind) |
| `packages/shared` | Contrato MQTT y tipos compartidos |
| `broker` | Configuración de Mosquitto, mapa de nodos y ACL generada |
| `firmware` | Sketch del nodo ESP32 (E01 + talanquera) |

## Requisitos

- Node.js 24 y pnpm 11
- Mosquitto 2.1 o superior
- PowerShell 7 (`pwsh`) para los scripts de operación

## Arranque

```powershell
pnpm install

# 1. Variables de entorno
Copy-Item apps/server/.env.example apps/server/.env
# Edita ADMIN_TOKEN (mínimo 12 caracteres) y MQTT_PASS

# 2. Certificados, usuarios y ACL del broker (una vez por equipo)
pnpm mqtt:provision

# 3. Broker en una terminal y la aplicación en otra
pnpm broker
pnpm dev
```

| Servicio | Dirección |
|---|---|
| HMI del kiosco | http://localhost:3000 |
| API | http://127.0.0.1:8000 |
| MQTT del backend | `127.0.0.1:1883` (loopback, usuario/clave + ACL) |
| MQTT de los nodos | `8883` (mTLS, desactivado hasta conectar la placa) |

## Variables de entorno

Se leen de `apps/server/.env`.

| Variable | Por defecto | Nota |
|---|---|---|
| `ADMIN_TOKEN` | — | Obligatoria, mínimo 12 caracteres. Sin ella el servidor no arranca |
| `MQTT_URL` | `mqtt://127.0.0.1:1883` | Broker del backend |
| `MQTT_USER` | `backend` | Usuario definido en `broker/nodos.json` |
| `MQTT_PASS` | — | Clave del usuario `backend` |
| `LOTE` | `lote1` | Prefijo de los topics |
| `ESPACIOS` | `E01…E30` | Lista separada por comas |
| `PORT` | `8000` | Puerto de la API |
| `HOST` | `127.0.0.1` | Usa `0.0.0.0` si el kiosco se sirve desde otro equipo |

## MQTT

Topics:

| Topic | Quién escribe | Contenido |
|---|---|---|
| `parq/<lote>/<nodo>/espacios/<id>/estado` | Nodo sensor | `{"v":1,"estado":"LIBRE"\|"OCUPADO"}` |
| `parq/<lote>/disponibles` | Backend | `{"v":1,"n":<cupos libres>}` retenido |
| `parq/<lote>/<nodo>/comandos/<dispositivo>` | Backend | Reservado para la talanquera; el payload aún no está definido |

El broker escucha en dos puertos:

- **1883**, solo en loopback, para el backend. Usuario y clave más ACL por identidad: el backend publica únicamente `disponibles` y los comandos, nunca estados de plazas.
- **8883**, para los nodos, con TLS mutuo. El certificado identifica al nodo (`CN = nodo-e01`) y el ACL lo limita a sus propias plazas. Está comentado en `broker/mosquitto.conf` hasta que la placa esté conectada.

Para agregar un nodo: edita `broker/nodos.json`, ejecuta `pnpm mqtt:provision` y reinicia el broker.

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Web y servidor en paralelo con recarga |
| `pnpm broker` | Arranca Mosquitto con `broker/mosquitto.conf` |
| `pnpm mqtt:provision` | Genera CA, certificados, usuarios y ACL |
| `pnpm mqtt:nodo` | Publica como nodo con certificado (banco de pruebas, 8883) |
| `pnpm mqtt:log` | Sigue los mensajes del broker |
| `pnpm check` | Typecheck de todos los paquetes |

## Seguridad y datos locales

Nunca se versionan: `apps/server/.env`, `broker/passwd`, `broker/certs/`, `broker/data/` y `parqueadero.db`. Las claves privadas de la CA y de los nodos se generan en el equipo y se copian por USB a la placa.

## Estado del proyecto

- La HMI, el panel del operador y la talanquera (entrada y salida) funcionan contra el broker real.
- La simulación de tráfico no arranca sola: es un interruptor manual del operador.
- El firmware de `firmware/nodo-parqueadero` cubre E01 y la talanquera, todavía sin WiFi ni MQTT.
- El listener 8883 se habilita cuando llegue la placa.

## Documentación

`contexto-mqtt-parqueadero.md` reúne el diseño completo: contrato MQTT, broker y PKI, API, HMI, firmware y el historial de decisiones. El detalle de pines y lógica del nodo está en `firmware/README.md`.
