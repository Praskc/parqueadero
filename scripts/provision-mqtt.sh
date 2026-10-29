#!/usr/bin/env bash
# Aprovisiona la PKI local del broker y regenera broker/acl desde broker/nodos.json.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CERTS="$ROOT/broker/certs"
NODES_DIR="$CERTS/nodos"
TMP_DIR="$CERTS/tmp"
MAP="$ROOT/broker/nodos.json"
ACL="$ROOT/broker/acl"
PASSWD="$ROOT/broker/passwd"
ENV_ROOT="$ROOT/.env"
ENV_SERVER="$ROOT/apps/server/.env"
DATA_DIR="$ROOT/broker/data"

MQTT_USER="${MQTT_USER:-backend}"
SERVER_HOSTS="${SERVER_HOSTS:-}"

paso() { printf '\n== %s\n' "$1"; }
info() { printf '   %s\n' "$1"; }

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Falta '$1' en el sistema (openssl, jq, mosquitto_passwd)." >&2
    exit 1
  }
}
need openssl
need jq
need mosquitto_passwd

[ -f "$MAP" ] || { echo "Falta broker/nodos.json" >&2; exit 1; }

# ------------------------------------------------------------------- entorno
leer_env() { # archivo clave -> valor (vacío si no está)
  [ -f "$1" ] || return 0
  sed -n "s/^$2=//p" "$1" | tail -n 1 | tr -d '\r'
}

escribir_env() { # archivo clave valor
  local file="$1" key="$2" value="$3" tmp
  tmp="$(mktemp)"
  if [ -f "$file" ]; then
    grep -v "^${key}=" "$file" > "$tmp" || true
  fi
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  mv "$tmp" "$file"
}

PASS_ACTUAL="$(leer_env "$ENV_SERVER" MQTT_PASS)"
[ -n "$PASS_ACTUAL" ] || PASS_ACTUAL="$(leer_env "$ENV_ROOT" MQTT_PASS)"
[ -n "$PASS_ACTUAL" ] || PASS_ACTUAL="${MQTT_PASS:-}"
TOKEN_ACTUAL="$(leer_env "$ENV_SERVER" ADMIN_TOKEN)"
[ -n "$TOKEN_ACTUAL" ] || TOKEN_ACTUAL="$(leer_env "$ENV_ROOT" ADMIN_TOKEN)"
[ -n "$TOKEN_ACTUAL" ] || TOKEN_ACTUAL="${ADMIN_TOKEN:-}"

PASS_GENERADO=0
TOKEN_GENERADO=0
if [ -z "$PASS_ACTUAL" ]; then
  PASS_ACTUAL="$(openssl rand -hex 16)"
  PASS_GENERADO=1
fi
if [ -z "$TOKEN_ACTUAL" ]; then
  TOKEN_ACTUAL="$(openssl rand -hex 16)"
  TOKEN_GENERADO=1
fi

# --------------------------------------------------------- validación del mapa
LOTE="$(jq -r '.lote // empty' "$MAP")"
[ -n "$LOTE" ] || { echo "broker/nodos.json sin 'lote'" >&2; exit 1; }
case "$LOTE" in
  [A-Za-z0-9]*) ;;
  *) echo "Lote inválido: '$LOTE'" >&2; exit 1 ;;
esac
[[ "$LOTE" =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$ ]] || { echo "Lote inválido: '$LOTE'" >&2; exit 1; }

USUARIO_BACKEND="$(jq -r '.backend.usuario // empty' "$MAP")"
[ -n "$USUARIO_BACKEND" ] || USUARIO_BACKEND="$MQTT_USER"

mapfile -t IDENTIDADES < <(jq -r '.backend.identidades[]? // empty' "$MAP")
mapfile -t NOMBRES < <(jq -r '.nodos[]?.nombre' "$MAP")
mapfile -t BAHIAS < <(jq -r '.nodos[]?.espacios[]?' "$MAP")

[ "${#NOMBRES[@]}" -gt 0 ] || { echo "broker/nodos.json no declara nodos" >&2; exit 1; }

for n in "${NOMBRES[@]}"; do
  [[ "$n" =~ ^[a-z0-9][a-z0-9-]{1,31}$ ]] || { echo "Nombre de nodo inválido: '$n'" >&2; exit 1; }
  [ "$n" != "$USUARIO_BACKEND" ] || { echo "El nodo no puede llamarse '$n'" >&2; exit 1; }
done
for id in "${IDENTIDADES[@]:-}"; do
  [ -n "$id" ] || continue
  [[ "$id" =~ ^[a-z0-9][a-z0-9-]{1,31}$ ]] || { echo "Identidad inválida: '$id'" >&2; exit 1; }
  for n in "${NOMBRES[@]}"; do
    [ "$id" != "$n" ] || { echo "La identidad '$id' choca con un nodo sensor" >&2; exit 1; }
  done
done

