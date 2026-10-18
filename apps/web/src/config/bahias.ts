import type { PosicionMapa } from "../types/hmi";

/**
 * Layout del patio — viewBox 1000×560.
 * 10 puestos (E01–E10) en 2 filas de 5, separadas por un corredor
 * central que empalma con la rampa de la portería.
 */

export const ALTO_PLANO = 560;
export const ANCHO_PLANO = 1000;

// Calle pública: x 0-126 · andén 126-142 · rampa 126-240 · patio 240-980
// 5 bahías de 80 por fila, separadas por columnas de 60
const X_S = [340, 480, 620, 760, 900];

// Corredor central: la vía interior del patio (empalma con la rampa a y=280)
export const CORREDOR = { y: 264, h: 32 };
const CORREDOR_Y = 280;

// Patio de asfalto: una sola isla con las dos filas de puestos
export const PATIO = { x: 300, y: 120, w: 680, h: 320 };

// Filas: superior a y=200 (E01-E05), inferior a y=360 (E06-E10)
const FILA_Y = [200, 360];

export const BAHIA_ALTO = 48;
export const BAHIA_ANCHO = 80;

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
  entradaY: [21.0, 27.0],
  corredorY: pctY(CORREDOR_Y),
  filaOffsetPct: Math.round(((CORREDOR_Y - FILA_Y[0]) / ALTO_PLANO) * 1000) / 10,
};

/** El corredor es único: toda bahía se alcanza por el mismo pasillo. */
export const pasilloDe = (_id: string) => CIRCULACION.corredorY;
