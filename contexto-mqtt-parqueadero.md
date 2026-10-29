# Contexto: prototipo MQTT de parqueadero

## 1. Alcance actual

Prototipo base ("carpintería básica"): Mosquitto + base de datos + frontend. El broker ya tiene mTLS y ACL por nodo; el listener de nodos (8883) queda cerrado hasta que llegue la placa. Un **admin** simula el sensor: marca un puesto como OCUPADO o LIBRE y el sistema lo registra y lo muestra.

Requisitos que se mantienen:

- Arquitectura escalable (varios lotes y nodos).
- El HMI tiene backend propio; el navegador no habla MQTT.
- El backend no tiene que ser Python.
- El nodo real será un **ESP32** (restricción para etapas posteriores).
- Entorno de desarrollo: Windows, Mosquitto nativo (sin WSL ni VirtualBox).

## 2. Arquitectura

```
Admin (click) ─► Backend ─publish retained─► Mosquitto ─► Backend (suscriptor) ─► SQLite
                                                              └─► WebSocket ─► Frontend
```

- El admin **solo publica a MQTT**. La DB y el frontend se actualizan al recibir el mensaje de vuelta del broker, así que el lazo completo queda probado.
- Cuando exista el sensor real, publica al mismo topic y nada aguas abajo cambia.
- El ESP32 hablará MQTT sobre TLS en el 8883 cuando se abra el listener; el backend habla MQTT por el 1883 en loopback. El navegador habla REST + WebSocket con el backend.

## 3. Decisiones tomadas y razones

| Decisión | Razón |
|---|---|
| Mosquitto nativo en Windows | WSL2 (NAT) y VirtualBox (bridged) añaden una capa de red que complica la conexión del ESP32 |
| Sin Node-RED | Añade un runtime sin cubrir nada que el backend no cubra; con escalabilidad como requisito, la lógica va mejor en código versionado |
| Sin WebSocket en el broker | El HMI ya tiene backend: el navegador no debe tener credenciales ni conocer topics |
| Backend en Node.js + TypeScript (o el que ya tenga el HMI) | Reenvío de eventos MQTT ↔ WebSocket; tipos compartidos con el frontend. Go como alternativa de despliegue limpio |
| SQLite ahora, Postgres/Timescale al escalar | SQLite tiene un único escritor; el esquema ya incluye `lote` para migrar sin rediseñar |
| Namespace `parq/<lote>/<nodo>/...` | Agregar nodos sin migrar firmware ni topics |

## 4. Contrato MQTT

| Topic | Dir. | QoS | Retained | Payload |
|---|---|---|---|---|
| `parq/<lote>/<nodo>/espacios/<id>/estado` | nodo/admin → backend | 1 | sí | `{"v":1,"estado":"LIBRE\|OCUPADO","ts":...}` |
| `parq/<lote>/disponibles` | backend → todos | 1 | sí | `{"v":1,"n":4}` |

- El admin usa `nodo = admin`; el backend solo puede publicar las identidades `admin`, `porteria`, `salida` y `operador`.
- Los nodos sensores publican con su certificado y solo las bahías de `broker/nodos.json`.
- Topic reservado para comandos: `parq/<lote>/<nodo>/comandos/<dispositivo>` (backend escribe, cada nodo lee el suyo). El payload se define con la talanquera.
- Un puesto sin reporte se muestra como `SIN_DATO`, no como `LIBRE`.
- El campo `v` versiona el payload para actualizar firmware gradualmente.

## 5. Estructura del proyecto

Monorepo pnpm workspaces (materializado el 2026-10-12):

```
parqueadero/
  pnpm-workspace.yaml        # workspaces + onlyBuiltDependencies (better-sqlite3)
  package.json               # scripts raíz: dev, broker, check
  scripts/broker.ps1         # lanza mosquitto con la conf del proyecto
  scripts/provision-mqtt.ps1 # CA, certificados de nodos y ACL desde nodos.json
  scripts/mqtt-nodo.ps1      # publica como un nodo con su certificado (banco)
  broker/
    mosquitto.conf           # §6
    passwd                   # (gitignored) usuario `backend`
    data/                    # (gitignored) persistencia del broker
    nodos.json               # mapa nodo sensor -> bahías (fuente de la ACL)
    acl                      # (generado) permisos por usuario/topic
    certs/                   # (gitignored) CA, servidor y certificados de nodos
  packages/shared/           # @parq/shared: contratos Zod + helpers de topics (MQTT y WS)
  apps/server/               # @parq/server: Fastify + mqtt.js + better-sqlite3 (TS)
    src/index.ts             # entrypoint: cablea MQTT → DB → WS
    src/{config,db,mqtt,realtime,http}.ts
    .env                     # MQTT_PASS, ADMIN_TOKEN (gitignored)
  apps/web/                  # @parq/web: Vue 3 + Vite + Tailwind 4 (TS)
    index.html, vite.config.ts, src/main.ts   # entrypoints Vite estándar
    src/App.vue, src/style.css
    src/types/hmi.ts         # modelos de vista del HMI
    src/config/bahias.ts     # layout físico E01-E30 (3 zonas)
    src/services/            # realtime (bus WS), api, adminToken
    src/lib/                 # sonido (WebAudio), tiempo
    src/features/
      parqueadero/           # useParqueadero, simulacionVial, ParkingMap, TarjetaBahia
      display/               # PantallaUsuario (kiosco)
      operador/              # PanelOperador (consola de caseta)
    src/shared/ui/           # UnisucreLogo
```

Instalación: `pnpm i`. Requiere Node 24 (ejecuta TS directo por type stripping, sin build). Gestor de paquetes: pnpm exclusivamente.

## 6. Broker: mosquitto.conf, ACL y PKI

El broker corre **desde el proyecto** (`pnpm broker`), no como servicio de Windows. La configuración vive en `broker/mosquitto.conf` y separa dos superficies:

| Listener | Para quién | Autenticación | Estado |
|---|---|---|---|
| `1883` en `127.0.0.1` | backend | usuario/clave (`backend`) + ACL | activo |
| `8883` en `0.0.0.0` | nodos sensores | mTLS: certificado de cliente + ACL | comentado hasta conectar la placa |

