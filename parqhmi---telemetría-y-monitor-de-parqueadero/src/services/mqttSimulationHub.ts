/**
 * Hub de simulación para Mosquitto MQTT Broker y Fastify WebSocket Server.
 * Parqueadero de Motocicletas Universidad de Sucre (Campus Puerta Roja)
 */

import { EspacioInfo, EstadoEspacio, EstadoTalanquera, MqttMensajeEstado, NotificacionHMI, AnimacionMotoActiva } from '../types/parqueadero';
import { soundEffects } from './soundEffects';

type Listener<T> = (data: T) => void;

class MqttSimulationHub {
  private loteId = 'lote_unisucre';
  private espacios: Map<string, EspacioInfo> = new Map();
  private listenersEspacios: Set<Listener<EspacioInfo[]>> = new Set();
  private listenersDisponibles: Set<Listener<number>> = new Set();
  private listenersMqttLogs: Set<Listener<MqttMensajeEstado[]>> = new Set();
  private listenersNotificaciones: Set<Listener<NotificacionHMI>> = new Set();
  private listenersAnimaciones: Set<Listener<AnimacionMotoActiva[]>> = new Set();
  private listenersAnimacion: Set<Listener<AnimacionMotoActiva | null>> = new Set();
  private listenersBarrier: Set<Listener<EstadoTalanquera>> = new Set();

  private mqttLogBuffer: MqttMensajeEstado[] = [];
  private notificacionesBuffer: NotificacionHMI[] = [];
  private autoSimulationInterval: number | null = null;
  
  public animacionesActivas: Map<string, AnimacionMotoActiva> = new Map();

  public get animacionActiva(): AnimacionMotoActiva | null {
    const list = Array.from(this.animacionesActivas.values());
    return list.length > 0 ? list[0] : null;
  }

  public talanqueraBloqueada: boolean = false;
  public barrierState: EstadoTalanquera = 'cerrada';

  constructor() {
    this.initEspacios();
  }

  private initEspacios() {
    // 10 Plazas de Motocicletas en el Parqueadero de la Universidad de Sucre
    // 5 en Bahía Norte (Bloque A) y 5 en Bahía Sur (Bloque B)
    const configInicial: Array<{ id: string; nombre: string; x: number; y: number; rotacion: number; estado: EstadoEspacio }> = [
      // Fila Norte
      { id: 'E01', nombre: 'Plaza 1 - Bahía Norte', x: 38, y: 26, rotacion: 90, estado: 'OCUPADO' },
      { id: 'E02', nombre: 'Plaza 2 - Bahía Norte', x: 50, y: 26, rotacion: 90, estado: 'LIBRE' },
      { id: 'E03', nombre: 'Plaza 3 - Bahía Norte', x: 62, y: 26, rotacion: 90, estado: 'LIBRE' },
      { id: 'E04', nombre: 'Plaza 4 - Bahía Norte', x: 74, y: 26, rotacion: 90, estado: 'OCUPADO' },
      { id: 'E05', nombre: 'Plaza 5 - Bahía Norte', x: 86, y: 26, rotacion: 90, estado: 'LIBRE' },

      // Fila Sur
      { id: 'E06', nombre: 'Plaza 6 - Bahía Sur', x: 38, y: 74, rotacion: 270, estado: 'LIBRE' },
      { id: 'E07', nombre: 'Plaza 7 - Bahía Sur', x: 50, y: 74, rotacion: 270, estado: 'OCUPADO' },
      { id: 'E08', nombre: 'Plaza 8 - Bahía Sur', x: 62, y: 74, rotacion: 270, estado: 'LIBRE' },
      { id: 'E09', nombre: 'Plaza 9 - Bahía Sur', x: 74, y: 74, rotacion: 270, estado: 'LIBRE' },
      { id: 'E10', nombre: 'Plaza 10 - Bahía Sur', x: 86, y: 74, rotacion: 270, estado: 'OCUPADO' },
    ];

    const placasMuestras = ['KLM-45E', 'PRQ-89A', 'USC-12D', 'SNJ-77B', 'MOT-33F'];
    let placaIdx = 0;

    configInicial.forEach((cfg) => {
      this.espacios.set(cfg.id, {
        id: cfg.id,
        nombre: cfg.nombre,
        lote: this.loteId,
        nodo: 'nodo-esp32-unisucre',
        estado: cfg.estado,
        tsUltimoCambio: Date.now() - Math.floor(Math.random() * 1200000),
        placa: cfg.estado === 'OCUPADO' ? placasMuestras[placaIdx % placasMuestras.length] : undefined,
        tiempoEstacionadoMinutos: cfg.estado === 'OCUPADO' ? Math.floor(Math.random() * 50) + 10 : 0,
        posicion: { x: cfg.x, y: cfg.y, rotacion: cfg.rotacion },
      });
      if (cfg.estado === 'OCUPADO') placaIdx++;
    });

    this.espacios.forEach((esp) => {
      this.logMqttMessage({
        topic: `parq/${this.loteId}/${esp.nodo}/espacios/${esp.id}/estado`,
        qos: 1,
        retained: true,
        payload: { v: 1, estado: esp.estado, ts: esp.tsUltimoCambio },
        direccion: 'in',
        timestamp: esp.tsUltimoCambio,
      });
    });

    this.emitDisponiblesMqtt();
  }

