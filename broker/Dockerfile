# Broker Mosquitto con las herramientas para aprovisionar la PKI.
# La imagen oficial trae el broker; aquí se suman openssl, jq y los clientes
# MQTT para que `scripts/provision-mqtt.sh` corra dentro del contenedor.
#
# Versión fijada a la misma del broker nativo (2.1.2) para que el comportamiento
# de plugins, TLS y ACL sea el mismo en las dos instalaciones.
FROM eclipse-mosquitto:2.1.2-alpine

USER root
RUN apk add --no-cache bash jq openssl \
    && (command -v mosquitto_passwd >/dev/null 2>&1 || apk add --no-cache mosquitto) \
    && (command -v mosquitto_sub >/dev/null 2>&1 || apk add --no-cache mosquitto-clients) \
    && mosquitto -h 2>&1 | head -n 1

COPY broker/docker-entrypoint.sh /usr/local/bin/parq-broker.sh
RUN chmod +x /usr/local/bin/parq-broker.sh

EXPOSE 1883 8883
ENTRYPOINT ["/usr/local/bin/parq-broker.sh"]
CMD ["mosquitto", "-c", "/mosquitto/mosquitto.conf"]
