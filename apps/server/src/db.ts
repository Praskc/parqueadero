import Database from "better-sqlite3";
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
  estado: string;
  ts: number;
}

const db = new Database("parqueadero.db");
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS espacios (
  lote TEXT, espacio TEXT, estado TEXT NOT NULL, ts INTEGER NOT NULL,
  PRIMARY KEY (lote, espacio));
CREATE TABLE IF NOT EXISTS ocupacion (
  id INTEGER PRIMARY KEY, lote TEXT NOT NULL, espacio TEXT NOT NULL,
  estado TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_oc ON ocupacion(lote, espacio, ts);
`);
// Migración suave: el registro de eventos ahora guarda qué nodo publicó.
try { db.prepare("SELECT nodo FROM ocupacion LIMIT 1").get(); }
catch { db.exec("ALTER TABLE ocupacion ADD COLUMN nodo TEXT"); }

const getEsp = db.prepare("SELECT estado FROM espacios WHERE lote=? AND espacio=?");
const upsert = db.prepare(`INSERT INTO espacios VALUES (@lote,@espacio,@estado,@ts)
  ON CONFLICT(lote,espacio) DO UPDATE SET estado=excluded.estado, ts=excluded.ts`);
const logEv = db.prepare(
  "INSERT INTO ocupacion(lote,espacio,estado,ts,nodo) VALUES (@lote,@espacio,@estado,@ts,@nodo)");

// El historial solo registra cambios reales: los retained se reentregan al reconectar.
export const save = db.transaction((r: Registro) => {
  if ((getEsp.get(r.lote, r.espacio) as FilaEspacio | undefined)?.estado !== r.estado) logEv.run(r);
  upsert.run(r);
});

export function snapshot(lote: string, ids: string[]): Snapshot {
  const rows = new Map(
    (db.prepare("SELECT espacio, estado, ts FROM espacios WHERE lote=?").all(lote) as FilaEspacio[])
      .map((r) => [r.espacio, r]));
  const espacios: Snapshot["espacios"] = ids.map((id) => {
    const row = rows.get(id);
    return row
      ? { espacio: row.espacio, estado: row.estado as Estado, ts: row.ts }
      : { espacio: id, estado: "SIN_DATO", ts: null };
  });
  return { lote, disponibles: espacios.filter((e) => e.estado === "LIBRE").length, espacios };
}

export const historial = (lote: string, espacio: string) =>
  db.prepare("SELECT estado, ts FROM ocupacion WHERE lote=? AND espacio=? ORDER BY ts DESC LIMIT 50")
    .all(lote, espacio);

/** Eventos del día en curso (medianoche local → ahora) para la analítica del HMI. */
export function eventosHoy(lote: string) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return db.prepare(
    `SELECT espacio, estado, COALESCE(nodo, 'desconocido') AS nodo, ts
     FROM ocupacion WHERE lote=? AND ts>=? ORDER BY ts DESC LIMIT 1000`,
  ).all(lote, d.getTime());
}
