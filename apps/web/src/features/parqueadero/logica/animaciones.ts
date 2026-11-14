import { BAHIA_LAYOUT, CIRCULACION, pasilloDe } from "../../../config/bahias";
import { movimientoReducidoActivo } from "../../../shared/accesibilidad";
import type { AnimacionMoto, Origen } from "../../../types/hmi";
import { anims, uid } from "../estado";
import { abrirTalanquera, cerrarTalanquera } from "./talanquera";
import { modelosPorTipo, disenoPorModelo } from "../catalogoVehiculos";

/** Respeta reducción de movimiento (WCAG 2.3.3): recorrido mínimo cuando está activo. */
export const durCalle = () => (movimientoReducidoActivo.value ? 450 : 1700);
export const durRuta = () => (movimientoReducidoActivo.value ? 650 : 2600);
export const durSalida = () => (movimientoReducidoActivo.value ? 750 : 2900);

function randomMotoProps() {
  const modelos = modelosPorTipo("moto");
  const modelo = modelos[Math.floor(Math.random() * modelos.length)];
  const diseno = disenoPorModelo(modelo, "moto");
  return {
    modelo,
    color: diseno?.color ?? "#f8fafc",
    cascoColor: diseno?.cascoColor ?? "#f8fafc",
  };
}

export function addAnim(a: AnimacionMoto): AnimacionMoto {
  const props = randomMotoProps();
  const completo: AnimacionMoto = { ...props, ...a };
  anims.set(completo.id, completo);
  return anims.get(completo.id)!;
}

/** Separación de tráfico: la siguiente moto arranca después de las activas. */
export function retardoPorTrafico(): number {
  return (
    [...anims.values()].filter((a) => a.etapa !== "esperando").length * 800
  );
}

export function tween(
  anim: AnimacionMoto,
  durMs: number,
  frame: (p: number) => void,
  done: () => void,
): void {
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

/** Tramo portería → bahía siguiendo el circuito horario. */
export function tramoRuta(
  anim: AnimacionMoto,
  espacioId: string,
  onFin: () => void,
): void {
  const bahia = BAHIA_LAYOUT.find((b) => b.id === espacioId);
  if (!bahia) return;
  const upperY = CIRCULACION.corredoresY[0];
  const lowerY = CIRCULACION.corredoresY[1];
  const corredorPct = pasilloDe(espacioId);
  const esFilaSur = corredorPct === lowerY;
  const startY = anim.posicionActual.y;
  const objetivo = {
    x: bahia.posicion.x,
    y: bahia.posicion.y,
    rot: bahia.posicion.rotacion,
  };
  const rotFinal = objetivo.rot === 90 ? -90 : 90;
  const entradaCalzadaX = 26.8;
  const loopStartX = 94.5;
  const loopRadiusX = 2.17;
  const midLoopY = (upperY + lowerY) / 2;
  const halfLoopY = (lowerY - upperY) / 2;
  const durTotal = esFilaSur ? Math.round(durRuta() * 1.32) : durRuta();

  tween(
    anim,
    durTotal,
    (p) => {
      let x = 17.5;
      let y = startY;
      let rot = 0;
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
      } else if (p < 0.18) {
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
      anim.posicionActual = { x, y, rotacion: rot };
    },
    () => {
      anims.delete(anim.id);
      onFin();
    },
  );
}

/** Recorrido por la calle hasta el sensor de portería. */
export function aproximarPorCalle(
  anim: AnimacionMoto,
  origen: Origen,
  onFin: () => void,
): void {
  const laneY = CIRCULACION.entradaY[0];
  const inicio =
    origen === "norte"
      ? { x: 3.5, y: 6.5, rot: 90 }
      : { x: 8.0, y: 93.5, rot: -90 };
  tween(
    anim,
    durCalle(),
    (p) => {
      let x = inicio.x;
      let y = inicio.y;
      let rot = inicio.rot;
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
          y = laneY - 8 + Math.sin(ang) * 8;
          rot = 90 - q * 90;
        }
      } else if (p < 0.52) {
        const q = p / 0.52;
        x = 8.0;
        y = 93.5 - q * (93.5 - (laneY + 8));
        rot = -90;
      } else {
        const q = (p - 0.52) / 0.48;
        const ang = (q * Math.PI) / 2;
        x = 8.0 + (1 - Math.cos(ang)) * (17.5 - 8.0);
        y = laneY + 8 - Math.sin(ang) * 8;
        rot = -90 + q * 90;
      }
      anim.posicionActual = { x, y, rotacion: rot };
    },
    () => onFin(),
  );
}

/** Salida respetando el circuito horario. */
export function animarSalida(
  espacioId: string,
  retardoMs: number,
  onFin: () => void,
): void {
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
  const durTotal = usaRetornoOriental
    ? Math.round(durSalida() * 1.28)
    : durSalida();
  let barreraAbierta = false;
  let barreraCerrada = false;

  window.setTimeout(() => {
    if (!anims.has(anim.id)) return;
    anim.oculto = false;
    tween(
      anim,
      durTotal,
      (p) => {
        let x = ini.x;
        let y = ini.y;
        let rot = ini.rotacion;
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
      },
      () => {
        anims.delete(anim.id);
        onFin();
      },
    );
  }, retardoMs);
}
