# Firmware del nodo

## Fase 0 — E01 + talanquera, sin MQTT

`nodo-parqueadero/nodo-parqueadero.ino` usa los pines del código viejo:

| Elemento | GPIO | Nota |
|---|---|---|
| HC-SR04 TRIG | 5 | Salida |
| HC-SR04 ECHO | 19 | **5 V: usar divisor a 3.3 V** |
| FC-51 de E01 (OUT) | 21 | Puesto E01 |
| Servo de talanquera | 18 | Señal; fuente de 5 V aparte |
| LED rojo | 22 | E01 ocupado |
| LED verde | 23 | E01 libre |

No hay WiFi ni MQTT todavía. La talanquera responde al ultrasónico y E01 se
reporta por serial.

### Lógica

- **E01:** muestreo cada 20 ms; `OCUPADO` tras 500 ms continuos y `LIBRE`
  tras 2 s. Solo se reporta el cambio confirmado.
- **Ultrasónico:** una lectura cada 60 ms, mediana móvil de 5 muestras.
  Abre a **≤ 15 cm** y cierra a **≥ 25 cm**; entre ambos valores conserva
  el estado (histéresis).
- **Talanquera:** abre al detectar un vehículo y cierra **3 s** después de
  que el haz queda libre. Es una máquina de estados sin `delay()`.
- **LEDs:** rojo con E01 ocupado, verde con E01 libre.

Con un solo ultrasónico no se distingue entrada de salida: la talanquera
abre para cualquier vehículo dentro de 15 cm. Tampoco se bloquea por E01
ocupado, para no dejar atrapada una moto que necesita salir.

### Conexión y seguridad eléctrica

- El `ECHO` del HC-SR04 entrega 5 V. No lo conectes directo a GPIO19:
  usa un divisor (1 kΩ / 2 kΩ) o un level shifter.
- El `OUT` del FC-51 también suele ser de 5 V. Alimenta el módulo a 3.3 V
  si lo permite, o divide la salida antes de GPIO21.
- El servo MG90S va a una fuente de **5 V aparte**, con GND común al ESP32.
  No lo alimentes del pin 3V3.
- LEDs con resistencia de 220–330 Ω a GND.

### Montaje

- FC-51 apuntando **a través** de la bahía, no al piso; altura 20–40 cm.
- HC-SR04 apuntando al carril de la talanquera, a la altura de la moto.
- Ajusta los potenciómetros de los módulos y verifica que una persona de
  paso no dispare el sistema.

### Prueba en banco

1. Abre el sketch en Arduino IDE, placa **ESP32 DevKit V1** y puerto COM3.
2. Carga y abre el monitor serie a **115200**.
3. Estado inicial esperado:
   ```
   parqueadero-nodo | E01 + talanquera
   Pines: TRIG=5 ECHO=19 IR=21 SERVO=18 LED_R=22 LED_V=23
   ---- estado ----
   E01: LIBRE   (crudo=0)
   Ultrasonido: -1 cm | cerca=0 | talanquera=CERRADA
   ```
4. Tapa el FC-51 menos de 0.5 s: no debe cambiar E01.
5. Tápalo 0.5 s o más: `E01 OCUPADO` y LED rojo.
6. Destápalo: tras 2 s, `E01 LIBRE` y LED verde.
7. Acerca la mano al HC-SR04 a menos de 15 cm: la talanquera abre.
8. Retira la mano: cierra 3 s después.
9. Escribe `a` para probar la apertura manual sin vehículo.
10. Escribe `e` para imprimir el estado y `r` para reiniciar los filtros.

### Qué falta antes de MQTT

- Calibrar `SERVO_CERRADO` / `SERVO_ABIERTO` con la talanquera real.
- Ajustar `US_ABRE_CM` / `US_CIERRA_CM` según la altura y el ángulo del sensor.
- Confirmar el GPIO definitivo del IR y el nivel real de salida del FC-51.
- Publicar E01 por MQTT: `parq/lote1/<nodo>/espacios/E01/estado`, QoS 1,
  payload `{"v":1,"estado":"OCUPADO"}`.
- Mantener apagada la simulación automática del HMI mientras el nodo real
  esté conectado.
