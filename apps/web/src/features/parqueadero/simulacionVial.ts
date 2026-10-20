/**
 * Capa de simulación vial del HMI (solo presentación).
 *
 * El estado REAL de las bahías llega por WebSocket desde el backend (MQTT).
 * Las motos y la talanquera animadas son ilustrativas; toda ocupación se
 * publica por REST → MQTT con el contrato de §4 (mismos topics y payload que
 * usará el ESP32). Nada se "inventa" en el navegador.
 */
import { computed, reactive, ref } from "vue";
import type { Estado, MensajeWs } from "@parq/shared";
import { onMensaje } from "../../services/realtime";
import { setEstado } from "../../services/api";
import { logPublicacion } from "../../services/logMqtt";
import { limpiarToken, tokenAdmin } from "../../services/adminToken";
import { sonido } from "../../lib/sonido";
import { BAHIA_LAYOUT, CIRCULACION } from "../../config/bahias";
import type { AnimacionMoto, EstadoTalanquera, NotificacionHMI, Origen } from "../../types/hmi";

// ---------- Estado de la simulación ----------

export const talanquera = ref<EstadoTalanquera>("cerrada");
export const bloqueada = ref(false);
export const autoSimulacion = ref(false);
export const notificacion = ref<NotificacionHMI | null>(null);

const anims = reactive(new Map<string, AnimacionMoto>());
export const animaciones = computed(() => [...anims.values()]);
export const hayEsperando = computed(() =>
  animaciones.value.some((a) => a.etapa === "esperando"));

/** Espejo local del estado real de bahías (alimentado por el bus WS). */
const estados = reactive<Record<string, Estado | "SIN_DATO">>({});

/** Eventos publicados por esta capa: la respuesta del WS no debe re-animarse. */
const omitir = new Set<string>();

/** Respeta prefers-reduced-motion (MINTIC/WCAG 2.3.3): recorrido mínimo. */
const REDUCIR =
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Duraciones de maniobras (ms).
 * La maqueta original usaba 2500/3800/4000, pero con render entrecortado
 * (saltos de frame) que se percibía como velocidad. Con render fluido a
 * alta tasa de refresco esos mismos tiempos se ven a cámara lenta, así que
 * se acortaron para recuperar la percepción de agilidad.
 */
const DUR_CALLE = REDUCIR ? 500 : 1700;
const DUR_RUTA = REDUCIR ? 700 : 2600;
const DUR_SALIDA = REDUCIR ? 800 : 3000;

const uid = () => Math.random().toString(36).substring(2, 9);

const MODELOS: ("scooter" | "clasica" | "enduro" | "deportiva")[] = [
  "scooter",
  "clasica",
  "enduro",
  "deportiva",
];
const COLORES = [
  "#15803d", // Verde institucional
  "#0284c7", // Azul eléctrico
  "#dc2626", // Rojo vivo
  "#ea580c", // Naranja
  "#0f172a", // Negro grafito
  "#d97706", // Ámbar
  "#475569", // Gris titanio
];
const CASCOS = [
  "#eab308", // Amarillo seguridad
  "#ffffff", // Blanco
  "#0f172a", // Negro mate
  "#ef4444", // Rojo
  "#38bdf8", // Azul cielo
];

function randomMotoProps() {
  const modelo = MODELOS[Math.floor(Math.random() * MODELOS.length)];
  const color = COLORES[Math.floor(Math.random() * COLORES.length)];
  const cascoColor = CASCOS[Math.floor(Math.random() * CASCOS.length)];
  return { modelo, color, cascoColor };
}

/**
 * Inserta la animación y devuelve SIEMPRE el proxy reactivo.
 * Escribir sobre el objeto crudo después de `set()` no dispara Vue:
 * todos los tween deben mutar este proxy, no la referencia original.
 */
function addAnim(a: AnimacionMoto): AnimacionMoto {
  const props = randomMotoProps();
  const completo: AnimacionMoto = {
    ...props,
    ...a,
  };
  anims.set(completo.id, completo);
  return anims.get(completo.id)!;
}


