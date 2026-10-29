#Requires -Version 7
<#
.SYNOPSIS
  Genera la PKI local del broker y regenera broker/acl desde broker/nodos.json.

.DESCRIPTION
  Crea (si faltan) una CA local, el certificado del servidor y un certificado de
  cliente por nodo sensor. El CN del certificado de cada nodo es su nombre MQTT:
  Mosquitto lo usa como usuario (`use_identity_as_username true`), así que la ACL
  y los certificados salen del mismo mapa y no se pueden desincronizar.

  Los archivos privados quedan en broker/certs/ (gitignored) y con permisos
  restringidos al usuario actual en Windows.

.PARAMETER Force
  Rota los certificados de servidor y nodos conservando la CA actual. Los nodos
  con certificados viejos dejan de conectar hasta recibir los nuevos.

.PARAMETER NewCa
  Rota también la CA. Invalida todos los certificados emitidos: hay que volver a
  flashear cada nodo. Úsalo solo si la CA se comprometió.

.PARAMETER ServerHost
  Nombres o IP adicionales para el SAN del certificado del servidor (p. ej. la
  IP fija del PC del broker en la LAN del campus).

.PARAMETER OpenSsl
  Ruta explícita al ejecutable de OpenSSL. Por defecto se busca en PATH y en Git.
#>
[CmdletBinding()]
param(
  [switch]$Force,
  [switch]$NewCa,
  [string[]]$ServerHost = @(),
  [string]$OpenSsl = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$certs = Join-Path $root "broker/certs"
$nodesDir = Join-Path $certs "nodos"
$tmpDir = Join-Path $certs "tmp"
$mapPath = Join-Path $root "broker/nodos.json"
$aclPath = Join-Path $root "broker/acl"
$passwdPath = Join-Path $root "broker/passwd"

function Write-Paso([string]$Texto) {
  Write-Host ""
  Write-Host "== $Texto" -ForegroundColor Cyan
}

function Protect-File([string]$Path) {
  if (-not $IsWindows) { return }
  $me = "$env:USERDOMAIN\$env:USERNAME"
  & icacls.exe $Path /inheritance:r /grant:r "${me}:(R,W)" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "No se pudo restringir $Path a $me; revísalo a mano."
  }
}

function Invoke-OpenSsl {
  param([Parameter(Mandatory)][string[]]$Argumentos)
  & $script:OpenSsl @Argumentos
  if ($LASTEXITCODE -ne 0) {
    throw "OpenSSL falló (código $LASTEXITCODE): openssl $($Argumentos -join ' ')"
  }
}

# ---------------------------------------------------------------- requisitos
if (-not (Test-Path $mapPath)) { throw "Falta broker/nodos.json" }

$map = Get-Content $mapPath -Raw | ConvertFrom-Json

if (-not $OpenSsl) {
  # En Windows, el `openssl` del PATH suele ser el de Strawberry Perl, con un
  # OPENSSLDIR empaquetado que puede no existir. El de Git sí trae su openssl.cnf.
  $gitOpenSsl = "C:\Program Files\Git\usr\bin\openssl.exe"
  $cmd = Get-Command openssl -ErrorAction SilentlyContinue
  if (Test-Path $gitOpenSsl) {
    $OpenSsl = $gitOpenSsl
  } elseif ($cmd) {
    $OpenSsl = $cmd.Source
  } else {
    throw "OpenSSL no está en PATH. Instálalo o pásalo con -OpenSsl <ruta>."
  }
}
$script:OpenSsl = $OpenSsl

$version = (& $OpenSsl version) -join " "
Write-Host "OpenSSL: $version"

if (-not (Test-Path $passwdPath)) {
  throw "Falta broker/passwd. Créalo con: mosquitto_passwd -c -b broker/passwd backend <clave>"
}
$usuarios = @(Get-Content $passwdPath | ForEach-Object { ($_ -split ":")[0] })
if ($usuarios -notcontains $map.backend.usuario) {
  throw "broker/passwd no contiene el usuario '$($map.backend.usuario)'."
}
if ($map.lote -notmatch '^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$') {
  throw "Lote inválido en nodos.json: '$($map.lote)'"
}

# Validación del mapa antes de escribir nada.
$nombresNodo = @()
$bahiasUsadas = @{}
foreach ($n in @($map.nodos)) {
  if ($n.nombre -notmatch '^[a-z0-9][a-z0-9-]{1,31}$') {
    throw "Nombre de nodo inválido: '$($n.nombre)' (minúsculas, números y guion; 2-32 chars)"
  }
  if ($nombresNodo -contains $n.nombre) { throw "Nodo duplicado: $($n.nombre)" }
  if ($n.nombre -eq $map.backend.usuario) { throw "El nodo no puede llamarse '$($n.nombre)'" }
  if (@($n.espacios).Count -eq 0) { throw "El nodo $($n.nombre) no declara espacios" }

  foreach ($e in @($n.espacios)) {
    if ($e -notmatch '^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$') {
      throw "Espacio inválido en $($n.nombre): '$e'"
    }
    if ($bahiasUsadas.ContainsKey($e)) {
      throw "El espacio $e está asignado a $($bahiasUsadas[$e]) y a $($n.nombre): un nodo comprometido podría falsear la otra plaza."
    }
    $bahiasUsadas[$e] = $n.nombre
  }
  $nombresNodo += $n.nombre
}

