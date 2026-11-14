/** Registro de diseños de vehículos.
 * Agregá un modelo nuevo acá: los componentes lo renderizan sin tocar lógica de tráfico.
 */
import type { DisenoVehiculo } from "../../types/hmi";

export const DISENOS_VEHICULOS: DisenoVehiculo[] = [
  { id: "moto-scooter", tipo: "moto", modelo: "scooter", color: "#f8fafc", cascoColor: "#f8fafc" },
  { id: "moto-clasica", tipo: "moto", modelo: "clasica", color: "#e2e8f0", cascoColor: "#cbd5e1" },
  { id: "moto-enduro", tipo: "moto", modelo: "enduro", color: "#cbd5e1", cascoColor: "#334155" },
  { id: "moto-deportiva", tipo: "moto", modelo: "deportiva", color: "#94a3b8", cascoColor: "#1e293b" },
  { id: "carro-sedan", tipo: "carro", modelo: "sedan", color: "#e2e8f0" },
  { id: "carro-suv", tipo: "carro", modelo: "suv", color: "#cbd5e1" },
  { id: "carro-compacto", tipo: "carro", modelo: "compacto", color: "#94a3b8" },
];

export function disenoPorModelo(modelo: string, tipo: "moto" | "carro"): DisenoVehiculo | undefined {
  return DISENOS_VEHICULOS.find((d) => d.modelo === modelo && d.tipo === tipo);
}

export function modelosPorTipo(tipo: "moto" | "carro"): string[] {
  return DISENOS_VEHICULOS.filter((d) => d.tipo === tipo).map((d) => d.modelo);
}