/** ¿Ya hay una moto en camino hacia/desde esa bahía? (la bahía sigue LIBRE/OCUPADO hasta que el tween termina y publica) */
function bahiaReservada(id: string): boolean {
  return [...anims.values()].some((a) => a.espacioId === id);
}

function primeraLibre(): string | undefined {
  return BAHIA_LAYOUT.find((b) => estados[b.id] === "LIBRE" && !bahiaReservada(b.id))?.id;
}
function primeraOcupada(): string | undefined {
  return BAHIA_LAYOUT.find((b) => estados[b.id] === "OCUPADO" && !bahiaReservada(b.id))?.id;
}

/**
 * Separación de tráfico: la siguiente moto arranca unos ms después de las
 * activas para no montarse encima en la calle/corredor.
 */
function retardoPorTrafico(): number {
  return [...anims.values()].filter((a) => a.etapa !== "esperando").length * 800;
}

function notificar(
  tipo: NotificacionHMI["tipo"],
  titulo: string,
  mensaje: string,
  espacioId?: string,
  prioridad: NotificacionHMI["prioridad"] = "media",
) {
  notificacion.value = { id: uid(), tipo, titulo, mensaje, espacioId, timestamp: Date.now(), prioridad };
}

/** Publica en MQTT real (vía backend). Devuelve false si falta token o fue 401. */
async function publicar(id: string, estado: Estado, nodo: string): Promise<boolean> {
  const t = tokenAdmin();
  if (!t) {
    notificar("alerta", "Sin token de operador", "Abre la consola de operador e ingresa el token.", undefined, "alta");
    return false;
  }
  omitir.add(`${id}:${estado}`);
  const r = await setEstado(id, estado, t, nodo);
  if (r.status === 401) {
    omitir.delete(`${id}:${estado}`);
    limpiarToken();
    notificar("alerta", "Token inválido", "Vuelve a ingresarlo en la consola de operador.", undefined, "alta");
    return false;
  }
  if (r.ok) logPublicacion(id, estado, nodo);
  return r.ok;
}

// ---------- Talanquera (FSM visual local) ----------

/** Un solo temporizador evita que una apertura y un cierre se pisen. */
let timerTalanquera: number | null = null;

function cancelarTimerTalanquera() {
  if (timerTalanquera !== null) {
    window.clearTimeout(timerTalanquera);
    timerTalanquera = null;
  }
}

function programarEstadoTalanquera(estado: "abierta" | "cerrada", ms: number) {
  cancelarTimerTalanquera();
  timerTalanquera = window.setTimeout(() => {
    timerTalanquera = null;
    if (!bloqueada.value) talanquera.value = estado;
  }, ms);
}

function abrirTalanquera() {
  if (bloqueada.value) return;
  // Si ya está abierta o abriéndose no se reinicia el movimiento ni el sonido.
  if (talanquera.value === "abierta" || talanquera.value === "abriendo") return;
  sonido.talanquera();
  talanquera.value = "abriendo";
  programarEstadoTalanquera("abierta", 450);
}

function cerrarTalanquera() {
  if (bloqueada.value || hayMotoEnPuerta()) return;
  if (talanquera.value === "cerrada" || talanquera.value === "cerrando") return;
  talanquera.value = "cerrando";
  programarEstadoTalanquera("cerrada", 450);
}

function hayMotoEnPuerta(): boolean {
  return anims.size > 0 && [...anims.values()].some((a) =>
    a.etapa === "talanquera" || a.etapa === "esperando" || a.posicionActual.x < 30);
}

// ---------- Motor de animación (requestAnimationFrame) ----------

function tween(anim: AnimacionMoto, durMs: number, frame: (p: number) => void, done: () => void) {
  const t0 = performance.now();
  const step = (now: number) => {
    const viva = anims.get(anim.id);
    if (!viva) return;
    const p = Math.min(1, (now - t0) / durMs);
    frame(p);
    if (p < 1) requestAnimationFrame(step);
    else done();
  };
  requestAnimationFrame(step);
}

/** Tramo portería → bahía por el corredor central (3 fases):
 *  portería → corredor → avance hasta la columna del puesto → entrada al puesto. */
