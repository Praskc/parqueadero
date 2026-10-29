# Docker

Guía completa del stack en contenedores. Para el arranque rápido basta con el bloque "Arranque" de esta guía; el [README](../README.md) tiene el resumen.

## Arranque

```bash
docker compose up --build
```

La primera vez:

1. `mqtt-init` genera la PKI, `broker/passwd`, `broker/acl` y las claves en `.env` y `apps/server/.env`.
2. `broker` arranca con esa configuración y espera a estar sano.
3. `app` compila el backend y la HMI, y sirve todo en <http://localhost:8000>.

Para detener: `docker compose down` (los datos y los certificados viven en volúmenes y en el repo, no se pierden).

En Linux, para que los archivos generados no queden como root:

```bash
DOCKER_UID=$(id -u) DOCKER_GID=$(id -g) docker compose up --build
```

## Qué corre en cada servicio

| Servicio | Imagen | Puerto en el host | Qué hace |
|---|---|---|---|
| `mqtt-init` | `broker/Dockerfile` | — | Aprovisiona PKI, ACL, usuarios y claves. Termina solo |
| `broker` | `broker/Dockerfile` | `127.0.0.1:1883` | Mosquitto con usuario/clave + ACL |
| `app` | `Dockerfile` (raíz) | `8000` | Backend Fastify + HMI compilada |

El backend entra al broker por la red interna de compose (`mqtt://broker:1883`), no por el puerto publicado. El puerto 1883 queda ligado a `127.0.0.1` para poder usar `mosquitto_pub` desde el equipo, sin exponerlo a la red.

## Requisitos

- Docker Desktop (Windows/macOS) o Docker Engine (Linux).
- Para el broker: nada extra, la imagen ya trae `openssl`, `jq` y `mosquitto_passwd`.

## Certificados para el ESP32

El aprovisionamiento deja todo en el repo, así que los archivos se pueden copiar a la placa:

| Archivo | Para qué |
|---|---|
| `broker/certs/nodos/nodo-e01.pem` | Se flashea en el ESP32 (certificado + clave) |
| `broker/certs/nodos/nodo-e01.crt` | Certificado suelto, por si la placa lo pide aparte |
| `broker/certs/ca.crt` | CA del broker, para verificar la cadena en la placa |

El `.pem` **no** se versiona: está en `.gitignore` y solo existe en tu máquina.

## Abrir el listener de nodos (8883, mTLS)

Está cerrado por defecto hasta que llegue la placa. Con Docker:

```bash
NODES_LISTENER=1 docker compose up -d broker
```

Y descomenta el mapeo en `compose.yaml`:

```yaml
    ports:
      - "127.0.0.1:1883:1883"
      - "8883:8883"
```

Abre solo el 8883 en el firewall para la subred del campus.

## Comandos útiles

```bash
docker compose logs -f app          # logs del backend
docker compose logs -f broker       # logs del broker
docker compose ps                   # estado y salud
docker compose exec broker sh       # entrar al contenedor del broker
docker compose restart app          # reiniciar solo la app
docker compose down -v              # borrar también los volúmenes (¡pierde el histórico!)
```

## Diferencias con la instalación nativa

| | Nativo | Docker |
|---|---|---|
| Broker | Mosquitto 2.1 en Windows, plugins | Mosquitto 2.x en Alpine; usa plugins si existen y si no las directivas clásicas |
| Rutas | Relativas al repo | Absolutas dentro del contenedor |
| Aprovisionamiento | `pnpm mqtt:provision` (PowerShell) | `scripts/provision-mqtt.sh` (bash), la misma lógica |
| Base de datos | `apps/server/parqueadero.db` | Volumen `app-data` en `/data` (`DB_PATH`) |
| Credenciales | `apps/server/.env` | `.env` en la raíz, sincronizado por el aprovisionamiento |

El script `scripts/provision-mqtt.sh` y el de PowerShell dejan las claves en los mismos archivos (`.env` y `apps/server/.env`), así que puedes alternar entre una instalación y otra sin volver a configurar.

## Si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `mqtt-init` sale con error | Falta `jq`/`openssl` en la imagen o `broker/nodos.json` mal formado | `docker compose logs mqtt-init` |
| `broker` no queda sano | `broker/passwd` o `broker/acl` no se generaron | Revisa el log de `mqtt-init` y vuelve a levantar |
| `app` reinicia en bucle | `ADMIN_TOKEN` con menos de 12 caracteres | Revisa `.env` y `apps/server/.env` |
| `app` no conecta al broker | `MQTT_URL` mal editado | Debe ser `mqtt://broker:1883` dentro de compose |
| La web carga pero no cambia nada | El broker no publica o la ACL bloquea | `docker compose logs broker` y prueba `mosquitto_pub` con las credenciales de `.env` |
