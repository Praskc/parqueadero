import type { Estado, Snapshot } from "@parq/shared";

export interface Registro {
  lote: string;
  espacio: string;
  estado: Estado;
  nodo: string;
  ts: number;
}

interface FilaEspacio {
  espacio: string;
  estado: Estado;
  ts: number;
}

interface FilaOcupacion {
  id: number;
  lote: string;
  espacio: string;
  estado: Estado;
  nodo: string;
  ts: number;
}

// In-memory store (replaces native better-sqlite3)
const espaciosMap = new Map<string, FilaEspacio>();
const ocupacionList: FilaOcupacion[] = [];
let nextId = 1;

export const save = (r: Registro) => {
  const clave = `${r.lote}:${r.espacio}`;
  const previo = espaciosMap.get(clave);
  if (!previo || previo.estado !== r.estado) {
    ocupacionList.push({
      id: nextId++,
      lote: r.lote,
      espacio: r.espacio,
      estado: r.estado,
      nodo: r.nodo,
      ts: r.ts,
    });
  }
  espaciosMap.set(clave, { espacio: r.espacio, estado: r.estado, ts: r.ts });
};

export function snapshot(lote: string, ids: string[]): Snapshot {
  const espacios: Snapshot["espacios"] = ids.map((id) => {
    const row = espaciosMap.get(`${lote}:${id}`);
    return row
      ? { espacio: row.espacio, estado: row.estado, ts: row.ts }
      : { espacio: id, estado: "SIN_DATO", ts: null };
  });
  return { lote, disponibles: espacios.filter((e) => e.estado === "LIBRE").length, espacios };
}

export const historial = (lote: string, espacio: string) =>
  ocupacionList
    .filter((o) => o.lote === lote && o.espacio === espacio)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 50)
    .map((o) => ({ estado: o.estado, ts: o.ts }));

/** Eventos del día en curso (medianoche local → ahora) para la analítica del HMI. */
export function eventosHoy(lote: string) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const minTs = d.getTime();
  return ocupacionList
    .filter((o) => o.lote === lote && o.ts >= minTs)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 1000)
    .map((o) => ({
      espacio: o.espacio,
      estado: o.estado,
      nodo: o.nodo || "desconocido",
      ts: o.ts,
    }));
}
