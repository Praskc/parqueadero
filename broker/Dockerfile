# Broker Mosquitto con las herramientas para aprovisionar la PKI.
# La imagen oficial trae el broker; aquí se suman openssl, jq y los clientes
# MQTT para que `scripts/provision-mqtt.sh` corra dentro del contenedor.
FROM eclipse-mosquitto:2

USER root
RUN apk add --no-cache bash jq openssl \
    && (command -v mosquitto_passwd >/dev/null 2>&1 || apk add --no-cache mosquitto-clients) \
    && (command -v mosquitto_sub >/dev/null 2>&1 || apk add --no-cache mosquitto-clients)

COPY broker/docker-entrypoint.sh /usr/local/bin/parq-broker.sh
RUN chmod +x /usr/local/bin/parq-broker.sh

EXPOSE 1883 8883
ENTRYPOINT ["/usr/local/bin/parq-broker.sh"]
CMD ["mosquitto"]