foreach ($id in @($map.backend.identidades)) {
  if ($id -notmatch '^[a-z0-9][a-z0-9-]{1,31}$') {
    throw "Identidad de backend inválida: '$id'"
  }
  if ($nombresNodo -contains $id) {
    throw "La identidad '$id' del backend choca con un nodo sensor"
  }
}

New-Item -ItemType Directory -Force -Path $certs, $nodesDir, $tmpDir | Out-Null

# --------------------------------------------------------------------- CA
$rotarCa = $NewCa -or -not (Test-Path (Join-Path $certs "ca.key"))
if ($rotarCa) {
  Write-Paso "CA local"
  if ($NewCa) {
    Write-Warning "NewCa: se invalida todo certificado emitido antes. Hay que reflashear los nodos."
    Remove-Item (Join-Path $certs "ca.key"), (Join-Path $certs "ca.crt"), (Join-Path $certs "ca.srl") -ErrorAction SilentlyContinue
  }
  Invoke-OpenSsl -Argumentos @(
    "req", "-x509", "-new", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:P-256", "-nodes",
    "-keyout", (Join-Path $certs "ca.key"), "-out", (Join-Path $certs "ca.crt"),
    "-days", "3650", "-sha256",
    "-subj", "/CN=Parqueadero Unisucre CA/O=Universidad de Sucre",
    "-addext", "basicConstraints=critical,CA:TRUE,pathlen:0",
    "-addext", "keyUsage=critical,keyCertSign,cRLSign",
    "-addext", "subjectKeyIdentifier=hash"
  )
  Protect-File (Join-Path $certs "ca.key")
  Write-Host "CA creada: broker/certs/ca.crt (10 años)"
} else {
  Write-Host "CA existente: broker/certs/ca.crt"
}

# -------------------------------------------------------- servidor (TLS)
$rotarHojas = $Force -or $rotarCa
$serverKey = Join-Path $certs "server.key"
$serverCrt = Join-Path $certs "server.crt"

if ($rotarHojas -or -not (Test-Path $serverCrt) -or -not (Test-Path $serverKey)) {
  Write-Paso "Certificado del servidor"

  $hosts = @("localhost", "127.0.0.1")
  $equipo = [System.Net.Dns]::GetHostName()
  if ($equipo) { $hosts += $equipo }
  if (Get-Command Get-NetIPAddress -ErrorAction SilentlyContinue) {
    $hosts += @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
      Select-Object -ExpandProperty IPAddress)
  }
  $hosts += $ServerHost
  $hosts = @($hosts | Where-Object { $_ } | Select-Object -Unique)
  $san = ($hosts | ForEach-Object {
    if ($_ -match '^\d{1,3}(\.\d{1,3}){3}$') { "IP:$_" } else { "DNS:$_" }
  }) -join ", "

  $csr = Join-Path $tmpDir "server.csr"
  $ext = Join-Path $tmpDir "server.ext"
  Invoke-OpenSsl -Argumentos @(
    "req", "-new", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:P-256", "-nodes",
    "-keyout", $serverKey, "-out", $csr,
    "-subj", "/CN=parq-broker/O=Universidad de Sucre"
  )
  @"
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = $san
"@ | Set-Content -Encoding ascii -Path $ext
  Invoke-OpenSsl -Argumentos @(
    "x509", "-req", "-in", $csr,
    "-CA", (Join-Path $certs "ca.crt"), "-CAkey", (Join-Path $certs "ca.key"),
    "-CAserial", (Join-Path $certs "ca.srl"), "-CAcreateserial",
    "-out", $serverCrt, "-days", "825", "-sha256", "-extfile", $ext
  )
  Protect-File $serverKey
  Write-Host "Servidor: broker/certs/server.crt"
  Write-Host "SAN: $san"
} else {
  Write-Host "Certificado del servidor existente (usa -Force para rotarlo)"
}

