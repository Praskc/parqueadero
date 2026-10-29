#!/usr/bin/env bash
# Genera la configuración del broker dentro del contenedor.
#
# El repo trae broker/mosquitto.conf para la instalación nativa (Windows, rutas
# relativas y plugins .dll). En el contenedor las rutas cambian y la versión de
# Mosquitto puede traer plugins o no, así que aquí se arma la configuración
# equivalente detectando qué hay disponible.
#
# El contenedor corre como usuario sin privilegios (1883) y con el sistema de
# archivos de solo lectura: todo lo que se escribe vive en un tmpfs y el
# material de la PKI se copia desde el repo montado en :ro.
#
# Fuentes de verdad (repo montado en /repo):
#   /repo/broker/passwd  usuarios con clave
#   /repo/broker/acl     ACL por identidad
#   /repo/broker/certs   CA y certificados (solo si se abre el listener 8883)
set -euo pipefail

REPO="${REPO:-/repo}"
CONF_DIR=/mosquitto/config
CONF=/mosquitto/mosquitto.conf
DATA_DIR=/mosquitto/data

mkdir -p "$CONF_DIR" "$DATA_DIR" "$CONF_DIR/certs"

# ------------------------------------------------------------- plugins o 2.0
PLUGIN_DIR=""
for d in /usr/lib/mosquitto "/usr/lib/$(uname -m)-linux-gnu/mosquitto" /usr/local/lib/mosquitto; do
  [ -d "$d" ] && PLUGIN_DIR="$d"
done
PASSWD_PLUGIN=""
ACL_PLUGIN=""
if [ -n "$PLUGIN_DIR" ]; then
  [ -f "$PLUGIN_DIR/mosquitto_password_file.so" ] && PASSWD_PLUGIN="$PLUGIN_DIR/mosquitto_password_file.so"
  [ -f "$PLUGIN_DIR/mosquitto_acl_file.so" ] && ACL_PLUGIN="$PLUGIN_DIR/mosquitto_acl_file.so"
fi

# ------------------------------------------- generar passwd y ACL dentro del contenedor
# No se copian desde el volumen montado (en Docker Desktop sobre Windows los
# permisos de archivos montados no se traducen entre root (mqtt-init) y el
# usuario 1883 del broker). Se generan aquí usando las variables de entorno.
if [ -n "${MQTT_USER:-}" ] && [ -n "${MQTT_PASS:-}" ]; then
  mosquitto_passwd -c -b "$CONF_DIR/passwd" "${MQTT_USER}" "${MQTT_PASS}"
else
  mosquitto_passwd -c -b "$CONF_DIR/passwd" "backend" "${MQTT_PASS:-changeme}"
fi
chmod 640 "$CONF_DIR/passwd"

cat > "$CONF_DIR/acl" <<EOF
user ${MQTT_USER:-backend}
topic read parq/#
topic write parq/+/disponibles
topic write parq/+/+/comandos/#
EOF
chmod 640 "$CONF_DIR/acl"

# --------------------------------------------------- listener de nodos (8883)
# CERRADO por defecto: se abre cuando llegue la placa ESP32.
NODES_LISTENER="${NODES_LISTENER:-0}"
if [ "$NODES_LISTENER" = "1" ]; then
  cp "$REPO/broker/certs/ca.crt" "$REPO/broker/certs/server.crt" "$REPO/broker/certs/server.key" "$CONF_DIR/certs/"
  chmod 600 "$CONF_DIR/certs/server.key"
  chmod 644 "$CONF_DIR/certs/ca.crt" "$CONF_DIR/certs/server.crt"
fi

# ------------------------------------------------------------- configuración
{
  echo "# Generado por broker/docker-entrypoint.sh (no editar a mano)."
  echo "# Equivalente en contenedor de broker/mosquitto.conf."
  echo ""

  if [ -n "$PASSWD_PLUGIN" ] && [ -n "$ACL_PLUGIN" ]; then
    echo "# Mosquitto 2.1: plugins (password_file/acl_file están deprecados)."
    echo "plugin_load passwd $PASSWD_PLUGIN"
    echo "plugin_opt_password_file $CONF_DIR/passwd"
    echo "plugin_load acl $ACL_PLUGIN"
    echo "plugin_opt_acl_file $CONF_DIR/acl"
  else
    echo "# Mosquitto 2.0: directivas clásicas por listener."
    echo "per_listener_settings true"
  fi

  echo ""
  echo "# ---- backend (usuario/clave + ACL), solo alcanzable desde el host"
  echo "listener 1883 0.0.0.0"
  echo "listener_allow_anonymous false"
  if [ -n "$PASSWD_PLUGIN" ] && [ -n "$ACL_PLUGIN" ]; then
    echo "plugin_use passwd"
    echo "plugin_use acl"
  else
    echo "password_file $CONF_DIR/passwd"
    echo "acl_file $CONF_DIR/acl"
  fi

  if [ "$NODES_LISTENER" = "1" ]; then
    echo ""
    echo "# ---- nodos sensores (mTLS). El certificado ES la identidad."
    echo "listener 8883 0.0.0.0"
    echo "listener_allow_anonymous false"
    echo "cafile $CONF_DIR/certs/ca.crt"
    echo "certfile $CONF_DIR/certs/server.crt"
    echo "keyfile $CONF_DIR/certs/server.key"
    echo "require_certificate true"
    echo "use_identity_as_username true"
    if [ -n "$PASSWD_PLUGIN" ] && [ -n "$ACL_PLUGIN" ]; then
      echo "plugin_use acl"
    else
      echo "acl_file $CONF_DIR/acl"
    fi
    echo "tls_version tlsv1.2"
  fi

  echo ""
  echo "# Los payloads del contrato son ~26 bytes: 1 KB es generoso."
  echo "max_packet_size 1024"
  echo "max_connections 64"
  echo ""
  echo "persistence true"
  echo "persistence_location $DATA_DIR/"
  echo "pid_file $DATA_DIR/mosquitto.pid"
  echo ""
  echo "log_dest stdout"
  echo "log_type error"
  echo "log_type warning"
  echo "log_type notice"
  echo "connection_messages true"
} > "$CONF"

chmod 640 "$CONF"

echo "[broker] configuración generada en $CONF"
if [ -n "$PASSWD_PLUGIN" ]; then
  echo "[broker] modo plugins (Mosquitto 2.1)"
else
  echo "[broker] modo clásico password_file/acl_file (Mosquitto 2.0)"
fi
[ "$NODES_LISTENER" = "1" ] && echo "[broker] listener 8883 (mTLS) ABIERTO"

exec "$@"
