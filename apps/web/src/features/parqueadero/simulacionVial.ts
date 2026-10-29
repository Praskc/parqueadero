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
import { BAHIA_LAYOUT, CIRCULACION, esBahiaMoto, pasilloDe } from "../../config/bahias";
import { movimientoReducidoActivo } from "../../shared/accesibilidad";
import type { AnimacionMoto, EstadoTalanquera, NotificacionHMI, Origen } from "../../types/hmi";

// Estado reactivo de la simulación vial

export const talanquera = ref<EstadoTalanquera>("cerrada");
/** Hacia dónde abate la pluma: al lote cuando entra un vehículo, a la calle cuando sale. */
export const talanqueraSentido = ref<"entrada" | "salida">("entrada");
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

/** Respeta reducción de movimiento (WCAG 2.3.3): recorrido mínimo cuando está activo. */
const durCalle = () => (movimientoReducidoActivo.value ? 450 : 1700);
const durRuta = () => (movimientoReducidoActivo.value ? 650 : 2600);
const durSalida = () => (movimientoReducidoActivo.value ? 750 : 2900);

const uid = () => Math.random().toString(36).substring(2, 9);

const MODELOS: ("scooter" | "clasica" | "enduro" | "deportiva")[] = [
  "scooter",
  "clasica",
  "enduro",
  "deportiva",
];
const COLORES = [
  "#f8fafc",
  "#e2e8f0",
  "#cbd5e1",
  "#94a3b8",
];
const CASCOS = [
  "#f8fafc",
  "#cbd5e1",
  "#334155",
  "#1e293b",
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

/** Publica en MQTT real (vía backend). Exige token para acciones manuales del operador. */
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

// Máquina de estados local de la talanquera

function abrirTalanquera(sentido: "entrada" | "salida" = "entrada") {
  if (bloqueada.value) return;
  talanqueraSentido.value = sentido;
  sonido.talanquera();
  talanquera.value = "abriendo";
  setTimeout(() => { if (!bloqueada.value) talanquera.value = "abierta"; }, 450);
}

function cerrarTalanquera() {
  if (bloqueada.value || hayMotoEnPuerta()) return;
  talanquera.value = "cerrando";
  setTimeout(() => {
    if (bloqueada.value) return;
    talanquera.value = "cerrada";
  }, 500);
}

function hayMotoEnPuerta(): boolean {
  return anims.size > 0 && [...anims.values()].some((a) =>
    a.etapa === "talanquera" || a.etapa === "esperando" || a.posicionActual.x < 30);
}

// Motor de interpolación con requestAnimationFrame

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

/** Tramo portería → bahía siguiendo el circuito unidireccional en sentido horario:
 *  portería → curva S norte → pasillo norte (oriente) → [retorno oriental → pasillo sur (occidente)] → bahía. */
function tramoRuta(anim: AnimacionMoto, espacioId: string, publicarAlFinal: boolean) {
  const bahia = BAHIA_LAYOUT.find((b) => b.id === espacioId);
  if (!bahia) return;
  const upperY = CIRCULACION.corredoresY[0];
  const lowerY = CIRCULACION.corredoresY[1];
  const corredorPct = pasilloDe(espacioId);
  const esFilaSur = corredorPct === lowerY;
  const startY = anim.posicionActual.y;
  const objetivo = { x: bahia.posicion.x, y: bahia.posicion.y, rot: bahia.posicion.rotacion };
  const rotFinal = objetivo.rot === 90 ? -90 : 90;
  const entradaCalzadaX = 26.8;
  const loopStartX = 94.5;
  const loopRadiusX = 2.17;
  const midLoopY = (upperY + lowerY) / 2;
  const halfLoopY = (lowerY - upperY) / 2;
  const durTotal = esFilaSur ? Math.round(durRuta() * 1.32) : durRuta();

  tween(anim, durTotal, (p) => {
    let x = 17.5, y = startY, rot = 0;
    if (!esFilaSur) {
      if (p < 0.28) {
        const q = p / 0.28;
        x = 17.5 + q * (entradaCalzadaX - 17.5);
        const u = Math.max(0, (q - 0.22) / 0.78);
        const s = u * u * (3 - 2 * u);
        const ds = u > 0 && u < 1 ? (6 * u * (1 - u)) / 0.78 : 0;
        y = startY + s * (upperY - startY);
        const dxPx = (entradaCalzadaX - 17.5) * 12;
        const dyPx = ds * (upperY - startY) * 5.8;
        rot = (Math.atan2(dyPx, dxPx) * 180) / Math.PI;
        anim.etapa = "talanquera";
      } else if (p < 0.78) {
        const q = (p - 0.28) / 0.5;
        x = entradaCalzadaX + q * (objetivo.x - entradaCalzadaX);
        y = upperY;
        rot = 0;
        anim.etapa = "ruta";
      } else {
        const q = (p - 0.78) / 0.22;
        x = objetivo.x;
        y = upperY + q * (objetivo.y - upperY);
        rot = q * rotFinal;
        anim.etapa = "estacionando";
      }
    } else {
      if (p < 0.18) {
        const q = p / 0.18;
        x = 17.5 + q * (entradaCalzadaX - 17.5);
        const u = Math.max(0, (q - 0.22) / 0.78);
        const s = u * u * (3 - 2 * u);
        const ds = u > 0 && u < 1 ? (6 * u * (1 - u)) / 0.78 : 0;
        y = startY + s * (upperY - startY);
        const dxPx = (entradaCalzadaX - 17.5) * 12;
        const dyPx = ds * (upperY - startY) * 5.8;
        rot = (Math.atan2(dyPx, dxPx) * 180) / Math.PI;
        anim.etapa = "talanquera";
      } else if (p < 0.52) {
        const q = (p - 0.18) / 0.34;
        x = entradaCalzadaX + q * (loopStartX - entradaCalzadaX);
        y = upperY;
        rot = 0;
        anim.etapa = "ruta";
      } else if (p < 0.68) {
        const q = (p - 0.52) / 0.16;
        const theta = q * Math.PI;
        x = loopStartX + Math.sin(theta) * loopRadiusX;
        y = midLoopY - Math.cos(theta) * halfLoopY;
        rot = (theta * 180) / Math.PI;
        anim.etapa = "ruta";
      } else if (p < 0.86) {
        const q = (p - 0.68) / 0.18;
        x = loopStartX + q * (objetivo.x - loopStartX);
        y = lowerY;
        rot = 180;
        anim.etapa = "ruta";
      } else {
        const q = (p - 0.86) / 0.14;
        x = objetivo.x;
        y = lowerY + q * (objetivo.y - lowerY);
        rot = 180 - q * 90;
        anim.etapa = "estacionando";
      }
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

/** Salida respetando el circuito unidireccional horario:
 *  bahía → [pasillo norte (oriente) → retorno oriental →] pasillo sur (occidente) → curva S salida → portería → calle exterior. */
function animarSalida(espacioId: string, publicarAlFinal: boolean, retardoMs = 0) {
  const bahia = BAHIA_LAYOUT.find((b) => b.id === espacioId);
  if (!bahia) return;
  const anim = addAnim({
    id: uid(),
    tipo: "salida",
    espacioId,
    etapa: "estacionando",
    oculto: retardoMs > 0,
    posicionActual: { ...bahia.posicion },
  });
  const ini = { ...bahia.posicion };
  const upperY = CIRCULACION.corredoresY[0];
  const lowerY = CIRCULACION.corredoresY[1];
  const corredorPct = pasilloDe(espacioId);
  const usaRetornoOriental = corredorPct === upperY;
  const salidaCalzadaX = 26.8;
  const loopStartX = 94.5;
  const loopRadiusX = 2.17;
  const midLoopY = (upperY + lowerY) / 2;
  const halfLoopY = (lowerY - upperY) / 2;
  const exitLaneY = CIRCULACION.entradaY[1];
  const durTotal = usaRetornoOriental ? Math.round(durSalida() * 1.28) : durSalida();
  let barreraAbierta = false;
  let barreraCerrada = false;

  window.setTimeout(() => {
    if (!anims.has(anim.id)) return;
    anim.oculto = false;
    tween(anim, durTotal, (p) => {
      let x = ini.x, y = ini.y, rot = ini.rotacion;
      const pSalida = usaRetornoOriental ? 0.76 : 0.56;
      const pCalle = usaRetornoOriental ? 0.9 : 0.84;

      if (usaRetornoOriental && p < 0.14) {
        const q = p / 0.14;
        y = ini.y + q * (upperY - ini.y);
        const metaRot = ini.rotacion >= 180 ? 360 : 0;
        rot = ini.rotacion + q * (metaRot - ini.rotacion);
        anim.etapa = "estacionando";
      } else if (usaRetornoOriental && p < 0.38) {
        const q = (p - 0.14) / 0.24;
        x = ini.x + q * (loopStartX - ini.x);
        y = upperY;
        rot = 0;
        anim.etapa = "ruta";
      } else if (usaRetornoOriental && p < 0.52) {
        const q = (p - 0.38) / 0.14;
        const theta = q * Math.PI;
        x = loopStartX + Math.sin(theta) * loopRadiusX;
        y = midLoopY - Math.cos(theta) * halfLoopY;
        rot = (theta * 180) / Math.PI;
        anim.etapa = "ruta";
      } else if (usaRetornoOriental && p < pSalida) {
        const q = (p - 0.52) / (pSalida - 0.52);
        x = loopStartX + q * (salidaCalzadaX - loopStartX);
        y = lowerY;
        rot = 180;
        anim.etapa = "ruta";
      } else if (!usaRetornoOriental && p < 0.2) {
        const q = p / 0.2;
        y = ini.y + q * (lowerY - ini.y);
        rot = ini.rotacion + q * (180 - ini.rotacion);
        anim.etapa = "estacionando";
      } else if (!usaRetornoOriental && p < pSalida) {
        const q = (p - 0.2) / (pSalida - 0.2);
        x = ini.x + q * (salidaCalzadaX - ini.x);
        y = lowerY;
        rot = 180;
        anim.etapa = "ruta";
      } else if (p < pCalle) {
        const q = (p - pSalida) / (pCalle - pSalida);
        x = salidaCalzadaX + q * (13.2 - salidaCalzadaX);
        const u = Math.min(1, q / 0.55);
        const s = u * u * (3 - 2 * u);
        const ds = u < 1 ? (6 * u * (1 - u)) / 0.55 : 0;
        y = lowerY + s * (exitLaneY - lowerY);
        const dxPx = (13.2 - salidaCalzadaX) * 12;
        const dyPx = ds * (exitLaneY - lowerY) * 5.8;
        rot = (Math.atan2(dyPx, dxPx) * 180) / Math.PI;
        anim.etapa = "talanquera";
        if (x <= 26.2 && !barreraAbierta) {
          barreraAbierta = true;
          abrirTalanquera("salida");
        }
        if (x <= 15.8 && !barreraCerrada) {
          barreraCerrada = true;
          cerrarTalanquera();
        }
      } else {
        const q = (p - pCalle) / (1 - pCalle);
        if (q < 0.48) {
          const r = q / 0.48;
          const ang = (r * Math.PI) / 2;
          x = 13.2 - Math.sin(ang) * (13.2 - 3.5);
          y = exitLaneY + (1 - Math.cos(ang)) * 7.5;
          rot = 180 - r * 90;
        } else {
          const r = (q - 0.48) / 0.52;
          x = 3.5;
          y = exitLaneY + 7.5 + r * (93.5 - (exitLaneY + 7.5));
          rot = 90;
        }
        anim.etapa = "ruta";
      }
      anim.posicionActual = { x, y, rotacion: rot };
    }, () => {
      anims.delete(anim.id);
      if (publicarAlFinal) void publicar(espacioId, "LIBRE", "salida");
      cerrarTalanquera();
      resolverEsperas();
    });
  }, retardoMs);
}

// Controles públicos de maniobras y simulación

export function ingreso(
  targetId?: string,
  origen: Origen = Math.random() > 0.5 ? "norte" : "sur",
  forzarEspera = false,
) {
  sonido.deteccion();

  // Una plaza con vehículo en camino queda bloqueada: nunca se le asigna un segundo vehículo.
  if (targetId && bahiaReservada(targetId)) {
    const yaOcupada = estados[targetId] === "OCUPADO";
    notificar(
      "alerta",
      `Plaza ${targetId} no disponible`,
      yaOcupada
        ? `La plaza ${targetId} ya está ocupada. Elige otra para el ingreso.`
        : `La plaza ${targetId} tiene un vehículo en camino. Espera a que se confirme la ocupación antes de asignar otra moto.`,
      targetId,
      "alta",
    );
    return;
  }

  const target = targetId && estados[targetId] === "LIBRE" && !bahiaReservada(targetId) ? targetId : primeraLibre();
  const debeEsperar = forzarEspera || bloqueada.value || !target;
  const retardo = retardoPorTrafico();

  const anim = addAnim({
    id: uid(),
    tipo: "ingreso",
    espacioId: target ?? "EN_ESPERA",
    origen,
    etapa: "aproximacion",
    oculto: retardo > 0,
    posicionActual: {
      x: origen === "norte" ? 3.5 : 8.0,
      y: origen === "norte" ? 6.5 : 93.5,
      rotacion: origen === "norte" ? 90 : -90,
    },
  });

  const tipoVehiculo = target && !esBahiaMoto(target) ? "Automóvil" : "Motocicleta";
  notificar(
    "ingreso",
    `Vehículo en carril ${origen === "norte" ? "Norte" : "Sur"}`,
    debeEsperar
      ? "Aforo completo o portería bloqueada: el vehículo esperará frente a la talanquera."
      : `${tipoVehiculo} ingresando por portería. Plaza ${target} reservada en camino.`,
    target,
    "media",
  );
  window.setTimeout(() => {
    if (anims.has(anim.id)) {
      anim.oculto = false;
      animarIngresoConEspera(anim, target, debeEsperar, origen);
    }
  }, retardo);
}

function animarIngresoConEspera(
  anim: AnimacionMoto,
  target: string | undefined,
  debeEsperar: boolean,
  origen: Origen,
) {
  // Fase de calle dentro del lienzo visible para que nunca asome solo el faro en el borde
  const laneY = CIRCULACION.entradaY[0];
  const inicio = origen === "norte" ? { x: 3.5, y: 6.5, rot: 90 } : { x: 8.0, y: 93.5, rot: -90 };
  tween(anim, durCalle(), (p) => {
    let x = inicio.x, y = inicio.y, rot = inicio.rot;
    if (origen === "norte") {
      if (p < 0.52) {
        const q = p / 0.52;
        x = 3.5;
        y = 6.5 + q * (laneY - 8 - 6.5);
        rot = 90;
      } else {
        const q = (p - 0.52) / 0.48;
        const ang = (q * Math.PI) / 2;
        x = 3.5 + (1 - Math.cos(ang)) * (17.5 - 3.5);
        y = (laneY - 8) + Math.sin(ang) * 8;
        rot = 90 - q * 90;
      }
    } else {
      if (p < 0.52) {
        const q = p / 0.52;
        x = 8.0;
        y = 93.5 - q * (93.5 - (laneY + 8));
        rot = -90;
      } else {
        const q = (p - 0.52) / 0.48;
        const ang = (q * Math.PI) / 2;
        x = 8.0 + (1 - Math.cos(ang)) * (17.5 - 8.0);
        y = (laneY + 8) - Math.sin(ang) * 8;
        rot = -90 + q * 90;
      }
    }
    anim.posicionActual = { x, y, rotacion: rot };
  }, () => {
    if (debeEsperar || !target) {
      const fila = [...anims.values()].filter((a) => a.etapa === "esperando").length;
      anim.etapa = "esperando";
      anim.posicionActual = { x: 17.5 - fila * 6.5, y: laneY, rotacion: 0 };
      sonido.lleno();
      notificar("lleno", "Vehículo en espera", "Detenido en el sensor de portería esperando un puesto libre.", undefined, "alta");
      return;
    }
    abrirTalanquera("entrada");
    tramoRuta(anim, target, true);
  });
}

export function salida(targetId?: string) {
  const target = targetId && estados[targetId] === "OCUPADO" && !bahiaReservada(targetId) ? targetId : primeraOcupada();
  if (!target) return;
  const tipoVehiculo = esBahiaMoto(target) ? "Motocicleta" : "Automóvil";
  notificar("salida", `Salida de plaza ${target}`, `${tipoVehiculo} saliendo hacia la calzada de salida.`, target, "media");
  animarSalida(target, true, retardoPorTrafico());
}

/** Asigna una plaza libre a la primera moto en espera (si hay). */
export function resolverEsperas() {
  if (bloqueada.value) return;
  const espera = [...anims.values()].find((a) => a.etapa === "esperando");
  const libre = primeraLibre();
  if (!espera || !libre) return;
  espera.espacioId = libre;
  notificar("ingreso", "Cupo asignado a vehículo en espera", `Plaza ${libre} disponible. Talanquera abriéndose para vehículo en portería.`, libre, "alta");
  const retardo = retardoPorTrafico();
  window.setTimeout(() => {
    if (!anims.has(espera.id)) return;
    abrirTalanquera("entrada");
    tramoRuta(espera, libre, true);
  }, retardo);
}

export function toggleBloqueo() {
  bloqueada.value = !bloqueada.value;
  if (bloqueada.value) {
    talanquera.value = "bloqueada";
    sonido.lleno();
    notificar("bloqueo", "Portería bloqueada", "Talanquera asegurada por vigilancia institucional. Paso restringido temporalmente.", undefined, "alta");
  } else {
    talanquera.value = "cerrada";
    sonido.talanquera();
    notificar("sistema", "Talanquera habilitada", "Portería reabierta para el ingreso vehicular.", undefined, "media");
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
  if (bahiaReservada(id)) {
    notificar(
      "alerta",
      "Plaza con vehículo en camino",
      `La plaza ${id} está reservada por un vehículo que ya ingresó. Espera a que el sensor confirme la ocupación.`,
      id,
      "alta",
    );
    return;
  }
  const nuevo: Estado = estados[id] === "OCUPADO" ? "LIBRE" : "OCUPADO";
  void publicar(id, nuevo, "operador");
}

export function llenarTodo() {
  BAHIA_LAYOUT.filter((b) => !bahiaReservada(b.id)).forEach((b) => void publicar(b.id, "OCUPADO", "operador"));
}

export function liberarTodo() {
  BAHIA_LAYOUT.filter((b) => !bahiaReservada(b.id)).forEach((b) => void publicar(b.id, "LIBRE", "operador"));
}

export function forzarEstamento(
  estamento: "estudiantes" | "docentes" | "administrativos",
  estado: Estado,
) {
  BAHIA_LAYOUT.filter((b) => b.estamento === estamento && !bahiaReservada(b.id)).forEach((b) => {
    void publicar(b.id, estado, "operador");
  });
}

// Sincronización con eventos entrantes del broker MQTT

function onEventoReal(id: string, estado: Estado) {
  const key = `${id}:${estado}`;
  const propio = omitir.delete(key);
  if (estado === "LIBRE" && !propio) resolverEsperas();
  if (propio) return;
  if (estado === "OCUPADO") {
    sonido.parqueo();
    notificar("ingreso", `Plaza ${id} ocupada`, "Ocupación registrada por el sensor de celda.", id, "baja");
    if (bahiaReservada(id)) {
      // El sensor confirma que el vehículo ya está en la celda: se retira la
      // animación en tránsito para no dibujar dos vehículos en la misma plaza.
      for (const a of [...anims.values()]) {
        if (a.tipo === "ingreso" && a.espacioId === id) anims.delete(a.id);
      }
      cerrarTalanquera();
      return;
    }
    const retardo = retardoPorTrafico();
    const anim = addAnim({
      id: uid(),
      tipo: "ingreso",
      espacioId: id,
      origen: (BAHIA_LAYOUT.find((b) => b.id === id)?.posicion.y ?? 50) < 50 ? "norte" : "sur",
      etapa: "talanquera",
      oculto: retardo > 0,
      posicionActual: { x: 17.5, y: CIRCULACION.entradaY[0], rotacion: 0 },
    });
    window.setTimeout(() => {
      if (!anims.has(anim.id)) return;
      anim.oculto = false;
      abrirTalanquera("entrada");
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