Mosquitto 2.1 deprecó `password_file`, `acl_file` y `per_listener_settings` (se retiran en 3.0). Se usan los plugins `mosquitto_password_file.dll` y `mosquitto_acl_file.dll`, cargados con `plugin_load` y aplicados por listener con `plugin_use`. El password solo se aplica al 1883; los nodos se autentican con certificado.

### 6.1 Reglas de seguridad

- `1883` escucha solo en loopback: ni la LAN ni el WiFi del campus lo ven.
- `8883` exige `require_certificate true`: sin un certificado firmado por la CA local no hay handshake.
- `use_identity_as_username true` toma el CN del certificado como usuario MQTT. La ACL se escribe por `user <CN>` y el nodo no manda contraseña.
- `tls_version tlsv1.2`: es lo que soportan los ESP32 con mbedTLS 2.x. Los certificados son EC P-256 (más livianos que RSA).
- `max_packet_size 1024` y `max_connections 64`.

### 6.2 ACL (`broker/acl`)

La ACL se genera desde `broker/nodos.json`; no se edita a mano. Matriz:

- `backend`: lee `parq/#`; escribe `parq/+/disponibles`, `parq/+/<identidad>/espacios/+/estado` para `admin`, `porteria`, `salida` y `operador`, y `parq/+/+/comandos/#`.
- `nodo-e01`: escribe solo `parq/lote1/nodo-e01/espacios/E01/estado`; lee solo `parq/lote1/nodo-e01/comandos/#`.

Consecuencias: un nodo no puede falsear otra bahía, otro nodo ni `disponibles`; el backend no puede hacerse pasar por un sensor. El backend conserva las identidades del operador (`admin`/`porteria`/`salida`/`operador`) y el servidor las valida antes de publicar.

### 6.3 PKI y certificados

`pnpm mqtt:provision` genera, de forma idempotente:

| Archivo | Contenido | Vigencia |
|---|---|---|
| `broker/certs/ca.crt` + `ca.key` | CA local | 10 años |
| `broker/certs/server.crt` + `server.key` | certificado del broker; SAN `localhost`, `127.0.0.1`, hostname e IP de LAN | 825 días |
| `broker/certs/nodos/<nodo>.crt` + `.key` + `.pem` | certificado de cliente, CN = nombre del nodo | 825 días |
| `broker/acl` | ACL generada desde `nodos.json` | — |

- `broker/certs/` está gitignored; las claves privadas quedan con permisos restringidos al usuario en Windows.
- El `.pem` del nodo combina certificado + clave para flashear; el ESP32 también necesita `ca.crt`.
- Para agregar un nodo: editar `broker/nodos.json` (nombre y bahías), correr `pnpm mqtt:provision` y flashear `ca.crt` + `<nodo>.pem`.
- `pnpm mqtt:provision -Force` rota hojas conservando la CA; `-NewCa` rota la CA y obliga a reflashear todo.
- La CA y `ca.key` son el secreto más crítico: no salen del equipo del broker.

### 6.4 Abrir la LAN (cuando llegue la placa)

1. `pnpm mqtt:provision` y revisar que `broker/acl` tenga el nodo.
2. Descomentar el bloque `listener 8883 0.0.0.0` en `broker/mosquitto.conf` y reiniciar `pnpm broker`.
3. En el firewall de Windows, abrir 8883 solo para la subred del campus. Mosquitto en Windows no tiene `bind_interface`; el firewall es el control.
4. Probar desde el equipo del broker: `pnpm mqtt:nodo -Nodo nodo-e01 -Espacio E01 -Estado OCUPADO -Puerto 8883`.

### 6.5 Pruebas de banco

Sin abrir la LAN se puede levantar un broker de banco en puertos alternos con los mismos certificados y ACL (`scripts/out-test/`). Verificado el 2026-10-28:

- anónimo y clave incorrecta: rechazados;
- TLS sin certificado de cliente: handshake rechazado;
- `nodo-e01` publicando E01: aceptado; E02, otro nodo y `disponibles`: `PUBACK 135 Not authorized`;
- nodo suscrito a `parq/#`: el broker concede la suscripción pero no entrega topics fuera de su ACL;
- backend por 1883: lee el estado del nodo, publica `porteria` y comandos; no puede publicar como `nodo-e01`.

- El servicio de Windows de Mosquitto se detuvo el 2026-10-12. Para que no vuelva a ocupar el 1883 al reiniciar: `Set-Service mosquitto -StartupType Manual` (PowerShell con admin).

## 7. Backend (`apps/server`)

TypeScript ejecutado directo por Node 24 (type stripping, sin paso de build). El código real vive en el repo; el documento mantiene el diseño, no el código. Capas:

- `src/config.ts`: env (`LOTE`, `ESPACIOS` = E01-E30 por defecto, `MQTT_*`, `ADMIN_TOKEN`, `PORT`) y la lista `nodosAdmin` (`admin`, `porteria`, `salida`, `operador`).
- `src/db.ts`: SQLite en WAL; tablas `espacios` y `ocupacion`; `save()` en transacción (solo cambios reales van al historial), `snapshot()`, `historial()`.
- `src/mqtt.ts`: conexión con `mqtt.js`, suscripción `parq/+/+/espacios/+/estado` (QoS 1), validación del payload con Zod (`@parq/shared`), publicación del retained `disponibles` tras cada cambio.
- `src/realtime.ts`: hub WebSocket en memoria (un proceso).
- `src/http.ts`: Fastify; `GET /api/estado`, `GET /api/historial/:id`, `POST /api/espacios/:id` (header `x-admin-token`; body acepta `nodo` opcional y validado, p.ej. `porteria`/`salida`/`operador`, que aparece en el topic), `/ws`; sirve `apps/web/dist` si existe build. El campo `nodo` del POST se valida contra `nodosAdmin`: fuera de esa lista responde 400 y no llega al broker.
- `src/index.ts`: entrypoint; cablea MQTT → `save()` → `broadcast()`. La única vía de escritura es MQTT (el admin publica y todo se actualiza cuando el mensaje vuelve del broker).

