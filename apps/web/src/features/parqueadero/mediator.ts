import type { Estado, EstadoVista, MensajeWs } from "@parq/shared";
import type { AnimacionMoto, EstadoTalanquera, NotificacionHMI, Origen } from "../../types/hmi";
import { onMensaje } from "../../services/realtime";
import { BAHIA_LAYOUT, CIRCULACION } from "../../config/bahias";
import { sonido } from "../../lib/sonido";
import { anims, estados, notificar, omitir, talanquera, bloqueada, autoSimulacion, uid } from "./estado";
import {
  addAnim,
  animarSalida,
  retardoPorTrafico,
  tramoRuta,
} from "./logica/animaciones";
import { bahiaReservada } from "./logica/bahias";
import { resolverEsperas } from "./logica/colaEspera";
import { abrirTalanquera, cerrarTalanquera } from "./logica/talanquera";
import { confirmarLiberacion } from "./logica/transiciones";
import { ingreso, salida } from "./logica/maniobras";
import {
  forzarEstado,
  forzarEstamento,
  llenarTodo,
  liberarTodo,
  toggleBloqueo,
} from "./logica/accionesOperador";
import { detenerAutoSimulacion, toggleAutoSimulacion } from "./logica/simulacionAuto";

export type Comando =
  | { tipo: "ingreso"; espacioId?: string; origen?: Origen; forzarEspera?: boolean }
  | { tipo: "salida"; espacioId?: string }
  | { tipo: "toggleBloqueo" }
  | { tipo: "forzarEstado"; espacioId: string }
  | { tipo: "forzarEstamento"; estamento: "estudiantes" | "docentes" | "administrativos"; estado: Estado }
  | { tipo: "llenarTodo" }
  | { tipo: "liberarTodo" }
  | { tipo: "toggleAutoSimulacion" };

export type Evento =
  | { tipo: "estado"; espacio: string; estado: EstadoVista }
  | { tipo: "snapshot"; espacios: Array<{ espacio: string; estado: EstadoVista }> }
  | { tipo: "talanquera"; valor: EstadoTalanquera; bloqueada: boolean }
  | { tipo: "animaciones" }
  | { tipo: "autoSimulacion"; activa: boolean }
  | { tipo: "notificacion"; n: NotificacionHMI };

const suscriptores = new Set<(e: Evento) => void>();

function emitir(e: Evento): void {
  for (const cb of suscriptores) cb(e);
}

export function suscribirse(cb: (e: Evento) => void): () => void {
  suscriptores.add(cb);
  return () => suscriptores.delete(cb);
}

export function comando(c: Comando): void {
  switch (c.tipo) {
    case "ingreso":
      ingreso(c.espacioId, c.origen, c.forzarEspera);
      break;
    case "salida":
      salida(c.espacioId);
      break;
    case "toggleBloqueo":
      toggleBloqueo();
      break;
    case "forzarEstado":
      forzarEstado(c.espacioId);
      break;
    case "forzarEstamento":
      forzarEstamento(c.estamento, c.estado);
      break;
    case "llenarTodo":
      llenarTodo();
      break;
    case "liberarTodo":
      liberarTodo();
      break;
    case "toggleAutoSimulacion":
      toggleAutoSimulacion();
      break;
  }
}

export function obtenerEstado(id?: string): Estado | "SIN_DATO" | Record<string, Estado | "SIN_DATO"> {
  if (id) return estados[id] ?? "SIN_DATO";
  return estados;
}

export function obtenerTalanquera(): { valor: EstadoTalanquera; bloqueada: boolean } {
  return { valor: talanquera.value, bloqueada: bloqueada.value };
}

export function obtenerAutoSimulacion(): boolean {
  return autoSimulacion.value;
}

export function obtenerAnimaciones(): AnimacionMoto[] {
  return [...anims.values()];
}

export { estados, talanquera, bloqueada, autoSimulacion, notificacion, animaciones, hayEsperando } from "./estado";

function onEventoReal(id: string, estado: Estado): void {
  const key = `${id}:${estado}`;
  const propio = omitir.delete(key);
  if (estado === "LIBRE" && !propio) resolverEsperas();
  if (propio) return;
  if (estado === "OCUPADO") {
    sonido.parqueo();
    notificar("ingreso", `Plaza ${id} ocupada`, "Ocupación registrada por el sensor de celda.", id, "baja");
    if (bahiaReservada(id)) {
      for (const a of [...anims.values()]) {
        if (a.tipo === "ingreso" && a.espacioId === id) anims.delete(a.id);
      }
      cerrarTalanquera();
      emitir({ tipo: "talanquera", valor: talanquera.value, bloqueada: bloqueada.value });
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
      tramoRuta(anim, id, () => {
        cerrarTalanquera();
        emitir({ tipo: "talanquera", valor: talanquera.value, bloqueada: bloqueada.value });
        emitir({ tipo: "animaciones" });
      });
    }, retardo);
  } else {
    notificar("salida", `Plaza ${id} liberada`, "Bahía desocupada (sensor de celda).", id, "baja");
    if (!bahiaReservada(id)) {
      animarSalida(id, retardoPorTrafico(), () => {
        confirmarLiberacion(id, false);
        resolverEsperas();
        emitir({ tipo: "animaciones" });
      });
    }
  }
}

/** Único suscriptor al WebSocket: el Mediator es el único punto de entrada del bus. */
onMensaje((m: MensajeWs) => {
  if ("snapshot" in m) {
    m.snapshot.espacios.forEach((e) => {
      estados[e.espacio] = e.estado;
    });
    emitir({ tipo: "snapshot", espacios: m.snapshot.espacios });
    return;
  }
  estados[m.espacio] = m.estado;
  emitir({ tipo: "estado", espacio: m.espacio, estado: m.estado });
  onEventoReal(m.espacio, m.estado);
});