# Una bahía en dos nodos permitiría falsear la otra plaza.
declare -A BAHIA_DUENO=()
for i in "${!NOMBRES[@]}"; do
  n="${NOMBRES[$i]}"
  bahias_nodo="$(jq -r --arg n "$n" '.nodos[] | select(.nombre==$n) | .espacios[]?' "$MAP")"
  [ -n "$bahias_nodo" ] || { echo "El nodo $n no declara espacios" >&2; exit 1; }
  while read -r e; do
    [ -n "$e" ] || continue
    [[ "$e" =~ ^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$ ]] || { echo "Espacio inválido en $n: '$e'" >&2; exit 1; }
    if [ -n "${BAHIA_DUENO[$e]:-}" ]; then
      echo "El espacio $e está en ${BAHIA_DUENO[$e]} y en $n" >&2
      exit 1
    fi
    BAHIA_DUENO["$e"]="$n"
  done <<< "$bahias_nodo"
done

mkdir -p "$CERTS" "$NODES_DIR" "$TMP_DIR" "$DATA_DIR"

# ------------------------------------------------------------------------ CA
rotar_ca=0
if [ "${NEW_CA:-0}" = "1" ] || [ ! -f "$CERTS/ca.key" ]; then
  rotar_ca=1
fi

paso "CA local"
if [ "$rotar_ca" = "1" ]; then
  [ "${NEW_CA:-0}" = "1" ] && echo "   AVISO: se invalida todo certificado emitido; hay que reflashear los nodos."
  rm -f "$CERTS/ca.key" "$CERTS/ca.crt" "$CERTS/ca.srl"
  openssl req -x509 -new -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes \
    -keyout "$CERTS/ca.key" -out "$CERTS/ca.crt" \
    -days 3650 -sha256 \
    -subj "/CN=Parqueadero Unisucre CA/O=Universidad de Sucre" \
    -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" \
    -addext "subjectKeyIdentifier=hash" >/dev/null 2>&1
  chmod 600 "$CERTS/ca.key"
  info "CA creada: broker/certs/ca.crt (10 años)"
else
  info "CA existente: broker/certs/ca.crt"
fi

# --------------------------------------------------------- certificado servidor
paso "Certificado del servidor"
server_key="$CERTS/server.key"
server_crt="$CERTS/server.crt"
rotar_hojas=0
if [ "${FORCE:-0}" = "1" ] || [ "$rotar_ca" = "1" ]; then
  rotar_hojas=1
fi

if [ "$rotar_hojas" = "1" ] || [ ! -f "$server_crt" ] || [ ! -f "$server_key" ]; then
  hosts="localhost,127.0.0.1,broker"
  hostname_s="$(hostname 2>/dev/null || true)"
  [ -n "$hostname_s" ] && hosts="$hosts,$hostname_s"
  if command -v ip >/dev/null 2>&1; then
    ips="$(ip -4 -o addr show scope global 2>/dev/null | awk '{split($4,a,"/"); print a[1]}' || true)"
    [ -n "$ips" ] && hosts="$hosts,$(echo "$ips" | paste -sd, -)"
  fi
  [ -n "$SERVER_HOSTS" ] && hosts="$hosts,$(echo "$SERVER_HOSTS" | tr ' ' ',')"
  san="$(echo "$hosts" | tr ',' '\n' | awk 'NF' | sort -u | while read -r h; do
    if echo "$h" | grep -Eq '^[0-9]{1,3}(\.[0-9]{1,3}){3}$'; then echo "IP:$h"; else echo "DNS:$h"; fi
  done | paste -sd, -)"

  cat > "$TMP_DIR/server.ext" <<EOF
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = $san
EOF
  openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes \
    -keyout "$server_key" -out "$TMP_DIR/server.csr" \
    -subj "/CN=parq-broker/O=Universidad de Sucre" >/dev/null 2>&1
  openssl x509 -req -in "$TMP_DIR/server.csr" \
    -CA "$CERTS/ca.crt" -CAkey "$CERTS/ca.key" \
    -CAserial "$CERTS/ca.srl" -CAcreateserial \
    -out "$server_crt" -days 825 -sha256 -extfile "$TMP_DIR/server.ext" >/dev/null 2>&1
  chmod 600 "$server_key"
  info "Servidor: broker/certs/server.crt"
  info "SAN: $san"
else
  info "Certificado del servidor existente (FORCE=1 para rotarlo)"
fi

# ---------------------------------------------------------- certificados nodos
paso "Certificados de nodos"
for n in "${NOMBRES[@]}"; do
  key="$NODES_DIR/$n.key"
  crt="$NODES_DIR/$n.crt"
  pem="$NODES_DIR/$n.pem"
  if [ "$rotar_hojas" = "0" ] && [ -f "$crt" ] && [ -f "$key" ]; then
    info "$n ya existe"
    continue
  fi
  cat > "$TMP_DIR/$n.ext" <<EOF
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature
extendedKeyUsage = clientAuth
subjectAltName = DNS:$n
EOF
  openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes \
    -keyout "$key" -out "$TMP_DIR/$n.csr" \
    -subj "/CN=$n/O=Universidad de Sucre" >/dev/null 2>&1
  openssl x509 -req -in "$TMP_DIR/$n.csr" \
    -CA "$CERTS/ca.crt" -CAkey "$CERTS/ca.key" \
    -CAserial "$CERTS/ca.srl" -CAcreateserial \
    -out "$crt" -days 825 -sha256 -extfile "$TMP_DIR/$n.ext" >/dev/null 2>&1
  cat "$crt" "$key" > "$pem"
  chmod 600 "$key" "$pem"
  chmod 644 "$crt"
  info "$n -> $(jq -r --arg n "$n" '[.nodos[] | select(.nombre==$n) | .espacios[]] | join(", ")' "$MAP")"
