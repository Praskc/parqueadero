import type { PosicionMapa } from "../types/hmi";

/**
 * Layout del patio — viewBox 1000×560.
 * Grilla continua y contigua de 10 puestos (E01–E10) en 2 filas de 5 sin espacios muertos,
 * separadas por un corredor central de maniobra que empalma con la portería.
 */

export const ALTO_PLANO = 560;
export const ANCHO_PLANO = 1000;

// Grilla contigua: 5 puestos contiguos de 130px de ancho cada uno (de x=300 a x=950)
const X_S = [365, 495, 625, 755, 885];

// Corredor central: calzada de maniobra de 80px de alto (de y=240 a 320, centro 280)
export const CORREDOR = { y: 240, h: 80 };
const CORREDOR_Y = 280;

// Patio de asfalto: ocupa toda la superficie del parqueadero (x: 260 a 980, y: 50 a 510)
export const PATIO = { x: 260, y: 50, w: 720, h: 460 };

// Filas: superior a y=145 (E01-E05), inferior a y=415 (E06-E10)
const FILA_Y = [145, 415];

export const BAHIA_ANCHO = 130;
export const BAHIA_ALTO = 190;
export const BAHIA_LARGO = 190;

const pctY = (v: number) => Math.round((v / ALTO_PLANO) * 1000) / 10;
const pctX = (v: number) => Math.round((v / ANCHO_PLANO) * 1000) / 10;

export const BAHIA_LAYOUT = [0, 1].flatMap((fila) =>
  X_S.map((x, ci) => {
    const n = fila * 5 + ci + 1;
    return {
      id: `E${String(n).padStart(2, "0")}`,
      nombre: `Plaza ${n}`,
      posicion: { x: pctX(x), y: pctY(FILA_Y[fila]), rotacion: fila === 0 ? 90 : 270 } as PosicionMapa,
    };
  }),
);

export const TOTAL_BAHIAS = BAHIA_LAYOUT.length;

export const CIRCULACION = {
  entradaY: [pctY(250), pctY(305)],
  corredorY: pctY(CORREDOR_Y),
  filaOffsetPct: Math.round(((CORREDOR_Y - FILA_Y[0]) / ALTO_PLANO) * 1000) / 10,
};

/** El corredor es único: toda bahía se alcanza por el mismo pasillo. */
export const pasilloDe = (_id: string) => CIRCULACION.corredorY;