  public getEspacios(): EspacioInfo[] {
    return Array.from(this.espacios.values());
  }

  public getDisponiblesCount(): number {
    let count = 0;
    this.espacios.forEach((esp) => {
      if (esp.estado === 'LIBRE') count++;
    });
    return count;
  }

  public getLogs(): MqttMensajeEstado[] {
    return [...this.mqttLogBuffer];
  }

  public getNotificaciones(): NotificacionHMI[] {
    return [...this.notificacionesBuffer];
  }

  public getAnimaciones(): AnimacionMotoActiva[] {
    return Array.from(this.animacionesActivas.values());
  }

  // Suscripciones
  public subscribeEspacios(cb: Listener<EspacioInfo[]>) {
    this.listenersEspacios.add(cb);
    cb(this.getEspacios());
    return () => this.listenersEspacios.delete(cb);
  }

  public subscribeDisponibles(cb: Listener<number>) {
    this.listenersDisponibles.add(cb);
    cb(this.getDisponiblesCount());
    return () => this.listenersDisponibles.delete(cb);
  }

  public subscribeMqttLogs(cb: Listener<MqttMensajeEstado[]>) {
    this.listenersMqttLogs.add(cb);
    cb(this.getLogs());
    return () => this.listenersMqttLogs.delete(cb);
  }

  public subscribeNotificaciones(cb: Listener<NotificacionHMI>) {
    this.listenersNotificaciones.add(cb);
    return () => this.listenersNotificaciones.delete(cb);
  }

  public subscribeAnimaciones(cb: Listener<AnimacionMotoActiva[]>) {
    this.listenersAnimaciones.add(cb);
    cb(this.getAnimaciones());
    return () => this.listenersAnimaciones.delete(cb);
  }

  public subscribeAnimacion(cb: Listener<AnimacionMotoActiva | null>) {
    this.listenersAnimacion.add(cb);
    cb(this.animacionActiva);
    return () => this.listenersAnimacion.delete(cb);
  }

  public subscribeBarrier(cb: Listener<EstadoTalanquera>) {
    this.listenersBarrier.add(cb);
    cb(this.barrierState);
    return () => this.listenersBarrier.delete(cb);
  }

  private setBarrierState(state: EstadoTalanquera) {
    this.barrierState = state;
    this.listenersBarrier.forEach((cb) => cb(state));
  }