## 8. Frontend (`apps/web`) — HMI institucional Unisucre

Vue 3 + Vite + Tailwind 4, organizado por funcionalidad:

- `index.html` + `src/main.ts`: entrypoint Vite estándar (fuentes autoalojadas Barlow Condensed para titulares, Inter para UI y JetBrains Mono para datos; sin CDN).
- `src/App.vue`: composición de pantallas + reloj + toasts de notificación + barra de controles (vigilancia/tema) en flujo.
- `src/config/bahias.ts`: layout físico E01-E30 (3 zonas; la posición en el plano es dato de presentación).
- `src/services/`: `realtime.ts` (bus único WS con reconexión), `api.ts` (POST admin con `nodo`), `adminToken.ts`.
- `src/lib/`: `sonido.ts` (WebAudio), `tiempo.ts` (relativos "hace X").
- `src/features/parqueadero/`: `useParqueadero.ts` (estado real ← WS, única fuente de verdad), `simulacionVial.ts` (capa de presentación: motos animadas, FSM de talanquera, notificaciones, auto-demo; publica ocupación por REST→MQTPT real), `ParkingMap.vue` (plano SVG), `TarjetaBahia.vue`.
- `src/features/display/PantallaUsuario.vue`: kiosco (header institucional, cupos en vivo, plano 5×2 y anuncio `aria-live`).
- `src/features/operador/PanelOperador.vue`: consola (bloqueo de talanquera, pruebas de tráfico, forzar plazas, auto-sim).
- `src/types/hmi.ts` + `src/shared/ui/UnisucreLogo.vue`.

**Regla de la simulación:** nada se inventa en el navegador. Los botones de tráfico publican por REST → MQTT (nodos `porteria`/`salida`/`operador` en el topic) y la HMI anima cuando el evento vuelve del broker por WS. Si un evento llega de afuera (admin en otra pestaña, `mosquitto_pub` o el ESP32 real), la animación se dispara igual. La talanquera animada es visualización local; su comando real al nodo está en §10. Origen: maqueta "parqhmi" integrada el 2026-10-13; el hub MQTT falso, las placas inventadas y los restos de React quedaron fuera.
## 9. Ejecución y pruebas

```
pnpm i
pnpm broker   # terminal 1: Mosquitto con broker/mosquitto.conf (auth + persistencia)
pnpm dev      # terminal 2: server (:8000, watch) + Vite (:5173, HMR)
```

1. Abrir `http://localhost:5173/` (vista) y `http://localhost:5173/?admin` (admin, pide token) en dos pestañas. Un click en admin debe reflejarse en ambas. (`http://localhost:8000/` también sirve la UI si existe `apps/web/dist` tras `pnpm --filter @parq/web build`.)
2. Simular un sensor externo. Con la ACL activa, el backend ya no puede publicar como `sensor1`: cada nodo usa su certificado y solo su bahía.
   - En banco (sin abrir 8883): `pnpm mqtt:nodo -Nodo nodo-e01 -Espacio E01 -Estado OCUPADO -Puerto 8884` contra el broker de banco.
   - Con 8883 abierto: el mismo comando con `-Puerto 8883`.
   - Para probar otra bahía, agrégala a `broker/nodos.json`, corre `pnpm mqtt:provision` y usa su certificado.
   - El admin del HMI sigue publicando por REST con `nodo=porteria`/`salida`/`operador`; el servidor valida esa lista y la ACL la permite.
3. Reiniciar el backend: el estado vuelve desde SQLite (`apps/server/parqueadero.db`).
4. Borrar `parqueadero.db` y reiniciar: el estado se reconstruye desde los retained del broker (`broker/data/`).
5. Consultar `/api/historial/E01`.
6. Evidencia de paquetes MQTT en vivo: `pnpm mqtt:log` (wrapper de `mosquitto_sub -t parq/# -v` que lee la clave de `apps/server/.env`). Muestra cada publish con topic y payload; el terminal de `pnpm broker` (corre con `-v`) muestra además las tramas bajas: CONNECT, SUBSCRIBE, PUBLISH, PUBACK.

Carpintería verificada de punta a punta el 2026-10-12 sobre el monorepo real: admin REST → MQTT → DB, sensor simulado con `mosquitto_pub`, retained de `disponibles` recalculado, historial, 401 con token inválido, WS (snapshot + evento) y rechazo de JSON malformado.

## 10. Fuera de alcance por ahora (diferido)

- Abrir el listener 8883 en la LAN y escribir el cliente MQTT/TLS del ESP32 (mbedTLS) con los certificados de §6.
- Comandos a la talanquera: el topic `parq/<lote>/<nodo>/comandos/<dispositivo>` ya está reservado en la ACL; falta definir el payload y el TTL.
- Rotación/revocación de certificados (CRL o reemisión) cuando haya más de un nodo.
- Firmware del ESP32, talanquera y FSM de ocupación de 4 estados.
- Listener WebSocket del broker (descartado mientras exista backend).
- Migración a Postgres/Timescale y suscripciones compartidas (`$share`) para varias instancias del backend.
- Calendario de comandos con TTL y MQTT 5 (expiración de mensajes).
- Concentrador ESP-NOW (nodo ESP32 que agrega nodos sensores y republica por MQTT) si algún lote supera la capacidad de clientes del punto de acceso WiFi.

## 11. Notas para la etapa del nodo ESP32

- Dos tareas FreeRTOS: core 1 control (periodo fijo), core 0 red; comunicación por colas.
- El control, la FSM y la guarda de `disponibles == 0` viven en el nodo; el backend solo supervisa. Sin red, la talanquera sigue funcionando.
- Cliente MQTT: esp-mqtt (ESP-IDF), arduino-mqtt o AsyncMqttClient. PubSubClient no sirve (publica solo QoS 0).
- ACS712 en pin ADC1 (GPIO 32–39); ADC2 no funciona con WiFi activo. Atención al nivel de 5 V del ACS712 frente a los 3.3 V del ADC.
- Dos VL53L1X comparten la dirección I2C 0x29: usar XSHUT y reasignar dirección en el arranque.
- Evitar pines de strapping (0, 2, 12, 15) para la salida al driver del motor.
- Alimentación del motor separada o con regulador dedicado para evitar brownout.
- Payloads compactos, sin `String`, telemetría limitada a 5–10 Hz (1 Hz en reposo).

