import type { PosicionMapa } from "../types/hmi";

/**
 * Planta esquemática del parqueadero Campus Puerta Roja (viewBox 1200x580).
 * 30 plazas organizadas por estamentos (10 por fila), precedidas a la izquierda
 * por un cabezal arquitectónico uniforme de 118x96 px (x=316..434) en cada fila:
 *  - Fila 1 (E01 a E10): Estudiantes
 *  - Fila 2 (E11 a E20): Docentes
 *  - Fila 3 (E21 a E30): Administrativos
 */

export const ALTO_PLANO = 580;
export const ANCHO_PLANO = 1200;

// Cabezal lateral uniforme (x=316..434, ancho 118) + 10 columnas de 70px (x=434..1134)
export const CABEZAL_ZONA_X = 316;
export const CABEZAL_ZONA_ANCHO = 118;
export const X_COLUMNAS = [469, 539, 609, 679, 749, 819, 889, 959, 1029, 1099];

export const BAHIA_ANCHO = 70;
export const BAHIA_ALTO = 96;
export const BAHIA_LARGO = 96;

// Centros verticales de bahías para cada estamento (alineados al borde exacto de su calzada)
export const FILA_Y = [96, 274, 472];

// Calzadas de circulación vehicular (corredores de 82px de ancho)
export const CORREDOR_Y = [185, 383];
export const EJE_CIRCULACION_X = 278;

export const pctY = (v: number) => Math.round((v / ALTO_PLANO) * 1000) / 10;
export const pctX = (v: number) => Math.round((v / ANCHO_PLANO) * 1000) / 10;

export interface BahiaConfig {
  id: string;
  nombre: string;
  estamento: "estudiantes" | "docentes" | "administrativos";
  posicion: PosicionMapa;
}

export const ESTAMENTOS = [
  { key: "estudiantes", label: "Estudiantes", rango: "E01 a E10", color: "#15803d" },
  { key: "docentes", label: "Docentes", rango: "E11 a E20", color: "#15803d" },
  { key: "administrativos", label: "Administrativos", rango: "E21 a E30", color: "#15803d" },
] as const;

export const BAHIA_LAYOUT: BahiaConfig[] = [
  // Fila 0: Estudiantes (E01 a E10)
  ...X_COLUMNAS.map((x, ci) => ({
    id: `E${String(ci + 1).padStart(2, "0")}`,
    nombre: `Plaza E${String(ci + 1).padStart(2, "0")}`,
    estamento: "estudiantes" as const,
    posicion: { x: pctX(x), y: pctY(FILA_Y[0]), rotacion: 90 } as PosicionMapa,
  })),
  // Fila 1: Docentes (E11 a E20)
  ...X_COLUMNAS.map((x, ci) => ({
    id: `E${String(ci + 11).padStart(2, "0")}`,
    nombre: `Plaza E${String(ci + 11).padStart(2, "0")}`,
    estamento: "docentes" as const,
    posicion: { x: pctX(x), y: pctY(FILA_Y[1]), rotacion: 270 } as PosicionMapa,
  })),
  // Fila 2: Administrativos (E21 a E30)
  ...X_COLUMNAS.map((x, ci) => ({
    id: `E${String(ci + 21).padStart(2, "0")}`,
    nombre: `Plaza E${String(ci + 21).padStart(2, "0")}`,
    estamento: "administrativos" as const,
    posicion: { x: pctX(x), y: pctY(FILA_Y[2]), rotacion: 270 } as PosicionMapa,
  })),
];

export const TOTAL_BAHIAS = BAHIA_LAYOUT.length;

export const CIRCULACION = {
  entradaY: [pctY(244), pctY(316)],
  conectorX: pctX(EJE_CIRCULACION_X),
  corredoresY: [pctY(CORREDOR_Y[0]), pctY(CORREDOR_Y[1])],
  corredorY: pctY(CORREDOR_Y[0]),
};

/** Determina qué calzada de maniobra corresponde a cada bahía */
export function pasilloDe(id: string): number {
  const num = parseInt(id.replace(/\D/g, ""), 10);
  if (num <= 20) return CIRCULACION.corredoresY[0]; // Calzada 1 (y=185)
  return CIRCULACION.corredoresY[1]; // Calzada 2 (y=383)
}

/** Alterna siluetas ilustrativas de automóvil y motocicleta en todas las filas sin restringir modalidad por zona */
export function esBahiaMoto(id: string): boolean {
  const n = parseInt(id.replace(/\D/g, ""), 10) || 1;
  return n % 3 === 0;
}