# ------------------------------------------------------- nodos (mTLS)
Write-Paso "Certificados de nodos"
foreach ($n in @($map.nodos)) {
  $nombre = $n.nombre
  $key = Join-Path $nodesDir "$nombre.key"
  $crt = Join-Path $nodesDir "$nombre.crt"
  $pem = Join-Path $nodesDir "$nombre.pem"

  if (-not $rotarHojas -and (Test-Path $crt) -and (Test-Path $key)) {
    Write-Host "  $nombre ya existe"
    continue
  }

  $csr = Join-Path $tmpDir "$nombre.csr"
  $ext = Join-Path $tmpDir "$nombre.ext"
  Invoke-OpenSsl -Argumentos @(
    "req", "-new", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:P-256", "-nodes",
    "-keyout", $key, "-out", $csr,
    "-subj", "/CN=$nombre/O=Universidad de Sucre"
  )
  @"
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature
extendedKeyUsage = clientAuth
subjectAltName = DNS:$nombre
"@ | Set-Content -Encoding ascii -Path $ext
  Invoke-OpenSsl -Argumentos @(
    "x509", "-req", "-in", $csr,
    "-CA", (Join-Path $certs "ca.crt"), "-CAkey", (Join-Path $certs "ca.key"),
    "-CAserial", (Join-Path $certs "ca.srl"), "-CAcreateserial",
    "-out", $crt, "-days", "825", "-sha256", "-extfile", $ext
  )
  [IO.File]::WriteAllText($pem, (Get-Content -Raw $crt) + "`n" + (Get-Content -Raw $key))
  Protect-File $key
  Protect-File $pem
  Write-Host "  $nombre -> $($n.espacios -join ', ')"
}

# Verificación de cadena: si algo quedó mal firmado, falla aquí y no en el nodo.
Write-Paso "Verificando cadena"
Invoke-OpenSsl -Argumentos @("verify", "-CAfile", (Join-Path $certs "ca.crt"), $serverCrt) | Out-Null
foreach ($n in @($map.nodos)) {
  Invoke-OpenSsl -Argumentos @("verify", "-CAfile", (Join-Path $certs "ca.crt"), (Join-Path $nodesDir "$($n.nombre).crt")) | Out-Null
}
Write-Host "Cadena válida para servidor y $($nombresNodo.Count) nodo(s)."

# --------------------------------------------------------------------- ACL
Write-Paso "ACL"
$lineas = @(
  '# GENERADO por scripts/provision-mqtt.ps1 desde broker/nodos.json.',
  '# No editar a mano: el proximo "pnpm mqtt:provision" lo sobrescribe.',
  "#",
  "# backend  -> listener 1883 (loopback, usuario/clave). Lee todo y solo escribe",
  "#             el plano de control; no puede hacerse pasar por un sensor.",
  "# nodos    -> listener 8883 (mTLS). El CN del certificado es el usuario y solo",
  "#             puede escribir las bahías que tiene asignadas en nodos.json.",
  "",
  "user $($map.backend.usuario)",
  "topic read parq/#",
  "topic write parq/+/disponibles"
)
foreach ($id in @($map.backend.identidades)) {
  $lineas += "topic write parq/+/$id/espacios/+/estado"
}
$lineas += "topic write parq/+/+/comandos/#"
$lineas += ""

foreach ($n in @($map.nodos)) {
  $lineas += "user $($n.nombre)"
  foreach ($e in @($n.espacios)) {
    $lineas += "topic write parq/$($map.lote)/$($n.nombre)/espacios/$e/estado"
  }
  $lineas += "topic read parq/$($map.lote)/$($n.nombre)/comandos/#"
  $lineas += ""
}
[IO.File]::WriteAllLines($aclPath, $lineas, [Text.UTF8Encoding]::new($false))
Write-Host "Escrito broker/acl ($($lineas.Count) líneas)"

# Certificados de nodos que ya no están en el mapa: la ACL ya no los autoriza,
# pero conviene retirarlos del disco y de los nodos físicos.
$esperados = @($map.nodos | ForEach-Object { "$($_.nombre).crt" })
Get-ChildItem -Path $nodesDir -Filter "*.crt" -File -ErrorAction SilentlyContinue |
  Where-Object { $esperados -notcontains $_.Name } |
  ForEach-Object { Write-Warning "Certificado huérfano (nodo fuera del mapa): $($_.FullName)" }

Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue

# --------------------------------------------------------------- resumen
Write-Paso "Listo"
Write-Host "CA        : broker/certs/ca.crt"
Write-Host "Servidor  : broker/certs/server.crt + server.key"
foreach ($n in @($map.nodos)) {
  Write-Host "Nodo      : broker/certs/nodos/$($n.nombre).crt + .key (+ .pem para el ESP32)"
}
Write-Host ""
Write-Host "El listener 8883 sigue comentado en broker/mosquitto.conf." -ForegroundColor Yellow
Write-Host "Para probar sin abrir la LAN, levanta un broker de banco en 1884/8884"
Write-Host "con el mismo ACL y certificados (ver §6 del documento de contexto)."
Write-Host ""
Write-Host "El backend sigue igual: mqtt://127.0.0.1:1883 con usuario/clave." -ForegroundColor Green