## 12. Selección de arquitectura para el nodo (overhead, escalabilidad, saturación del ESP32)

Evaluado para un ESP32 DevKit v1 que publica por WiFi.

### Candidatos comparados

| Opción | Overhead por mensaje | Carga en el ESP32 | Infraestructura extra | Veredicto |
|---|---|---|---|---|
| MQTT sobre TLS 1.2 (elegida) | ~140–200 B en el aire por evento (publish QoS 1 + PUBACK + headers TCP/IP + ~29 B de registro TLS) | ~10–20 KB heap en régimen + 30–50 KB en el handshake mbedTLS | Ninguna (Mosquitto ya está); hay que abrir el 8883 y flashear certificados | **Elegida** |
| CoAP (UDP) | El más ligero: header de 4 B | Similar RAM | Gateway CoAP→MQTT (Mosquitto no habla CoAP); se pierden retained/QoS tal cual | Descartado: solo compensa en dispositivos ultra-restringidos |
| ESP-NOW + concentrador | Mínimo tiempo de aire, sin asociación WiFi | Muy baja en los nodos | ESP32 concentrador = punto único de falla + doble firmware | Diferido: solo si se supera la capacidad del AP (§10) |
| HTTP polling | 300–600 B por request + handshake por conexión | Alta (el polling quema CPU y radio) | Ninguna | Descartado |

### Números clave

- Un cambio de puesto ≈ 200 B totales; a 10 eventos/min son ~2 kbps: insignificante frente a 802.11n. No compensa comprimir el payload a binario (CBOR/Protobuf).
- El límite real de escalado no es MQTT sino el punto de acceso: un AP doméstico sostiene ~10–30 clientes. Más nodos ⇒ AP enterprise, más APs, o ESP-NOW con concentrador. Mosquitto aguanta órdenes de magnitud más que eso.
- Lo que más pesa en el ESP32 es **TLS**, no MQTT: el handshake de mbedTLS usa ~30–50 KB de heap y 1–3 s de CPU. El listener 8883 se abre cuando llegue la placa (§10); si el bench aprieta la RAM, las salidas son un concentrador ESP32 con ESP-NOW o un ESP32-S3 con PSRAM.
- El sobrecosto por publicación es ~29 B de TLS (AES-GCM) sobre un payload de 26 B; el costo real es el handshake (≈2–3 KB en el aire, ~30–50 KB de heap y 1–3 s de CPU). Los certificados EC P-256 suman ~1,7 KB de flash en el nodo (CA + certificado + clave).

### Pautas para no saturar el ESP32 DevKit v1

- Publicar solo en cambio de estado + heartbeat cada 30–60 s; QoS 1 para estado, QoS 0 para heartbeat/telemetría.
- `keepalive` 30–60 s; reconexión con backoff (2→60 s), nunca bloqueante en el loop de control.
- `CleanSession=true` si el nodo solo publica (evita colas acumuladas en el broker).
- Mensajes máx ~256 B, sin `String`, buffers estáticos (`snprintf` o `StaticJsonDocument`).
- El `ts` del nodo es opcional: el backend ya timestampa en recepción (`ts: Date.now()`), así que el nodo no necesita RTC/SNTP.
- Cliente: esp-mqtt (ESP-IDF) o arduino-mqtt (ambos con QoS 1), como ya indica §11.

## 13. Stack del HMI (backend, frontend, base de datos)

El backend es un spool de eventos I/O-bound (MQTT ↔ WS + pocos endpoints), no un CRUD; el stack se elige según ese perfil.

### Backend

| Opción | Encaje | Veredicto |
|---|---|---|
| Node + TypeScript + Fastify | Runtime orientado a eventos; `mqtt.js` es el cliente de referencia; mismo lenguaje que el front. Fastify = framework HTTP ligero para Node (sucesor moderno de Express: más rápido, validación de esquemas integrada, plugins oficiales de WS/estáticos) | **Elegido (confirmado)** |
| FastAPI (Python) | Viable con aiomqtt + pydantic, pero duplica el tipado del contrato en dos lenguajes | Alternativa si el equipo domina Python |
| Django (Python) | CRUD server-rendered; WS requiere Channels + ASGI + Redis (channel layer) | Descartado: maquinaria desproporcionada |
| Go | Binario único, gran concurrencia, iteración lenta | Diferido (opción de despliegue, §3) |

### Frontend

| Opción | Nota | Veredicto |
|---|---|---|
| Vue 3 + Vite + TS | Curva suave, SFC, ideal para panel HMI. El equipo no tiene experiencia previa en frameworks de frontend → Vue es la entrada más amable | **Elegido (confirmado)** |
| React + Vite + TS | Igual de válido, más decisiones de estado/data-fetching | Solo si el equipo ya lo domina |
| Angular / Next / Nuxt | SSR y peso innecesarios en panel interno | Descartado |
| Vanilla (§8) | Sirve para 6 puestos; no escala a multi-lote/auth/historial | Solo prototipo |

### Tooling y estructura objetivo

- **pnpm + workspaces** (monorepo): `apps/server`, `apps/web`, `packages/shared`.
- pnpm es el **único gestor de paquetes** del proyecto (npm queda descartado por decisión del equipo). Usa el mismo registry que npm, pero con node_modules estricto (sin dependencias fantasma) y scripts de ciclo de vida (`postinstall`, etc.) bloqueados por defecto en versiones recientes, lo que reduce la superficie de ataque de la cadena de suministro.
- `packages/shared` define el contrato MQTT/WS con **Zod**: una sola fuente de verdad validada en backend y frontend.
- Comandos estándar: `pnpm i`, `pnpm dev`. No existe flujo con npm en ninguna parte del proyecto.
- La estructura mínima de §5 se mantiene para el prototipo; la estructura de workspaces aplica cuando se materialice el HMI real.

### Regla de decisión