function tramoRuta(anim: AnimacionMoto, espacioId: string, publicarAlFinal: boolean) {
  const bahia = BAHIA_LAYOUT.find((b) => b.id === espacioId);
  if (!bahia) return;
  const corredorPct = CIRCULACION.corredorY; // y% del corredor (50%)
  const startY = anim.posicionActual.y;
  const objetivo = { x: bahia.posicion.x, y: bahia.posicion.y, rot: bahia.posicion.rotacion };
  const rotFinal = objetivo.rot === 90 ? -90 : 90;
  const corredorX = 27; // x% donde la rampa empalma con el corredor
  tween(anim, DUR_RUTA, (p) => {
    let x = 18, y = startY, rot = 0;
    if (p < 0.22) {
      // portería → corredor: avanza y empalma suavemente con el corredor central
      const q = p / 0.22;
      x = 18 + q * (corredorX - 18);
      y = startY + q * (corredorPct - startY);
      rot = 0;
      anim.etapa = "talanquera";
    } else if (p < 0.78) {
      // avanza por el corredor central hasta la columna del puesto asignado
      const q = (p - 0.22) / 0.56;
      x = corredorX + q * (objetivo.x - corredorX);
      y = corredorPct;
      rot = 0;
      anim.etapa = "ruta";
    } else {
      // gira suavemente y entra al puesto
      const q = (p - 0.78) / 0.22;
      x = objetivo.x;
      y = corredorPct + q * (objetivo.y - corredorPct);
      rot = q * rotFinal;
      anim.etapa = "estacionando";
    }
    anim.posicionActual = { x, y, rotacion: rot };
  }, () => {
    anims.delete(anim.id);
    if (publicarAlFinal) {
      sonido.parqueo();
      void publicar(espacioId, "OCUPADO", "porteria");
    }
    cerrarTalanquera();
  });
}

/** Salida: puesto → corredor → portería → calle exterior (la ruta de ingreso invertida). */
function animarSalida(espacioId: string, publicarAlFinal: boolean, retardoMs = 0) {
  const bahia = BAHIA_LAYOUT.find((b) => b.id === espacioId);
  if (!bahia) return;
  const anim = addAnim({
    id: uid(),
    tipo: "salida",
    espacioId,
    etapa: "estacionando",
    posicionActual: { ...bahia.posicion },
  });
  const ini = { ...bahia.posicion };
  const corredorPct = CIRCULACION.corredorY;
  const corredorX = 27;
  const exitLaneY = CIRCULACION.entradaY[1];
  window.setTimeout(() => {
    if (!anims.has(anim.id)) return;
    // La salida también abre la talanquera: antes se quedaba cerrada y la moto
    // atravesaba el brazo. Se abre al arrancar para que esté libre al llegar.
    abrirTalanquera();
    tween(anim, DUR_SALIDA, (p) => {
      let x = ini.x, y = ini.y, rot = ini.rotacion;
      if (p < 0.2) {
        // sale del puesto hacia el corredor central y gira hacia el oeste (rot = 180)
        const q = p / 0.2;
        y = ini.y + q * (corredorPct - ini.y);
        rot = ini.rotacion + q * (180 - ini.rotacion);
        anim.etapa = "estacionando";
      } else if (p < 0.65) {
        // avanza por el corredor hacia la portería
        const q = (p - 0.2) / 0.45;
        x = ini.x + q * (corredorX - ini.x);
        y = corredorPct;
        rot = 180;
        anim.etapa = "ruta";
      } else if (p < 0.85) {
        // corredor → carril de salida de la rampa
        const q = (p - 0.65) / 0.2;
        x = corredorX + q * (14 - corredorX);
        y = corredorPct + q * (exitLaneY - corredorPct);
        rot = 180;
        anim.etapa = "ruta";
      } else {
        // sale a la calle exterior integrándose al flujo
        const q = (p - 0.85) / 0.15;
        x = 14 + q * (9.2 - 14);
        y = exitLaneY + q * (105 - exitLaneY);
        rot = 180 - q * 90;
        anim.etapa = "ruta";
      }
      anim.posicionActual = { x, y, rotacion: rot };
    }, () => {
      anims.delete(anim.id);
      if (publicarAlFinal) void publicar(espacioId, "LIBRE", "salida");
      resolverEsperas();
      cerrarTalanquera();
    });
  }, retardoMs);
}