  /**
   * Control de operador: Bloquear o desbloquear talanquera manualmente
   */
  public setBloqueoTalanquera(bloquear: boolean) {
    this.talanqueraBloqueada = bloquear;
    if (bloquear) {
      this.setBarrierState('bloqueada');
      soundEffects.playParkingFull();
      this.pushNotification({
        tipo: 'bloqueo',
        titulo: 'Portería Unisucre Bloqueada',
        mensaje: 'Talanquera cerrada por vigilancia institucional. Ingreso al campus restringido.',
        prioridad: 'alta',
      });
    } else {
      this.setBarrierState('cerrada');
      soundEffects.playGateOpening();
      this.pushNotification({
        tipo: 'sistema',
        titulo: 'Talanquera Habilitada',
        mensaje: 'Portería de Unisucre reabierta para acceso de comunidad universitaria.',
        prioridad: 'media',
      });

      // Si había alguna moto esperando por bloqueo, reanudarla
      this.verificarMotoEnEspera();
    }
  }

  private notifyAll() {
    const list = this.getEspacios();
    this.listenersEspacios.forEach((cb) => cb(list));
    const disp = this.getDisponiblesCount();
    this.listenersDisponibles.forEach((cb) => cb(disp));
  }

  private logMqttMessage(msg: MqttMensajeEstado) {
    this.mqttLogBuffer.unshift(msg);
    if (this.mqttLogBuffer.length > 50) {
      this.mqttLogBuffer.pop();
    }
    const currentLogs = this.getLogs();
    this.listenersMqttLogs.forEach((cb) => cb(currentLogs));
  }

  private emitDisponiblesMqtt() {
    const disp = this.getDisponiblesCount();
    this.logMqttMessage({
      topic: `parq/${this.loteId}/disponibles`,
      qos: 1,
      retained: true,
      payload: { v: 1, estado: disp > 0 ? 'LIBRE' : 'OCUPADO', ts: Date.now() },
      direccion: 'out',
      timestamp: Date.now(),
    });
  }

