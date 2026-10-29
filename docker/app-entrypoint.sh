#!/bin/sh
# Arranque de la app en contenedor.
#
# Las credenciales viven en /repo/.env (lo escribe scripts/provision-mqtt.sh la
# primera vez). El compose pasa MQTT_URL/HOST/PORT/DB_PATH por variables de
# entorno, y Node da prioridad al entorno sobre --env-file, así que aquí solo
# se completa lo que falte.
set -e

cd /app/apps/server

# Las credenciales vienen por environment de compose; el .env es solo fallback.
# En Docker Desktop/Windows el volumen montado puede no ser legible por uid 1000.
if [ -f /repo/.env ] && [ -r /repo/.env ]; then
  tr -d '\r' < /repo/.env > /tmp/parq.env 2>/dev/null || true
  set -a
  . /tmp/parq.env 2>/dev/null || true
  set +a
fi

export MQTT_URL="${MQTT_URL:-mqtt://broker:1883}"
export MQTT_USER="${MQTT_USER:-backend}"
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-8000}"
export DB_PATH="${DB_PATH:-/data/parqueadero.db}"

exec node src/index.ts
