import { CIRCULACION, esBahiaMoto } from "../../../config/bahias";
import { sonido } from "../../../lib/sonido";
import type { Origen } from "../../../types/hmi";
import { anims, bloqueada, estados, notificar, uid } from "../estado";
import {
  addAnim,
  animarSalida,
  aproximarPorCalle,
  retardoPorTrafico,
  tramoRuta,
} from "./animaciones";
import { bahiaReservada, primeraLibre, primeraOcupada } from "./bahias";
import { resolverEsperas } from "./colaEspera";
import { abrirTalanquera } from "./talanquera";
import { confirmarLiberacion, confirmarOcupacion } from "./transiciones";

export function ingreso(
  targetId?: string,
  origen: Origen = Math.random() > 0.5 ? "norte" : "sur",
  forzarEspera = false,
): void {
  sonido.deteccion();

  if (targetId && bahiaReservada(targetId)) {
    const yaOcupada = estados[targetId] === "OCUPADO";
    notificar(
      "alerta",
      `Plaza ${targetId} no disponible`,
      yaOcupada
        ? `La plaza ${targetId} ya está ocupada. Elige otra para el ingreso.`
        : `La plaza ${targetId} tiene un vehículo en camino. Espera a que se confirme la ocupación antes de asignar otra moto.`,
      targetId,
      "alta",
    );
    return;
  }

  const target =
    targetId && estados[targetId] === "LIBRE" && !bahiaReservada(targetId)
      ? targetId
      : primeraLibre();
  const debeEsperar = forzarEspera || bloqueada.value || !target;
  const retardo = retardoPorTrafico();

  const anim = addAnim({
    id: uid(),
    tipo: "ingreso",
    espacioId: target ?? "EN_ESPERA",
    origen,
    etapa: "aproximacion",
    oculto: retardo > 0,
    posicionActual: {
      x: origen === "norte" ? 3.5 : 8.0,
      y: origen === "norte" ? 6.5 : 93.5,
      rotacion: origen === "norte" ? 90 : -90,
    },
  });

  const tipoVehiculo =
    target && !esBahiaMoto(target) ? "Automóvil" : "Motocicleta";
  notificar(
    "ingreso",
    `Vehículo en carril ${origen === "norte" ? "Norte" : "Sur"}`,
    debeEsperar
      ? "Aforo completo o portería bloqueada: el vehículo esperará frente a la talanquera."
      : `${tipoVehiculo} ingresando por portería. Plaza ${target} reservada en camino.`,
    target,
    "media",
  );

  window.setTimeout(() => {
    if (!anims.has(anim.id)) return;
    anim.oculto = false;
    aproximarPorCalle(anim, origen, () => {
      if (debeEsperar || !target) {
        const fila = [...anims.values()].filter(
          (a) => a.etapa === "esperando",
        ).length;
        anim.etapa = "esperando";
        anim.posicionActual = {
          x: 17.5 - fila * 6.5,
          y: CIRCULACION.entradaY[0],
          rotacion: 0,
        };
        sonido.lleno();
        notificar(
          "lleno",
          "Vehículo en espera",
          "Detenido en el sensor de portería esperando un puesto libre.",
          undefined,
          "alta",
        );
        return;
      }
      abrirTalanquera("entrada");
      tramoRuta(anim, target, () =>confirmarOcupacion(target));
    });
  }, retardo);
}

export function salida(targetId?: string): void {
  const target =
    targetId && estados[targetId] === "OCUPADO" && !bahiaReservada(targetId)
      ? targetId
      : primeraOcupada();
  if (!target) return;
  const tipoVehiculo = esBahiaMoto(target) ? "Motocicleta" : "Automóvil";
  notificar(
    "salida",
    `Salida de plaza ${target}`,
    `${tipoVehiculo} saliendo hacia la calzada de salida.`,
    target,
    "media",
  );
  animarSalida(target, retardoPorTrafico(), () => {
    confirmarLiberacion(target, true);
    resolverEsperas();
  });
}