done

# --------------------------------------------------------------- verificación
paso "Verificando cadena"
openssl verify -CAfile "$CERTS/ca.crt" "$server_crt" >/dev/null
for n in "${NOMBRES[@]}"; do
  openssl verify -CAfile "$CERTS/ca.crt" "$NODES_DIR/$n.crt" >/dev/null
done
info "Cadena válida para el servidor y ${#NOMBRES[@]} nodo(s)."

# ----------------------------------------------------------------------- ACL
paso "ACL"
{
  echo "# GENERADO por scripts/provision-mqtt.sh desde broker/nodos.json."
  echo "# No editar a mano: el proximo aprovisionamiento lo sobrescribe."
  echo "#"
  echo "# backend  -> listener 1883 (usuario/clave). Lee todo y solo escribe"
  echo "#             el plano de control; no puede hacerse pasar por un sensor."
  echo "# nodos    -> listener 8883 (mTLS). El CN del certificado es el usuario y solo"
  echo "#             puede escribir las bahías que tiene asignadas en nodos.json."
  echo ""
  echo "user $USUARIO_BACKEND"
  echo "topic read parq/#"
  echo "topic write parq/+/disponibles"
  for id in "${IDENTIDADES[@]:-}"; do
    [ -n "$id" ] || continue
    echo "topic write parq/+/$id/espacios/+/estado"
  done
  echo "topic write parq/+/+/comandos/#"
  echo ""
  for n in "${NOMBRES[@]}"; do
    echo "user $n"
    for e in $(jq -r --arg n "$n" '.nodos[] | select(.nombre==$n) | .espacios[]?' "$MAP"); do
      echo "topic write parq/$LOTE/$n/espacios/$e/estado"
    done
    echo "topic read parq/$LOTE/$n/comandos/#"
    echo ""
  done
} > "$ACL"
info "Escrito broker/acl"

# ------------------------------------------------------------------- passwd
paso "Usuarios del broker"
[ -f "$PASSWD" ] && rm -f "$PASSWD"
mosquitto_passwd -c -b "$PASSWD" "$USUARIO_BACKEND" "$PASS_ACTUAL" || {
  echo "ERROR: mosquitto_passwd falló creando usuario '$USUARIO_BACKEND'" >&2
  exit 1
}
chmod 600 "$PASSWD"
info "broker/passwd: usuario '$USUARIO_BACKEND'"

# --------------------------------------------------------------------- .env
# Un solo origen de verdad para que la instalación nativa y la de Docker usen
# las mismas credenciales.
escribir_env "$ENV_ROOT" MQTT_USER "$USUARIO_BACKEND"
escribir_env "$ENV_ROOT" MQTT_PASS "$PASS_ACTUAL"
escribir_env "$ENV_ROOT" ADMIN_TOKEN "$TOKEN_ACTUAL"
mkdir -p "$(dirname "$ENV_SERVER")"
escribir_env "$ENV_SERVER" MQTT_USER "$USUARIO_BACKEND"
escribir_env "$ENV_SERVER" MQTT_PASS "$PASS_ACTUAL"
escribir_env "$ENV_SERVER" ADMIN_TOKEN "$TOKEN_ACTUAL"

rm -rf "$TMP_DIR"

# Permisos de lectura para que el broker (usuario 1883) pueda leer
# passwd y ACL montados desde el volumen del host.
chmod 644 "$PASSWD" "$ACL" 2>/dev/null || true
chmod 644 "$CERTS/ca.crt" 2>/dev/null || true

paso "Listo"
info "CA        : broker/certs/ca.crt"
info "Servidor  : broker/certs/server.crt + server.key"
for n in "${NOMBRES[@]}"; do
  info "Nodo      : broker/certs/nodos/$n.crt + .key (+ .pem para el ESP32)"
done
if [ "$PASS_GENERADO" = "1" ]; then
  echo ""
  echo "   MQTT_PASS generado: $PASS_ACTUAL"
fi
if [ "$TOKEN_GENERADO" = "1" ]; then
  echo "   ADMIN_TOKEN generado: $TOKEN_ACTUAL"
  echo "   (queda en .env y apps/server/.env; es la clave del panel de operador)"
fi
echo ""
echo "   El listener 8883 sigue cerrado. Para abrirlo:"
echo "     Docker : NODES_LISTENER=1 docker compose up -d broker"
echo "     Nativo : descomenta el bloque 8883 de broker/mosquitto.conf"
