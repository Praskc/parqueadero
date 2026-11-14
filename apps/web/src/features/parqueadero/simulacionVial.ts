// Entry point de la simulación vial: expone el Mediator único y reactiva la suscripción al WebSocket.
import "./mediator";

export type { Comando, Evento } from "./mediator";
export { comando, suscribirse, obtenerEstado, obtenerTalanquera, obtenerAutoSimulacion, obtenerAnimaciones } from "./mediator";
export { estados, talanquera, talanqueraSentido, bloqueada, autoSimulacion, notificacion, animaciones, hayEsperando } from "./estado";
export { ingreso, salida } from "./logica/maniobras";
export {
  forzarEstado,
  forzarEstamento,
  liberarTodo,
  llenarTodo,
  toggleBloqueo,
} from "./logica/accionesOperador";
export {
  detenerAutoSimulacion,
  toggleAutoSimulacion,
} from "./logica/simulacionAuto";