  public pushNotification(notif: Omit<NotificacionHMI, 'id' | 'timestamp'>) {
    const newNotif: NotificacionHMI = {
      ...notif,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    this.notificacionesBuffer.unshift(newNotif);
    if (this.notificacionesBuffer.length > 20) {
      this.notificacionesBuffer.pop();
    }
    this.listenersNotificaciones.forEach((cb) => cb(newNotif));
  }

  public publishEstado(espacioId: string, nuevoEstado: EstadoEspacio, nodo = 'admin') {
    const espacio = this.espacios.get(espacioId);
    if (!espacio) return;

    const anterior = espacio.estado;
    espacio.estado = nuevoEstado;
    espacio.tsUltimoCambio = Date.now();
    espacio.nodo = nodo;

    if (nuevoEstado === 'OCUPADO' && !espacio.placa) {
      const letras = 'ABCDEFGHJKLMNPRSTUVWXYZ';
      const randL = () => letras[Math.floor(Math.random() * letras.length)];
      const randN = () => Math.floor(Math.random() * 90 + 10);
      espacio.placa = `${randL()}${randL()}${randL()}-${randN()}${randL()}`;
      espacio.tiempoEstacionadoMinutos = 1;
    } else if (nuevoEstado === 'LIBRE') {
      espacio.placa = undefined;
      espacio.tiempoEstacionadoMinutos = 0;
    }

    this.logMqttMessage({
      topic: `parq/${this.loteId}/${nodo}/espacios/${espacioId}/estado`,
      qos: 1,
      retained: true,
      payload: { v: 1, estado: nuevoEstado, ts: Date.now() },
      direccion: 'in',
      timestamp: Date.now(),
    });

    this.emitDisponiblesMqtt();

    if (anterior !== nuevoEstado) {
      if (nuevoEstado === 'OCUPADO') {
        soundEffects.playSpotOccupied();
        this.pushNotification({
          tipo: 'ingreso',
          titulo: `Plaza ${espacioId} ocupada`,
          mensaje: `Motocicleta estacionada (${espacio.placa || 'Placa registrada'}).`,
          espacioId,
          prioridad: 'baja',
        });
      } else if (nuevoEstado === 'LIBRE') {
        this.pushNotification({
          tipo: 'salida',
          titulo: `Plaza ${espacioId} liberada`,
          mensaje: `Bahía desocupada. Verificando vehículos en espera en portería...`,
          espacioId,
          prioridad: 'baja',
        });

        // Verificar si hay alguna moto esperando en la entrada
        this.verificarMotoEnEspera(espacioId);
      } else if (nuevoEstado === 'SIN_DATO') {
        this.pushNotification({
          tipo: 'alerta',
          titulo: `Sensor ${espacioId} sin dato`,
          mensaje: `Pérdida de reporte en nodo sensor de la bahía.`,
          espacioId,
          prioridad: 'alta',
        });
      }
    }

    this.notifyAll();
  }

  private broadcastAnimaciones() {
    const list = this.getAnimaciones();
    this.listenersAnimaciones.forEach((cb) => cb(list));
    this.listenersAnimacion.forEach((cb) => cb(list.length > 0 ? list[0] : null));
  }

  /**
   * Revisa si hay alguna moto esperando en portería a que se desocupe un cupo.
   * Si hay cupo libre, la moto continúa su recorrido hacia la plaza liberada.
   */
  private verificarMotoEnEspera(espacioLiberadoId?: string) {
    if (this.talanqueraBloqueada) return;

    // Buscar una moto en estado 'esperando'
    let motoEsperando: AnimacionMotoActiva | undefined;
    for (const anim of this.animacionesActivas.values()) {
      if (anim.etapa === 'esperando') {
        motoEsperando = anim;
        break;
      }
    }

    if (!motoEsperando) return;

    // Asignar el espacio libre
    let target = espacioLiberadoId ? this.espacios.get(espacioLiberadoId) : undefined;
    if (!target || target.estado !== 'LIBRE') {
      const libres = Array.from(this.espacios.values()).filter((e) => e.estado === 'LIBRE');
      if (libres.length === 0) return;
      target = libres[0];
    }

    const assignedId = target.id;
    motoEsperando.espacioId = assignedId;

    this.pushNotification({
      tipo: 'ingreso',
      titulo: 'Cupo Asignado a Moto en Espera',
      mensaje: `Plaza ${assignedId} disponible. Talanquera abriendo para vehículo en portería.`,
      espacioId: assignedId,
      prioridad: 'alta',
    });

    // Abrir talanquera
    this.setBarrierState('abriendo');
    soundEffects.playGateOpening();
    setTimeout(() => {
      if (!this.talanqueraBloqueada) {
        this.setBarrierState('abierta');
      }
    }, 450);

    // Reanudar la animación desde x: 18, y: 50 hacia la plaza
    this.reanudarMotoDesdeEspera(motoEsperando, target);
  }

  private reanudarMotoDesdeEspera(anim: AnimacionMotoActiva, target: EspacioInfo) {
    const animId = anim.id;
    const startTime = performance.now();
    const duration = 3800; // Recorrido desde la talanquera hasta la plaza
    const targetPos = target.posicion;
    const initialLaneY = anim.posicionActual.y || (anim.origen === 'sur' ? 55.5 : 44.5);
    const corridorY = targetPos.y < 50 ? 46.5 : 53.5;

    const step = (now: number) => {
      const current = this.animacionesActivas.get(animId);
      if (!current) return;

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      let x = 18;
      let y = initialLaneY;
      let rot = 0;
      let etapa: AnimacionMotoActiva['etapa'] = 'talanquera';

      if (progress < 0.25) {
        // Cruce de talanquera manteniéndose en su carril respectivo
        etapa = 'talanquera';
        const p = progress / 0.25;
        x = 18 + p * 12; // De 18 a 30
        y = initialLaneY + p * (corridorY - initialLaneY);
        rot = 0;
      } else if (progress < 0.70) {
        // Avance por pasillo interno hacia la columna de la bahía asignada
        etapa = 'ruta';
        const p = (progress - 0.25) / 0.45;
        x = 30 + p * (targetPos.x - 30);
        y = corridorY;
        rot = 0;
      } else {
        // Giro hacia la bahía asignada (estudiantes o docentes)
        etapa = 'estacionando';
        const p = (progress - 0.70) / 0.30;
        x = targetPos.x;
        y = corridorY + p * (targetPos.y - corridorY);
        const targetRot = targetPos.y < 50 ? -90 : 90;
        rot = p * targetRot;
      }

      const updated: AnimacionMotoActiva = {
        ...current,
        progreso: 0.4 + progress * 0.6,
        etapa,
        posicionActual: { x, y, rotacion: rot },
      };

      this.animacionesActivas.set(animId, updated);
      this.broadcastAnimaciones();

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Cerrar talanquera si no hay más pasando
        if (!this.talanqueraBloqueada) {
          this.setBarrierState('cerrando');
          setTimeout(() => {
            if (!this.talanqueraBloqueada) {
              this.setBarrierState('cerrada');
            }
          }, 500);
        }

        this.publishEstado(target.id, 'OCUPADO', 'nodo_porteria_unisucre');
        this.animacionesActivas.delete(animId);
        this.broadcastAnimaciones();
      }
    };

    requestAnimationFrame(step);
  }