**Confirmado (2026-10-12):** el equipo domina JS/TS y no tiene experiencia previa en frameworks de frontend → stack fijado en **pnpm + TS + Fastify + Vue 3**, sin alternativa activa. El diseño de §2–§4 (topics, retained, WS) es independiente del stack. Node-RED se reevaluó en esta fecha y se mantiene descartado por las razones de §3 (lógica en flujos no versionables, sin tipos compartidos, runtime extra sobre Node).

## 14. Registro de cambios

Cada mejora que se haga al prototipo se anota aquí y se actualizan las secciones afectadas del documento.

| Fecha | Mejora | Secciones afectadas |
|---|---|---|
| 2026-10-12 | Se crea el registro de cambios; el documento queda como referencia viva del proyecto | §14 |
| 2026-10-12 | Análisis comparativo de arquitectura del nodo (MQTT vs CoAP vs ESP-NOW vs HTTP): se confirma MQTT directo; pautas para no saturar el ESP32 DevKit v1; concentrador ESP-NOW queda diferido | §12, §10 |
| 2026-10-12 | Se fija el stack del HMI: pnpm workspaces + TS + Fastify + Vue 3 + SQLite→Postgres; Django descartado; alternativa FastAPI condicionada al equipo | §13, §3 |
| 2026-10-12 | Stack confirmado por el equipo: JS/TS en backend y sin experiencia previa en frontend → Fastify + Vue 3 quedan definitivos; se aclara qué es Fastify y se reevalúa Node-RED (se mantiene descartado, §3) | §13 |
| 2026-10-12 | pnpm queda como gestor de paquetes exclusivo (npm descartado por percepción de inseguridad del equipo); instrucciones de §5 migradas a pnpm; se anota que pnpm bloquea scripts postinstall por defecto | §5, §13 |
| 2026-10-12 | Monorepo materializado: pnpm workspaces, `@parq/shared` (contratos Zod única fuente de verdad), `@parq/server` (Fastify + TS en capas, Node 24 type stripping), `@parq/web` (Vue 3 + Vite por funcionalidad). TypeScript fijado en ^5.9 (TS 7 rompe vue-tsc) | §5, §7, §8, §13 |
| 2026-10-12 | Broker Mosquitto pasa a correr desde el proyecto (`pnpm broker`, conf en `broker/`, auth + persistencia); servicio de Windows detenido. Claves generadas en `apps/server/.env` | §6, §9 |
| 2026-10-12 | Carpintería verificada E2E sin ESP32: admin REST → MQTT → DB → WS, sensor simulado, retained `disponibles`, historial, 401, JSON inválido rechazado | §9 |
| 2026-10-12 | Script `pnpm mqtt:log` para evidencia en vivo de paquetes MQTT (suscripción `parq/#` con clave leída del `.env`) | §9, §5 |
| 2026-10-13 | HMI institucional Unisucre integrada desde la maqueta `parqhmi`: pantalla kiosco + plano SVG + consola de operador con pruebas de tráfico; el hub MQTT falso se reemplaza por una capa de simulación vial que publica por el pipeline real (REST → MQTT con nodos `porteria`/`salida`/`operador`); 10 bahías E01–E10; Tailwind 4; placas falsas y restos de React descartados | §5, §7, §8 |
| 2026-10-13 | Backend: `POST /api/espacios/:id` acepta `nodo` opcional; verificado E2E (retained en `parq/lote1/porteria/espacios/E07/estado`) | §4, §7, §9 |
| 2026-10-13 | El escudo oficial (`Unisucre.svg.webp` → `public/unisucre.webp`) reemplaza el SVG dibujado a mano en el header | §8 |
| 2026-10-13 | Optimización de animaciones: cada moto en movimiento se aísla en `MotoAnimada.vue` (componente hoja) para que el frame a frame no re-renderice el plano SVG completo; causa de la lentitud percibida vs. la maqueta original | §8 |
| 2026-10-13 | Optimización ronda 2: sin `feDropShadow` en motos en movimiento (rasteriza filtro cada frame) y tweens a 30 fps; verificado que :8000 y :5173 sirven el código actualizado | §8 |
| 2026-10-13 | Diagnóstico de fluidez con A/B contra la maqueta original (:3000) y medidor de FPS: el equipo tiene monitor 144 Hz con 144 fps estables; el límite de 30 fps causaba tirones visibles en pantalla de alta tasa de refresco — se elimina el throttle y se restaura la actualización por frame; blur del panel de operador reemplazado por velo simple | §8 |
| 2026-10-13 | Medición objetiva por CDP (`scripts/probe-cdp.mjs`, Brave real con GPU): durante una maniobra disparada por MQTT la HMI corre a **144 fps exactos (p99 = 7,4 ms, 0 long tasks)**. El render no es la causa de la percepción de lentitud; se retira el medidor de FPS del UI | §8 |
| 2026-10-13 | **Causa raíz de "las motos no se ven pasar":** los tweens de `simulacionVial.ts` mutaban el objeto crudo tras `anims.set()`; `reactive(new Map())` solo dispara Vue al escribir por el proxy — la moto quedaba congelada en su frame de spawn ("luz desde la calle"), la talanquera (un `ref`) sí se abría, y `done()` publicaba OCUPADO de golpe ("pum parqueo"). Fix: `addAnim()` devuelve siempre el proxy reactivo y todos los tween mutan ese proxy. Verificado con rastreo CDP del atributo `transform` por rAF (`scripts/probe-track.mjs`): trayectoria completa portería→corredor→bahía en 2600 ms a ~144 Hz, 1297 muestras sin huecos. Se aprendió además que rAF se congela en pestañas en segundo plano (artefacto de medición anterior) | §8 |
| 2026-10-13 | Convivencia vial: (1) las bahías se **reservan** al arrancar la animación (`bahiaReservada`), así dos ingresos simultáneos no caen en la misma plaza (antes el estado solo cambiaba al final del tween); (2) separación de tráfico: cada moto activa retrasa el arranque de la siguiente 800 ms (`retardoPorTrafico`), incluidas salidas, eventos WS y resolución de esperas; (3) las motos en espera hacen **fila** detrás de la talanquera (x 18, 7, −4…) en vez de montarse una sobre otra. Verificado con rastreo CDP: dos ingresos seguidos no se solapan y van a bahías distintas | §8 |
| 2026-10-14 | **Integración maqueta v2 (zip del equipo) a Vue puro — sin React.** (1) `ParkingMap`: andén en dos tramos con boca de acceso que empalma con la calle (x=126), cordones redondeados, cebra peatonal, divisoria entrecortada en zona de giro, señal PARE reubicada a la acera sur con pedestal; geometría de carriles (44,5/55,5) compatible con la animación. (2) `WidgetOcupacion.vue`: anillo doble de ocupación (puerto SVG nativo del OccupancyRingChart de React+Recharts), colapsable, sobre el plano. (3) `AnaliticaOperador.vue`: 4 gráficos SVG nativos (flujo horario, rotación por bahía, zonas N/S, rendimiento por nodo) — sin datos inventados: histórico del día desde `GET /api/analitica/hoy` (una sola carga) y actualización **por push del WebSocket** (sin sondeo AJAX; verificado: no queda ningún `setInterval` de red en la web). (4) `PanelOperador`: 4 pestañas (Analítica / Control / Telemetría / Registro MQTT), iconografía SVG sin emojis; "Moto en Espera" habilitada solo con aforo 100%; botón de consola con ícono bandera. (5) `services/logMqtt.ts`: buffer de mensajes IN/OUT reales del broker para la pestaña Registro MQTT (comparable con `pnpm mqtt:log`); telemetría de lazos/fotocelda derivada de la simulación real, distancias falsas eliminadas | §4, §7, §8 |
| 2026-10-14 | Backend para analítica real: migración `ocupacion.nodo` (ALTER TABLE suave), `Registro.nodo` capturado del topic en `mqtt.ts`, `EventoEspacio.nodo` por WS y `GET /api/analitica/hoy` (eventos del día desde SQLite). Verificado: el endpoint responde con eventos reales y su nodo publicador | §4, §7, §9 |
| 2026-10-16 | **Auditoría de seguridad** (skills security-review + security-and-hardening) con hallazgos corregidos y verificados en vivo: (1) servidor pasa de `0.0.0.0` a `127.0.0.1` por defecto con `HOST` configurable; (2) token admin **fail-closed** (arranca solo si `ADMIN_TOKEN` existe y ≥12 chars; antes el default era "cambiar"); (3) comparación del token en tiempo constante (`timingSafeEqual` sobre sha256); (4) `/ws` rechaza orígenes cruzados con 403 **antes** del upgrade (verificado con handshake crudo: evil→403, sin Origin→101); (5) `mqtt.ts` valida `lote` contra config y `nodo` con regex (cierra inyección de eventos de lotes ajenos); (6) rate limit 120/min por IP en el POST admin (verificado: 429 tras el límite); (7) cabeceras CSP/X-Frame-Options/nosniff/Referrer-Policy en todas las respuestas; (8) eliminado `broker/payload.json` (residuo de pruebas). Confirmado sin hallazgos: SQL 100% parametrizado, XSS imposible (Vue interpolado, 0 v-html/innerHTML), `pnpm audit --prod` limpio, `.env`/`passwd`/`*.db` gitignored, broker solo localhost con auth. Pendiente documentado: TLS diferido (§12), ACL por nodo cuando llegue el ESP32, `HOST=0.0.0.0` solo si el kiosco se sirve desde otro equipo | §9, §10, §12 |
| 2026-10-17 | **Bug reportado por el equipo corregido: cerrar el prompt del token abría la consola igual.** Causa: `prompt()` del navegador ignorado al montar el panel (retorna `null` y nada verificaba). Fix de diseño: el `prompt()` se elimina; la consola abre con una **pantalla de bloqueo propia** (input `type=password` + `GET /api/sesion` con comparación timing-safe) y tabs/controles solo se renderizan tras verificar; `/api/sesion` tiene rate limit estricto de 10 intentos/min por IP (verificado: 401×10 → 429). E2E por CDP: sin token → candado sin tabs; token falso → "Token inválido o bloqueado por intentos"; token real → desbloquea con tabs y controles visibles | §8, §9 |
| 2026-10-17 | **Auditoría dedicada del broker Mosquitto 2.1.2** (config + versión + runtime): (1) `listener 1883 127.0.0.1` + sin regla firewall entrante → inaccesible desde la red; (2) `allow_anonymous false`, todas las conexiones registradas autentican como `backend`, cero eventos de auth fallida en los logs capturados; (3) password hasheado con `$7$` (PBKDF2-SHA512 con sal, formato fuerte de mosquitto 2.x); (4) **nuevo `max_packet_size 1024`** — verificado en vivo: publish de 26 B pasa, publish de 1,2 KB es desconectado ("oversize packet"); se usó el nombre nuevo tras notar que `message_size_limit` está deprecado en 2.1.2; (5) CVEs: los de la línea 2.0.x (0809/3592/28366/3935/8376/10525) están fixeados antes de 2.1; los CVE-2026 de gnutls aplican a la imagen Docker Alpine con TLS+RSA-PSK (nosotros: binario Windows sin TLS); issue abierto upstream de path traversal en la API HTTP local (#3569) **no aplica** porque exige modo local-only sin `listener` y nosotros declaramos listener explícito. Pendiente: ACL por nodo + TLS cuando llegue el ESP32 (§10/§12); la persistencia `broker/data/` contiene solo estados públicos y está gitignored | §6, §9 |
| 2026-10-17 | **Rediseño del kiosco alrededor del plano** (dirección dada por el equipo: el patio y la calle son la referencia aprobada; "meh" en tarjetas, encabezado y banner). El mundo visual del plano se extiende al resto: (1) **Encabezado** → portón del campus: banda de asfalto `slate-800`, escudo en placa blanca, doble amarilla de la vía como filete bajo el título, placa de aforo tipo señal variable (borde verde/ámbar/rojo según estado) y placa de hora con estado de telemetría; (2) **Banner de guiado** → panel de mensaje variable (VMS): pictograma circular según estado (habilitado/espera/movimiento/lleno/bloqueada), título en mayúsculas espaciadas, y placa derecha con el estado de la talanquera; añadido `role="status" aria-live="polite"` (deuda de accesibilidad saldada); (3) **Tarjetas de bahías** → puestos pintados sobre asfalto: marco amarillo constante (la pintura del puesto, como en el plano), tinte interior por estado, franja diagonal `.parking-stripe` para SIN_DATO (misma lengua del hatch del plano), ID en Chakra Petch; se elimina el `@click` muerto (nadie escuchaba `select`; era interactividad falsa sin teclado); (4) botón de consola armonizado a placa oscura. Colores recalibrados para fondo oscuro (emerald-400/red-400/amber-300 ≥ AA sobre slate-800). Verificado: build limpio, 0 errores de consola, captura en `scripts/out6/` | §8 |
| 2026-10-16 | **Auditoría de slop/quality del frontend** (skills impeccable + web-design-guidelines + break-ui): score 13/20; 2 de 3 alertas del detector eran falsos positivos verificados. Corregido en esta pasada: **tipografía y motos**. Tipografía: Plus Jakarta Sans (lista AI-slop) y el CDN de Google eliminados → **Archivo Variable** (UI), Chakra Petch (cifras del kiosco) y JetBrains Mono (datos) autoalojadas con `@fontsource`; `font-mono` de Tailwind mapeada a JetBrains Mono real vía `@theme`; verificado por CDP: las tres familias cargan desde `/assets/*.woff2` (kiosco 100% offline, sin fallback silencioso). Motos: los dos dibujos divergentes (en movimiento vs estacionada) se unifican en `MotoFigura.vue` — ruedas circulares con neumático/llanta/rayos, guardabarros, horquilla con espejo, motor, escape, carrocería con línea de carácter, asiento, faro condicional y pedal de apoyo en la estacionada — consumida por `MotoAnimada` (cono de faro + sombra de contacto) y por las bahías del plano; verificado: 10 estacionadas renderizadas y maniobra completa con 0 errores de consola. Pendiente del audit: contraste -700 en botones, ARIA del modal/toast, foco del select, reduced-motion, teclado en bahías/tarjetas, pluralización "1 cupos", truncate del topic, favicon | §8 |
| 2026-10-18 | **Campus de 30 puestos en 3 zonas interconectadas** (direccin del equipo). El plano pasa de 2 filas de 15 a 1000x1232 vertical: Zona A (E01-E10), Zona B (E11-E20), Zona C (E21-E30), 2 filas de 5 bahas de 88x96 separadas por pasillos con flechas. Carril vertical desde la portera conectando los 3 pasillos. Ruta de la moto mutada: portera-carril-pasillo-puesto (4 fases). Letreros ZONA A/B/C pintados. ESPACIOS generado con Array.from. FAB de accesibilidad flotante fixed. Jerga de implementacin eliminada de la UI. Verificado por CDP: 30 bahas, 3 zonas, vas pintadas, mapa 1148x1415px | 4, 8 |
| 2026-10-18 | **Revert a 10 puestos (E01–E10) por decisión del equipo** — el campus de 30 y el rediseño oscuro del kiosco (tokens de Stitch) se deshacen. Kiosco: variante "Sereno" (blanco, un acento verde, Barlow + Chakra Petch + JetBrains Mono) restaurada desde `PrototipoKiosco.vue`; el prototipo en `/prototypes/kiosco` queda como fuente de respaldo. Plano: viewBox 1000×560, un solo patio de asfalto con 2 filas de 5 bahías y corredor central que empalma con la rampa (y=280); letrero "PARQUEADERO · E01–E10" pintado sobre el corredor. Ruta de la moto de vuelta a 3 fases: portería→corredor→bahía (la salida es el inverso). Analítica: pestaña de zonas vuelve a Norte (E01-E05) / Sur (E06-E10). Servidor: `ESPACIOS` por defecto E01–E10; `mqtt.ts` ya rechazaba mensajes de plazas fuera del config (línea de validación existente), se limpian los retained del broker (`broker/data/`) y las filas E11–E30 de SQLite. Verificado por CDP (`scripts/probe-revert.mjs`): 10 bahías, contenedor claro, sin jerga, FAB presente; trayectoria de salida completa por el corredor con `probe-track.mjs` (658 muestras, sin huecos) disparada por `mosquitto_pub` de un sensor externo | 4, 7, 8 |
| 2026-10-20 | **Adopción del frontend de `origin/main` (a8f0a69) y auditoría de lógica.** Se adopta solo la capa visual: mapa de grilla contigua 5×2, 4 modelos de moto, modo claro/oscuro (claro por defecto), panel de operador y copia humanizada. Se **rechaza** el resto del commit: `ADMIN_TOKEN` con fallback hardcodeado, `db.ts` en memoria (sin persistencia y con lista de eventos sin poda), `viteBackendPlugin.ts` con backend falso, token de 3 caracteres y datos inventados, y borrado de `pnpm-workspace.yaml`/`pnpm-lock.yaml` + `bun.lock`. Correcciones aplicadas: fuentes autoalojadas (Barlow Condensed/Inter/JetBrains, sin CDN), alto contraste en oscuro, escala 200 % con etiqueta propia y persistencia, objetivos táctiles de 44 px, barra de controles en flujo (sin solaparse al 150-200 %), `aria-live` de cupos, bahías navegables por teclado, flechas de corredor en dos sentidos y placeholder de token sin ejemplo. Auditoría: 0 hallazgos críticos de seguridad en el servidor actual; pendientes P2/P3 documentados (tema no persistido, tipografía Inter vs. brief original, etiquetas del plano en móvil, arranque automático de simulación retirado). Verificado por CDP en :5173 y :8000, build limpio y sin peticiones externas | 4, 7, 8, 9 |
| 2026-10-20 | **Talanquera: la salida ya abre y el brazo abre completo.** (1) `salida()` y los eventos reales `LIBRE` no llamaban `abrirTalanquera()`: la moto atravesaba el brazo cerrado. Ahora la salida abre al arrancar el tween y cierra en `done()` después de borrar la animación; `resolverEsperas()` conserva la puerta abierta si hay una moto esperando. (2) Se reemplazaron los dos temporizadores sueltos por uno solo (`timerTalanquera`) para que apertura y cierre no se pisen. (3) `barrierAngle` ya no pasa por -50/-25/-85: `abriendo` y `abierta` comparten 90°, `cerrando` y `cerrada` comparten 0°. Eso elimina el segundo tramo que hacía que el brazo pareciera trabarse; el giro es uno solo de 450 ms con `cubic-bezier(0.23, 1, 0.32, 1)` (reduced-motion: 1 ms). (4) Geometría: cerrado baja y cruza el carril; abierto gira 90° a la izquierda y queda paralelo al andén, fuera del carril y de E01 (antes -90° lo metía sobre la primera plaza). El soporte de descanso queda al final del brazo cerrado y el aviso "PASO BLOQUEADO" sale del grupo giratorio para no quedar de lado. Verificado con `scripts/probe-exit.mjs` por CDP: salida abre desde el inicio, llega a 90°, cierra al terminar; entrada recorre 0→90→0; 0 errores de consola; `pnpm -r check` y build limpios. (5) Referencia visual con Stitch (skill `stitch-design-taste`): proyecto `13225817094122459320` "Sereno 10 puestos Puerta Roja", pantallas `daf2cdbf574949989262e6666a1275c0` (kiosco claro) y `d48c50e8335941218368b99951ad031a` (ficha de la talanquera). Se adopta la idea "abierta 90°, brazo fuera del carril, sin efecto molinete"; se rechazan la jerga inventada (LPR, modo automático, sincronizado), la tipografía Hanken y los datos falsos. La lógica de simulación sigue intacta: solo se retiró el arranque automático al cargar; los botones manuales y el toggle de auto-simulación siguen publicando por REST→MQTT. Capturas: `scripts/out-newfront/entry-abierta.png`, `exit-abierta.png`, `stitch-talanquera.png` | 4, 7, 8 |
| 2026-10-28 | **Broker endurecido con mTLS + ACL por nodo.** Se separan dos listeners: 1883 en loopback para el backend (usuario/clave + ACL) y 8883 para nodos (mTLS con `require_certificate` y `use_identity_as_username`), este último comentado hasta conectar la placa. Se migra de `password_file`/`acl_file`/`per_listener_settings` (deprecados en 2.1) a los plugins `mosquitto_password_file` y `mosquitto_acl_file`. `broker/nodos.json` define el mapa nodo→bahías; `pnpm mqtt:provision` genera CA EC P-256, certificado de servidor con SAN, certificados de cliente con CN = nodo, `.pem` para flashear y `broker/acl`. La ACL deja que `backend` lea `parq/#` y escriba solo `disponibles`, las identidades `admin`/`porteria`/`salida`/`operador` y comandos; `nodo-e01` solo escribe E01 y lee sus comandos. El backend valida `nodo` contra esa lista (400 si no existe). Probado en 1886/8886: anónimo y clave mala rechazados, sin certificado no hay handshake, `nodo-e01` acepta E01 y recibe 135 en E02/otro nodo/`disponibles`, y el backend lee el estado del nodo. Certificados: nodo 753 B + clave 241 B + CA 725 B (≈1,7 KB en flash); el sobrecosto TLS es ~29 B por publicación y el costo real es el handshake (~30–50 KB heap, 1–3 s). `.env.example`, `.gitignore` y `broker/certs/` actualizados. Sin commits. | 1, 2, 4, 5, 6, 7, 9, 10, 12, 14 |
| 2026-10-28 | **Limpieza del repo.** Se retira el export de AI Studio (`parqhmi---telemetría-y-monitor-de-parqueadero/` y su `.zip`), que duplicaba la maqueta y arrastraba `metadata.json`, `GEMINI_API_KEY` y un hub MQTT falso. También salen 31 scripts de sondeo de un solo uso (`probe-*`, `shot-*`, `mutar-plano.cjs`, `test-ws.mjs`), el prototipo `/prototypes/kiosco`, el logo duplicado `Unisucre.svg.webp` de la raíz y el rastro de Stitch (`.stitch/`, `.secrets/`, MCP en `opencode.json` y skills de `.opencode/`). Quedan solo `apps/`, `packages/`, `broker/`, `firmware/` y los scripts de operación (`broker.ps1`, `mqtt-*.ps1`, `provision-mqtt.ps1`). `pnpm -r check` y build en verde. Sin commits. | 1, 3, 6, 9, 14 |
| 2026-10-29 | **Endurecimiento de seguridad.** (1) Cabeceras en todas las respuestas del backend: CSP (`script-src 'self'`, `font-src 'self' data:`, `connect-src 'self'`, `frame-ancestors 'none'`, `base-uri 'none'`, `form-action 'self'`, `object-src 'none'`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, `Cross-Origin-Resource-Policy: same-origin`, `Permissions-Policy` restrictiva y HSTS solo sobre HTTPS. (2) `/api/historial/:id` y `/api/analitica/hoy` exigen `x-admin-token`; el cliente lo envía desde `sessionStorage` (`cabeceraOperador()`). (3) `ADMIN_TOKEN` rotado a 32 hex; fail-closed al arrancar y comparación en tiempo constante. (4) Dependencias: Fastify 5.12.7 + `overrides` en `pnpm-workspace.yaml` (`ajv>fast-uri 3.1.9`, `@fastify/ajv-compiler>fast-uri 4.2.3`, `fast-json-stringify>fast-uri 4.2.3`, `socks>ip-address 10.7.4`); `pnpm audit` sin hallazgos. (5) Contenedores endurecidos: usuarios 1883/1000, `read_only: true`, `cap_drop: ALL`, `no-new-privileges`, tmpfs acotados, `pids_limit`/`mem_limit`, repo `:ro`, imágenes fijadas; `8883` cerrado hasta el ESP32. (6) Sonda reutilizable `pnpm security:check` (30 pruebas) verificada en vivo: 30/30, incluyendo 12 payloads de inyección SQL bloqueados con 400, WS con origen ajeno → 403 y anónimo al broker rechazado (-4058). Base intacta con 30 plazas en SIN_DATO tras las pruebas. Sin commits (pendiente de pusheo). | 1, 2, 4, 6, 7, 9, 14 |
