/*
 * nodo-parqueadero — E01 + talanquera, sin WiFi ni MQTT.
 *
 * Pines tomados del código viejo:
 *   TRIG 5 | ECHO 19 | IR 21 | Servo 18 | LED rojo 22 | LED verde 23
 *
 * Lógica:
 *   - IR de E01: muestreo cada 20 ms, confirmación 500 ms ocupado /
 *     2000 ms libre. Solo reporta el cambio confirmado.
 *   - Ultrasónico: una lectura cada 60 ms, mediana de las últimas 5,
 *     histéresis 15 cm (abre) / 25 cm (cierra).
 *   - Talanquera: abre al detectar vehículo y cierra 3 s después de
 *     que el haz queda libre. Sin delays bloqueantes.
 *   - LEDs: rojo = E01 ocupado, verde = E01 libre.
 *
 * NOTA ELÉCTRICA:
 *   - El ECHO del HC-SR04 es de 5 V: usa divisor (1 kΩ / 2 kΩ) a GPIO19.
 *   - El OUT del FC-51 suele ser de 5 V: aliméntalo a 3.3 V o divídelo.
 *   - El servo va a fuente de 5 V aparte, con GND común al ESP32.
 */

#include <ESP32Servo.h>

// ------------------------------ Pines -------------------------------------

constexpr uint8_t TRIG_PIN = 5;
constexpr uint8_t ECHO_PIN = 19;
constexpr uint8_t IR_PIN = 21;
constexpr uint8_t SERVO_PIN = 18;
constexpr uint8_t LED_ROJO = 22;
constexpr uint8_t LED_VERDE = 23;

// ------------------------------ Ajustes -----------------------------------

/** FC-51 típico: LOW cuando detecta obstáculo. */
constexpr bool IR_ACTIVO_BAJO = true;

constexpr uint32_t IR_PERIODO_MS = 20;
constexpr uint32_t IR_CONFIRMA_OCUPADO_MS = 500;
constexpr uint32_t IR_CONFIRMA_LIBRE_MS = 2000;

constexpr uint32_t US_PERIODO_MS = 60;
constexpr uint32_t US_TIMEOUT_US = 30000;  // ~5 m de alcance máximo
constexpr int US_ABRE_CM = 15;
constexpr int US_CIERRA_CM = 25;
constexpr uint8_t US_VENTANA = 5;  // mediana móvil

constexpr uint32_t TALANQUERA_ESPERA_MS = 3000;
constexpr int SERVO_CERRADO = 0;
constexpr int SERVO_ABIERTO = 90;
constexpr uint16_t SERVO_MIN_US = 500;
constexpr uint16_t SERVO_MAX_US = 2400;

constexpr uint32_t PERIODO_REPORTE_MS = 5000;

// ------------------------------ Estado ------------------------------------

struct PuestoIR {
  bool estable;      // true = OCUPADO confirmado
  bool crudo;        // última muestra
  uint32_t tCambio;  // desde cuándo la muestra difiere del estado estable
};

PuestoIR e01;

enum class EstadoTalanquera : uint8_t { CERRADA, ABIERTA, ESPERANDO };

Servo talanquera;
EstadoTalanquera estadoTalanquera = EstadoTalanquera::CERRADA;
uint32_t tCierre = 0;

uint32_t tIR = 0;
uint32_t tUS = 0;
uint32_t tReporte = 0;

int distanciaCm = -1;
bool vehiculoCerca = false;

int usLecturas[US_VENTANA];
uint8_t usCount = 0;
uint8_t usIdx = 0;

// ------------------------------ Utilidades --------------------------------

bool leerIR() {
  const int nivel = digitalRead(IR_PIN);
  return IR_ACTIVO_BAJO ? (nivel == LOW) : (nivel == HIGH);
}

const char* nombreTalanquera() {
  switch (estadoTalanquera) {
    case EstadoTalanquera::CERRADA:
      return "CERRADA";
    case EstadoTalanquera::ABIERTA:
      return "ABIERTA";
    case EstadoTalanquera::ESPERANDO:
      return "ESPERANDO CIERRE";
  }
  return "?";
}

void actualizarLEDs() {
  digitalWrite(LED_ROJO, e01.estable ? HIGH : LOW);
  digitalWrite(LED_VERDE, e01.estable ? LOW : HIGH);
}

void imprimirEstado() {
  Serial.println("---- estado ----");
  Serial.printf("E01: %-7s (crudo=%u)\n",
                e01.estable ? "OCUPADO" : "LIBRE", e01.crudo ? 1 : 0);
  Serial.printf("Ultrasonido: %d cm | cerca=%u | talanquera=%s\n", distanciaCm,
                vehiculoCerca ? 1 : 0, nombreTalanquera());
}

void abrirTalanquera() {
  talanquera.write(SERVO_ABIERTO);
  estadoTalanquera = EstadoTalanquera::ABIERTA;
  Serial.println("[TALANQUERA] abierta");
}

void cerrarTalanquera() {
  talanquera.write(SERVO_CERRADO);
  estadoTalanquera = EstadoTalanquera::CERRADA;
  Serial.println("[TALANQUERA] cerrada");
}

// ------------------------------- IR E01 -----------------------------------