  /**
   * Animación de ingreso vehicular:
   * Puede provenir del 'norte' o del 'sur' de la calle exterior.
   * Admite motos simultáneas y gestión de espera en caso de aforo completo o simulación forzada.
   */
  public triggerMotorcycleEntry(
    targetId?: string,
    origen: 'norte' | 'sur' = Math.random() > 0.5 ? 'norte' : 'sur',
    forzarEspera = false
  ): string {
    const animId = Math.random().toString(36).substring(2, 8);

    // Revisar plazas libres
    const libres = Array.from(this.espacios.values()).filter((e) => e.estado === 'LIBRE');
    const loteLleno = libres.length === 0;

    let target = targetId ? this.espacios.get(targetId) : undefined;
    if (!target || target.estado !== 'LIBRE') {
      target = libres.length > 0 ? libres[0] : undefined;
    }

    const assignedId = target ? target.id : 'EN_ESPERA';
    soundEffects.playVehicleDetected();

    const inicioX = origen === 'norte' ? 4.3 : 8.1;
    const inicioY = origen === 'norte' ? -4.5 : 104.5;
    const inicioRot = origen === 'norte' ? 90 : -90;
    const finalLaneY = origen === 'norte' ? 44.5 : 55.5;

    const anim: AnimacionMotoActiva = {
      id: animId,
      tipo: 'ingreso',
      espacioId: assignedId,
      origen,
      progreso: 0,
      etapa: 'aproximacion',
      posicionActual: { x: inicioX, y: inicioY, rotacion: inicioRot },
    };

    this.animacionesActivas.set(animId, anim);
    this.broadcastAnimaciones();

    this.pushNotification({
      tipo: 'ingreso',
      titulo: `Vehículo en ${origen === 'norte' ? 'Carril Norte (Sentido Sur)' : 'Carril Sur (Sentido Norte)'}`,
      mensaje: loteLleno || forzarEspera
        ? `Motocicleta aproximándose por ${origen === 'norte' ? 'Carril Norte' : 'Carril Sur'}. Aforo completo: entrará en espera frente a talanquera.`
        : `Motocicleta girando a portería por ${origen === 'norte' ? 'Carril Norte' : 'Carril Sur'}. Asignando plaza ${assignedId}...`,
      espacioId: assignedId !== 'EN_ESPERA' ? assignedId : undefined,
      prioridad: 'media',
    });

    const startTime = performance.now();
    const durationTramoCalle = 2500; // Tiempo para llegar desde la calle exterior hasta la talanquera (x: 18)

    const stepAproximacion = (now: number) => {
      const current = this.animacionesActivas.get(animId);
      if (!current) return;

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationTramoCalle);

      let x = inicioX;
      let y = inicioY;
      let rot = inicioRot;

      if (origen === 'norte') {
        if (progress < 0.5) {
          // Bajando por el Carril 2 de la calzada occidental
          const p = progress / 0.5;
          x = 4.3 + p * 2.7; // De 4.3 a 7.0
          y = -4.5 + p * 36.5; // Llega a y=32.0
          rot = 90 - p * 45; // Curva suave hacia 45°
        } else {
          // Doblando hacia el Carril Norte de la rampa de acceso
          const p = (progress - 0.5) / 0.5;
          x = 7.0 + p * 11.0; // Llega a x=18
          y = 32.0 + p * 12.5; // Llega a y=44.5 (Carril Norte, sin solaparse con el Sur)
          rot = 45 - p * 45; // Termina alineada en 0° (hacia la derecha)
        }
      } else {
        // Origen Sur
        if (progress < 0.5) {
          // Subiendo por el Carril 3 de la calzada oriental
          const p = progress / 0.5;
          x = 8.1 + p * 2.4; // De 8.1 a 10.5
          y = 104.5 - p * 36.5; // Llega a y=68.0
          rot = -90 + p * 45; // Curva suave hacia -45°
        } else {
          // Doblando hacia el Carril Sur de la rampa de acceso
          const p = (progress - 0.5) / 0.5;
          x = 10.5 + p * 7.5; // Llega a x=18
          y = 68.0 - p * 12.5; // Llega a y=55.5 (Carril Sur, sin solaparse con el Norte)
          rot = -40 + p * 40; // Termina alineada en 0°
        }
      }

      const updated: AnimacionMotoActiva = {
        ...current,
        progreso: progress * 0.4,
        posicionActual: { x, y, rotacion: rot },
      };

      this.animacionesActivas.set(animId, updated);
      this.broadcastAnimaciones();

      if (progress < 1) {
        requestAnimationFrame(stepAproximacion);
      } else {
        // La moto llegó al sensor de su carril en portería frente a la talanquera
        const debeEsperar = forzarEspera || loteLleno || !target || this.talanqueraBloqueada;

        if (debeEsperar) {
          // Entra en etapa 'esperando' en su propio carril frente a la talanquera
          soundEffects.playParkingFull();
          const esperandoAnim: AnimacionMotoActiva = {
            ...updated,
            progreso: 0.4,
            etapa: 'esperando',
            posicionActual: { x: 18, y: finalLaneY, rotacion: 0 },
          };
          this.animacionesActivas.set(animId, esperandoAnim);
          this.broadcastAnimaciones();

          this.pushNotification({
            tipo: 'lleno',
            titulo: `Motocicleta en Espera (${origen === 'norte' ? 'Carril N' : 'Carril S'})`,
            mensaje: 'Vehículo detenido en sensor de portería esperando que una plaza se desocupe.',
            prioridad: 'alta',
          });
        } else {
          // Hay plaza disponible y la talanquera abre
          if (!this.talanqueraBloqueada) {
            this.setBarrierState('abriendo');
            soundEffects.playGateOpening();
            setTimeout(() => {
              if (!this.talanqueraBloqueada) {
                this.setBarrierState('abierta');
              }
            }, 450);
          }

          // Continuar directo hacia la plaza
          this.reanudarMotoDesdeEspera(updated, target!);
        }
      }
    };