// ---------- API pública de la simulación ----------

export function ingreso(
  targetId?: string,
  origen: Origen = Math.random() > 0.5 ? "norte" : "sur",
  forzarEspera = false,
) {
  sonido.deteccion();
  const target = targetId && estados[targetId] === "LIBRE" && !bahiaReservada(targetId) ? targetId : primeraLibre();
  const debeEsperar = forzarEspera || bloqueada.value || !target;
  const retardo = retardoPorTrafico();

  const anim = addAnim({
    id: uid(),
    tipo: "ingreso",
    espacioId: target ?? "EN_ESPERA",
    origen,
    etapa: "aproximacion",
    posicionActual: {
      x: origen === "norte" ? 3.8 : 9.2,
      y: origen === "norte" ? -4 : 104,
      rotacion: origen === "norte" ? 90 : -90,
    },
  });

  notificar(
    "ingreso",
    `Vehículo en carril ${origen === "norte" ? "Norte" : "Sur"}`,
    debeEsperar
      ? "Aforo completo o portería bloqueada: la moto esperará frente a la talanquera."
      : `Motocicleta ingresando por portería. Asignando plaza ${target}...`,
    target,
    "media",
  );
  window.setTimeout(() => {
    if (anims.has(anim.id)) animarIngresoConEspera(anim, target, debeEsperar, origen);
  }, retardo);
}

function animarIngresoConEspera(
  anim: AnimacionMoto,
  target: string | undefined,
  debeEsperar: boolean,
  origen: Origen,
) {
  // Fase de calle: de la vía exterior a la puerta de la portería
  const laneY = CIRCULACION.entradaY[0];
  const inicio = origen === "norte" ? { x: 3.8, y: -4, rot: 90 } : { x: 9.2, y: 104, rot: -90 };
  tween(anim, DUR_CALLE, (p) => {
    let x = inicio.x, y = inicio.y, rot = inicio.rot;
    if (origen === "norte") {
      if (p < 0.55) {
        const q = p / 0.55;
        x = 3.8;
        y = -4 + q * (laneY - 10 - -4);
        rot = 90;
      } else {
        const q = (p - 0.55) / 0.45;
        x = 3.8 + q * (18 - 3.8);
        y = (laneY - 10) + q * 10;
        rot = 90 - q * 90;
      }
    } else {
      if (p < 0.55) {
        const q = p / 0.55;
        x = 9.2;
        y = 104 - q * (104 - (laneY + 10));
        rot = -90;
      } else {
        const q = (p - 0.55) / 0.45;
        x = 9.2 + q * (18 - 9.2);
        y = (laneY + 10) - q * 10;
        rot = -90 + q * 90;
      }
    }
    anim.posicionActual = { x, y, rotacion: rot };
  }, () => {
    if (debeEsperar || !target) {
      // Fila hacia atrás: cada moto en espera se ubica ordenadamente
      const fila = [...anims.values()].filter((a) => a.etapa === "esperando").length;
      anim.etapa = "esperando";
      anim.posicionActual = { x: 18 - fila * 7, y: laneY, rotacion: 0 };
      sonido.lleno();
      notificar("lleno", "Motocicleta en espera", "Detenida en el sensor de portería esperando un puesto libre.", undefined, "alta");
      return;
    }
    abrirTalanquera();
    tramoRuta(anim, target, true);
  });
}

export function salida(targetId?: string) {
  const target = targetId && estados[targetId] === "OCUPADO" && !bahiaReservada(targetId) ? targetId : primeraOcupada();
  if (!target) return;
  notificar("salida", `Salida de plaza ${target}`, "Motocicleta saliendo hacia la calzada de salida.", target, "media");
  animarSalida(target, true, retardoPorTrafico());
}

