import type { Estado } from "@parq/shared";
import { BAHIA_LAYOUT } from "../../../config/bahias";
import { sonido } from "../../../lib/sonido";
import { publicar } from "../servicios/publicadorMqtt";
import { bloqueada, estados, notificar, talanquera } from "../estado";
import { bahiaReservada } from "./bahias";
import { resolverEsperas } from "./colaEspera";

export function toggleBloqueo(): void {
  bloqueada.value = !bloqueada.value;
  if (bloqueada.value) {
    talanquera.value = "bloqueada";
    sonido.lleno();
    notificar(
      "bloqueo",
      "Portería bloqueada",
      "Talanquera asegurada por vigilancia institucional. Paso restringido temporalmente.",
      undefined,
      "alta",
    );
  } else {
    talanquera.value = "cerrada";
    sonido.talanquera();
    notificar(
      "sistema",
      "Talanquera habilitada",
      "Portería reabierta para el ingreso vehicular.",
      undefined,
      "media",
    );
    resolverEsperas();
  }
}

export function forzarEstado(id: string): void {
  if (bahiaReservada(id)) {
    notificar(
      "alerta",
      "Plaza con vehículo en camino",
      `La plaza ${id} está reservada por un vehículo que ya ingresó. Espera a que el sensor confirme la ocupación.`,
      id,
      "alta",
    );
    return;
  }
  const nuevo: Estado = estados[id] === "OCUPADO" ? "LIBRE" : "OCUPADO";
  void publicar(id, nuevo, "operador");
}

export function llenarTodo(): void {
  BAHIA_LAYOUT.filter((b) => !bahiaReservada(b.id)).forEach((b) =>
    void publicar(b.id, "OCUPADO", "operador"),
  );
}

export function liberarTodo(): void {
  BAHIA_LAYOUT.filter((b) => !bahiaReservada(b.id)).forEach((b) =>
    void publicar(b.id, "LIBRE", "operador"),
  );
}

export function forzarEstamento(
  estamento: "estudiantes" | "docentes" | "administrativos",
  estado: Estado,
): void {
  BAHIA_LAYOUT.filter(
    (b) => b.estamento === estamento && !bahiaReservada(b.id),
  ).forEach((b) => {
    void publicar(b.id, estado, "operador");
  });
}