    requestAnimationFrame(stepAproximacion);
    return animId;
  }

  /**
   * Dispara dos motocicletas en simultáneo: una desde el Carril Norte y otra desde el Carril Sur
   * Gracias al doble carril independiente, no se superponen en ningún momento.
   */
  public triggerSimultaneousEntries() {
    const libres = Array.from(this.espacios.values()).filter((e) => e.estado === 'LIBRE');
    
    // Asignar primer cupo (preferiblemente fila norte E01-E05) a la moto norte
    const targetNorte = libres.find((e) => e.posicion.y < 50)?.id || libres[0]?.id;
    // Asignar segundo cupo (preferiblemente fila sur E06-E10) a la moto sur
    const targetSur = libres.find((e) => e.posicion.y > 50 && e.id !== targetNorte)?.id 
      || libres.find((e) => e.id !== targetNorte)?.id;

    this.triggerMotorcycleEntry(targetNorte, 'norte');
    setTimeout(() => {
      this.triggerMotorcycleEntry(targetSur, 'sur');
    }, 250);
  }

  /**
   * Simula una moto que llega y se queda esperando expresamente en la entrada
   * a que un puesto se desocupe.
   */
  public triggerMotoEnEspera() {
    this.triggerMotorcycleEntry(undefined, Math.random() > 0.5 ? 'norte' : 'sur', true);
  }

  /**
   * Animación de salida de motocicleta del patio de parqueo hacia el pendón de salida
   */
  public triggerMotorcycleExit(targetId?: string): string | null {
    let target = targetId ? this.espacios.get(targetId) : undefined;
    if (!target || target.estado !== 'OCUPADO') {
      const ocupados = Array.from(this.espacios.values()).filter((e) => e.estado === 'OCUPADO');
      if (ocupados.length === 0) return null;
      target = ocupados[0];
    }

    const assignedId = target.id;
    const animId = Math.random().toString(36).substring(2, 8);

    this.pushNotification({
      tipo: 'salida',
      titulo: `Salida de Plaza ${assignedId}`,
      mensaje: `Motocicleta saliendo del campus hacia el carril de salida (señalizado con pendón).`,
      espacioId: assignedId,
      prioridad: 'media',
    });

    const anim: AnimacionMotoActiva = {
      id: animId,
      tipo: 'salida',
      espacioId: assignedId,
      progreso: 0,
      etapa: 'estacionando',
      posicionActual: { x: target.posicion.x, y: target.posicion.y, rotacion: target.posicion.rotacion },
    };

    this.animacionesActivas.set(animId, anim);
    this.broadcastAnimaciones();

    const startTime = performance.now();
    const duration = 4000;
    const initialPos = { ...target.posicion };

    const step = (now: number) => {
      const current = this.animacionesActivas.get(animId);
      if (!current) return;

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      let x = initialPos.x;
      let y = initialPos.y;
      let rot = initialPos.rotacion;

      if (progress < 0.28) {
        // Maniobra saliendo del cajón hacia el carril central
        const p = progress / 0.28;
        y = initialPos.y + p * (50 - initialPos.y);
        rot = initialPos.rotacion + p * (0 - initialPos.rotacion);
      } else {
        // Desplazamiento hacia el carril de salida (x=96)
        const p = (progress - 0.28) / 0.72;
        x = initialPos.x + p * (96 - initialPos.x);
        y = 50;
        rot = 0;
      }

      const updated: AnimacionMotoActiva = {
        ...current,
        progreso: progress,
        etapa: progress < 0.28 ? 'estacionando' : 'ruta',
        posicionActual: { x, y, rotacion: rot },
      };

      this.animacionesActivas.set(animId, updated);
      this.broadcastAnimaciones();

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Liberar plaza
        this.publishEstado(assignedId, 'LIBRE', 'nodo_salida_unisucre');
        this.animacionesActivas.delete(animId);
        this.broadcastAnimaciones();
      }
    };

    requestAnimationFrame(step);
    return animId;
  }

  public startAutoSimulation(intervalMs = 7500) {
    if (this.autoSimulationInterval) return;

    this.autoSimulationInterval = window.setInterval(() => {
      const libres = Array.from(this.espacios.values()).filter((e) => e.estado === 'LIBRE');
      const ocupados = Array.from(this.espacios.values()).filter((e) => e.estado === 'OCUPADO');

      // Si hay una moto esperando y hay algún cupo ocupado, provocar una salida para ver cómo ingresa
      const hayEsperando = Array.from(this.animacionesActivas.values()).some((a) => a.etapa === 'esperando');
      if (hayEsperando && ocupados.length > 0) {
        this.triggerMotorcycleExit();
        return;
      }

      if (!this.talanqueraBloqueada && libres.length > 0 && (ocupados.length === 0 || Math.random() > 0.4)) {
        // En ocasiones disparar simultáneas
        if (Math.random() > 0.65 && libres.length >= 2) {
          this.triggerSimultaneousEntries();
        } else {
          this.triggerMotorcycleEntry(undefined, Math.random() > 0.5 ? 'norte' : 'sur');
        }
      } else if (ocupados.length > 0) {
        this.triggerMotorcycleExit();
      }
    }, intervalMs);
  }

  public stopAutoSimulation() {
    if (this.autoSimulationInterval) {
      clearInterval(this.autoSimulationInterval);
      this.autoSimulationInterval = null;
    }
  }

  public isAutoSimulationRunning(): boolean {
    return this.autoSimulationInterval !== null;
  }
}

export const mqttHub = new MqttSimulationHub();
