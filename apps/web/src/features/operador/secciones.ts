export type TabOperador = "control" | "graficos" | "telemetria" | "eventos";

export interface SeccionOperador {
  id: TabOperador;
  label: string;
  desc: string;
}

export const SECCIONES: ReadonlyArray<SeccionOperador> = [
  {
    id: "control",
    label: "Control de portería",
    desc: "Talanquera, tráfico y estado manual de las 30 plazas",
  },
  {
    id: "graficos",
    label: "Analítica diaria",
    desc: "Flujo horario, disponibilidad por estamento y rotación",
  },
  {
    id: "telemetria",
    label: "Sensores en vivo",
    desc: "Diagnóstico de lazos inductivos, fotocelda y nodos MQTT",
  },
  {
    id: "eventos",
    label: "Libro de registros",
    desc: "Bitácora cronológica de accesos y mensajes del bus",
  },
];