void procesarIR(uint32_t ahora) {
  const bool crudo = leerIR();
  e01.crudo = crudo;

  if (crudo == e01.estable) {
    e01.tCambio = ahora;
    return;
  }

  const uint32_t espera =
      crudo ? IR_CONFIRMA_OCUPADO_MS : IR_CONFIRMA_LIBRE_MS;
  if (ahora - e01.tCambio < espera) return;

  e01.estable = crudo;
  e01.tCambio = ahora;
  Serial.printf("[%8lu] E01 %s\n", (unsigned long)ahora,
                e01.estable ? "OCUPADO" : "LIBRE");
  actualizarLEDs();
}

// ----------------------------- Ultrasónico --------------------------------

int medirDistanciaCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  const unsigned long duracion = pulseIn(ECHO_PIN, HIGH, US_TIMEOUT_US);
  if (duracion == 0) return -1;

  const int cm = (int)(duracion * 0.0343f / 2.0f);
  if (cm < 2 || cm > 400) return -1;
  return cm;
}

void agregarLecturaUS(int d) {
  if (d <= 0) return;
  usLecturas[usIdx] = d;
  usIdx = (usIdx + 1) % US_VENTANA;
  if (usCount < US_VENTANA) usCount++;
}

int medianaUS() {
  if (usCount < 3) return -1;  // espera suficientes muestras

  int v[US_VENTANA];
  for (uint8_t i = 0; i < usCount; i++) v[i] = usLecturas[i];

  for (uint8_t i = 1; i < usCount; i++) {
    const int clave = v[i];
    int j = i - 1;
    while (j >= 0 && v[j] > clave) {
      v[j + 1] = v[j];
      j--;
    }
    v[j + 1] = clave;
  }
  return v[usCount / 2];
}

void actualizarPresencia(int d) {
  if (d <= 0) return;

  const bool antes = vehiculoCerca;
  if (d <= US_ABRE_CM) {
    vehiculoCerca = true;
  } else if (d >= US_CIERRA_CM) {
    vehiculoCerca = false;
  }

  if (antes != vehiculoCerca) {
    Serial.printf("[ULTRASONIDO] %s (%d cm)\n",
                  vehiculoCerca ? "vehículo cerca" : "sin vehículo", d);
  }
}

void actualizarTalanquera(uint32_t ahora) {
  switch (estadoTalanquera) {
    case EstadoTalanquera::CERRADA:
      if (vehiculoCerca) abrirTalanquera();
      break;

    case EstadoTalanquera::ABIERTA:
      if (!vehiculoCerca) {
        estadoTalanquera = EstadoTalanquera::ESPERANDO;
        tCierre = ahora;
      }
      break;

    case EstadoTalanquera::ESPERANDO:
      if (vehiculoCerca) {
        estadoTalanquera = EstadoTalanquera::ABIERTA;
        Serial.println("[TALANQUERA] vehículo de nuevo cerca");
      } else if (ahora - tCierre >= TALANQUERA_ESPERA_MS) {
        cerrarTalanquera();
      }
      break;
  }
}

// ------------------------------- Serial -----------------------------------

void atenderSerial() {
  if (!Serial.available()) return;

  switch (Serial.read()) {
    case 'e':
    case 'E':
      imprimirEstado();
      break;

    case 'r':
    case 'R':
      e01.tCambio = millis();
      usCount = 0;
      usIdx = 0;
      Serial.println("filtros reiniciados");
      break;

    case 'a':
    case 'A':
      abrirTalanquera();
      tCierre = millis();
      Serial.println("apertura manual: cierra 3 s después si no hay vehículo");
      break;

    default:
      break;
  }
}

// ------------------------------- Arduino ----------------------------------

void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println();
  Serial.println("parqueadero-nodo | E01 + talanquera");
  Serial.println("Pines: TRIG=5 ECHO=19 IR=21 SERVO=18 LED_R=22 LED_V=23");

  pinMode(TRIG_PIN, OUTPUT);
  // Pull-down débil: si el HC-SR04 no está conectado, ECHO no queda flotando
  // ni dispara lecturas falsas. El sensor lo maneja sin problema al estar cerca.
  pinMode(ECHO_PIN, INPUT_PULLDOWN);
  pinMode(IR_PIN, INPUT_PULLUP);
  pinMode(LED_ROJO, OUTPUT);
  pinMode(LED_VERDE, OUTPUT);

  digitalWrite(TRIG_PIN, LOW);

  ESP32PWM::allocateTimer(0);
  talanquera.setPeriodHertz(50);
  talanquera.attach(SERVO_PIN, SERVO_MIN_US, SERVO_MAX_US);
  talanquera.write(SERVO_CERRADO);

  e01.estable = false;
  e01.crudo = leerIR();
  e01.tCambio = millis();
  actualizarLEDs();

  Serial.println("Comandos: e = estado, r = reiniciar filtros, a = abrir 3 s");
  imprimirEstado();
}

void loop() {
  const uint32_t ahora = millis();

  if (ahora - tIR >= IR_PERIODO_MS) {
    tIR = ahora;
    procesarIR(ahora);
  }

  if (ahora - tUS >= US_PERIODO_MS) {
    tUS = ahora;

    const int d = medirDistanciaCm();
    agregarLecturaUS(d);

    const int mediana = medianaUS();
    if (mediana > 0) {
      distanciaCm = mediana;
      actualizarPresencia(mediana);
    }

    actualizarTalanquera(ahora);
  }

  if (ahora - tReporte >= PERIODO_REPORTE_MS) {
    tReporte = ahora;
    imprimirEstado();
  }

  atenderSerial();
}