/** Asigna una plaza libre a la primera moto en espera (si hay). */
export function resolverEsperas() {
  if (bloqueada.value) return;
  const espera = [...anims.values()].find((a) => a.etapa === "esperando");
  const libre = primeraLibre();
  if (!espera || !libre) return;
  espera.espacioId = libre;
  notificar("ingreso", "Cupo asignado a moto en espera", `Plaza ${libre} disponible. Talanquera abriéndose para vehículo en portería.`, libre, "alta");
  const retardo = retardoPorTrafico();
  window.setTimeout(() => {
    if (!anims.has(espera.id)) return;
    abrirTalanquera();
    tramoRuta(espera, libre, true);
  }, retardo);
}

export function toggleBloqueo() {
  bloqueada.value = !bloqueada.value;
  cancelarTimerTalanquera();
  if (bloqueada.value) {
    talanquera.value = "bloqueada";
    sonido.lleno();
    notificar("bloqueo", "Portería bloqueada", "Talanquera asegurada por vigilancia institucional. Paso restringido temporalmente.", undefined, "alta");
  } else {
    talanquera.value = "cerrada";
    sonido.talanquera();
    notificar("sistema", "Talanquera habilitada", "Portería reabierta para el ingreso de motocicletas.", undefined, "media");
    resolverEsperas();
  }
}

let timer: number | null = null;
export function toggleAutoSimulacion() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
    autoSimulacion.value = false;
    return;
  }
  autoSimulacion.value = true;
  timer = window.setInterval(() => {
    const libre = primeraLibre();
    const ocupada = primeraOcupada();
    if (hayEsperando.value && ocupada) { salida(); return; }
    if (!bloqueada.value && libre && (!ocupada || Math.random() > 0.4)) {
      if (Math.random() > 0.65) {
        ingreso(undefined, "norte");
        setTimeout(() => ingreso(undefined, "sur"), 250);
      } else {
        ingreso();
      }
    } else if (ocupada) {
      salida();
    }
  }, 7500);
}

export function forzarEstado(id: string) {
  const nuevo: Estado = estados[id] === "OCUPADO" ? "LIBRE" : "OCUPADO";
  void publicar(id, nuevo, "operador");
}

export function llenarTodo() {
  BAHIA_LAYOUT.forEach((b) => void publicar(b.id, "OCUPADO", "operador"));
}

export function liberarTodo() {
  BAHIA_LAYOUT.forEach((b) => void publicar(b.id, "LIBRE", "operador"));
}

// ---------- Eventos reales del broker ----------

function onEventoReal(id: string, estado: Estado) {
  const key = `${id}:${estado}`;
  const propio = omitir.delete(key);
  if (estado === "LIBRE" && !propio) resolverEsperas();
  if (propio) return;
  if (estado === "OCUPADO") {
    sonido.parqueo();
    notificar("ingreso", `Plaza ${id} ocupada`, "Ocupación registrada por el sensor de celda.", id, "baja");
    if (bahiaReservada(id)) return; // ya hay una moto de camino a esa bahía
    const retardo = retardoPorTrafico();
    const anim = addAnim({
      id: uid(),
      tipo: "ingreso",
      espacioId: id,
      origen: (BAHIA_LAYOUT.find((b) => b.id === id)?.posicion.y ?? 50) < 50 ? "norte" : "sur",
      etapa: "talanquera",
      posicionActual: { x: 18, y: CIRCULACION.entradaY[0], rotacion: 0 },
    });
    window.setTimeout(() => {
      if (!anims.has(anim.id)) return;
      abrirTalanquera();
      tramoRuta(anim, id, false);
    }, retardo);
  } else {
    notificar("salida", `Plaza ${id} liberada`, "Bahía desocupada (sensor de celda).", id, "baja");
    if (!bahiaReservada(id)) animarSalida(id, false, retardoPorTrafico());
  }
}

onMensaje((m: MensajeWs) => {
  if ("snapshot" in m) {
    m.snapshot.espacios.forEach((e) => (estados[e.espacio] = e.estado));
    return;
  }
  estados[m.espacio] = m.estado;
  onEventoReal(m.espacio, m.estado);
});
