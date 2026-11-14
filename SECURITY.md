# Seguridad

## Versiones cubiertas

Solo la rama `main`. El proyecto no mantiene versiones anteriores.

## Cómo reportar una vulnerabilidad

Usa el reporte privado de GitHub: pestaña **Security** → **Report a vulnerability**. El aviso queda visible solo para los mantenedores y no abre un issue público. El mismo contacto está declarado en `/.well-known/security.txt` (RFC 9116).

No publiques detalles explotables en un issue, en un pull request ni en la sección de discusiones.

Si el hallazgo incluye una credencial real, cámbiala antes de reportar: `MQTT_PASS` y `ADMIN_TOKEN` se rotan en `.env` y con `pnpm mqtt:provision`.

## Alcance

| Componente | Qué se revisa |
|---|---|
| `apps/server` | Inyección SQL, autenticación, autorización, WebSocket, cabeceras y validación de topics |
| `broker` | TLS mutuo, ACL por certificado, límites de paquete y de conexiones |
| `apps/web` | XSS, CSP, manejo del token de operador y del almacenamiento del navegador |
| `compose.yaml` y `Dockerfile` | Contenedores sin privilegios, solo lectura y sin secretos incrustados |

## Fuera de alcance

- El nodo sensor. No está en este repositorio y se documenta solo como contrato MQTT.
- La red del campus, el equipo del kiosco y el firewall.
- Ataques que requieran acceso físico al servidor.

## Qué esperar

El reporte se revisa y, si se confirma, se corrige en `main` antes de cualquier aviso público. El tiempo depende de la disponibilidad de los mantenedores y de la gravedad, así que no hay un plazo comprometido.
