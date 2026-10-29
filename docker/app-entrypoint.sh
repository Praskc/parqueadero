#!/bin/sh
set -e

cd /app/apps/server

# Las credenciales vienen por environment de compose; el .env es solo fallback.
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
