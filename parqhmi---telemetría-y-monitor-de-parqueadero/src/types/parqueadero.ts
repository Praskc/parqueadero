/**
 * Tipos y contratos del sistema de parqueadero IoT
 * Basado en la especificación del monorepo (@parq/shared y arquitectura Mosquitto + Fastify)
 */

export type EstadoEspacio = 'LIBRE' | 'OCUPADO' | 'SIN_DATO';

export interface EspacioInfo {
  id: string; // e.g. 'E01', 'E02'
  nombre: string;
  lote: string; // e.g. 'lote1'
  nodo: string;
  estado: EstadoEspacio;
  tsUltimoCambio: number;
  placa?: string;
  tiempoEstacionadoMinutos?: number;
  posicion: {
    x: number; // Coordenadas porcentuales para el mapa arquitectónico
    y: number;
    rotacion: number;
  };
}

export type EstadoTalanquera = 'cerrada' | 'abriendo' | 'abierta' | 'cerrando' | 'bloqueada';

export interface MqttMensajeEstado {
  topic: string;
  qos: 0 | 1 | 2;
  retained: boolean;
  payload: {
    v: number;
    estado: EstadoEspacio;
    ts?: number;
  };
  direccion: 'in' | 'out';
  timestamp: number;
}

export interface MqttMensajeDisponibles {
  topic: string;
  qos: 1;
  retained: true;
  payload: {
    v: number;
    n: number;
  };
}

export interface NotificacionHMI {
  id: string;
  tipo: 'ingreso' | 'salida' | 'alerta' | 'sistema' | 'lleno' | 'bloqueo';
  titulo: string;
  mensaje: string;
  espacioId?: string;
  timestamp: number;
  prioridad: 'alta' | 'media' | 'baja';
}

export interface AnimacionMotoActiva {
  id: string;
  tipo: 'ingreso' | 'salida';
  espacioId: string;
  origen?: 'norte' | 'sur';
  progreso: number; // 0 a 1
  etapa: 'aproximacion' | 'esperando' | 'talanquera' | 'ruta' | 'estacionando' | 'completado';
  posicionActual: { x: number; y: number; rotacion: number };
}
