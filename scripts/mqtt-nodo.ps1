#Requires -Version 7
<#
.SYNOPSIS
  Publica un estado como si fuera un nodo sensor, usando su certificado mTLS.

.DESCRIPTION
  Sirve para pruebas de banco: valida el certificado del nodo contra la CA local,
  se identifica con el CN y publica en `parq/<lote>/<nodo>/espacios/<espacio>/estado`.
  Si la ACL no le permite esa bahía, el broker rechaza el PUBLISH.

  El listener 8883 está cerrado hasta que llegue la placa. Para probar antes,
  levanta el broker de banco en 8884 y usa `-Puerto 8884`.

.EXAMPLE
  pnpm mqtt:nodo -Nodo nodo-e01 -Espacio E01 -Estado OCUPADO -Puerto 8884
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory)][string]$Nodo,
  [Parameter(Mandatory)][string]$Espacio,
  [Parameter(Mandatory)][ValidateSet("LIBRE", "OCUPADO")][string]$Estado,
  [string]$Lote = "lote1",
  [string]$Servidor = "127.0.0.1",
  [int]$Puerto = 8883,
  [switch]$SinRetener,
  [string]$MosquittoPub = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$map = Get-Content (Join-Path $root "broker/nodos.json") -Raw | ConvertFrom-Json

$nodoMapa = @($map.nodos) | Where-Object { $_.nombre -eq $Nodo } | Select-Object -First 1
if (-not $nodoMapa) { throw "El nodo '$Nodo' no está en broker/nodos.json" }
if (@($nodoMapa.espacios) -notcontains $Espacio) {
  throw "El nodo '$Nodo' no tiene asignada la bahía '$Espacio' (tiene: $($nodoMapa.espacios -join ', '))"
}

$certs = Join-Path $root "broker/certs"
$ca = Join-Path $certs "ca.crt"
$crt = Join-Path $certs "nodos/$Nodo.crt"
$key = Join-Path $certs "nodos/$Nodo.key"
foreach ($f in @($ca, $crt, $key)) {
  if (-not (Test-Path $f)) { throw "Falta $f. Corre primero: pnpm mqtt:provision" }
}

if (-not $MosquittoPub) {
  $cmd = Get-Command mosquitto_pub -ErrorAction SilentlyContinue
  if ($cmd) {
    $MosquittoPub = $cmd.Source
  } elseif (Test-Path "C:\Program Files\Mosquitto\mosquitto_pub.exe") {
    $MosquittoPub = "C:\Program Files\Mosquitto\mosquitto_pub.exe"
  } else {
    throw "No encontré mosquitto_pub. Pásalo con -MosquittoPub <ruta>."
  }
}

$payload = @{ v = 1; estado = $Estado } | ConvertTo-Json -Compress
$topic = "parq/$Lote/$Nodo/espacios/$Espacio/estado"

$argumentos = @(
  "-h", $Servidor,
  "-p", "$Puerto",
  "--cafile", $ca,
  "--cert", $crt,
  "--key", $key,
  "--tls-version", "tlsv1.2",
  "-t", $topic,
  "-q", "1",
  "-m", $payload
)
if (-not $SinRetener) { $argumentos += "-r" }

Write-Host "PUB $topic  $payload" -ForegroundColor Cyan
& $MosquittoPub @argumentos
if ($LASTEXITCODE -ne 0) { throw "mosquitto_pub falló (código $LASTEXITCODE)" }
Write-Host "aceptado por el broker" -ForegroundColor Green
