# Suscripcion de evidencia: muestra cada mensaje MQTT del parqueadero en vivo.
$pass = (Select-String -Path apps/server/.env -Pattern 'MQTT_PASS=(.+)').Matches.Groups[1].Value
& "C:\Program Files\Mosquitto\mosquitto_sub.exe" -u backend -P $pass -t "parq/#" -v
