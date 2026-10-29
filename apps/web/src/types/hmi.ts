import type { EstadoVista } from "@parq/shared";

/** Modelos de vista del HMI (solo frontend; el contrato de datos vive en @parq/shared). */

export type EstadoTalanquera = "cerrada" | "abriendo" | "abierta" | "cerrando" | "bloqueada";

export type Origen = "norte" | "sur";

export type EtapaMoto = "aproximacion" | "esperando" | "talanquera" | "ruta" | "estacionando";

export interface PosicionMapa {
  x: number;
  y: number;
  rotacion: number;
}

export interface Bahia {
  id: string;
  nombre: string;
  estado: EstadoVista;
  ts: number | null;
  posicion: PosicionMapa;
  estamento?: "estudiantes" | "docentes" | "administrativos";
}

export interface NotificacionHMI {
  id: string;
  tipo: "ingreso" | "salida" | "alerta" | "sistema" | "lleno" | "bloqueo";
  titulo: string;
  mensaje: string;
  espacioId?: string;
  timestamp: number;
  prioridad: "alta" | "media" | "baja";
}

export interface AnimacionMoto {
  id: string;
  tipo: "ingreso" | "salida";
  espacioId: string;
  origen?: Origen;
  etapa: EtapaMoto;
  posicionActual: PosicionMapa;
  oculto?: boolean;
  modelo?: "scooter" | "clasica" | "enduro" | "deportiva";
  color?: string;
  cascoColor?: string;
}
