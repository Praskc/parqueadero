import { computed } from "vue";
import { ESTAMENTOS } from "../../config/bahias";
import { tema } from "../../shared/theme";
import type { AnimacionMoto, Bahia } from "../../types/hmi";

export type TonoEstado = "operativo" | "alerta" | "critico" | "neutro";
export type EstamentoKey = "estudiantes" | "docentes" | "administrativos";

/** Umbrales operativos: alerta desde 65%, crítico desde 85%. */
export const UMBRAL_ALERTA_PCT = 65;
export const UMBRAL_CRITICO_PCT = 85;

export interface EstadoPanelPublico {
  bahias: Bahia[];
  animaciones: AnimacionMoto[];
  total: number;
  conectado: boolean;
  bloqueada: boolean;
  ultimaActualizacion: number | null;
  ahora: number;
}

export function usePanelPublico(props: EstadoPanelPublico) {
  const bahiasEnCamino = computed(() => {
    const asignadas = new Set<string>();
    for (const a of props.animaciones) {
      if (
        a.tipo === "ingreso" &&
        a.espacioId &&
        a.espacioId !== "EN_ESPERA"
      ) {
        asignadas.add(a.espacioId);
      }
    }
    return asignadas;
  });

  const ocupadas = computed(
    () => props.bahias.filter((b) => b.estado === "OCUPADO").length,
  );
  const enCaminoGlobal = computed(
    () =>
      props.bahias.filter(
        (b) => b.estado === "LIBRE" && bahiasEnCamino.value.has(b.id),
      ).length,
  );
  const libresEfectivos = computed(
    () =>
      props.bahias.filter(
        (b) => b.estado === "LIBRE" && !bahiasEnCamino.value.has(b.id),
      ).length,
  );
  const sinDatoGlobal = computed(
    () => props.bahias.filter((b) => b.estado === "SIN_DATO").length,
  );
  const sinSenalGlobal = computed(
    () => props.total > 0 && sinDatoGlobal.value === props.total,
  );
  const isFull = computed(
    () => !sinSenalGlobal.value && libresEfectivos.value === 0,
  );

  const pctOcupacion = computed(() =>
    props.total > 0 ? Math.round((ocupadas.value / props.total) * 100) : 0,
  );
  const pctEnCamino = computed(() =>
    props.total > 0
      ? Math.min(
          100 - pctOcupacion.value,
          Math.round((enCaminoGlobal.value / props.total) * 100),
        )
      : 0,
  );
  const pctComprometido = computed(() =>
    props.total > 0
      ? Math.round(((ocupadas.value + enCaminoGlobal.value) / props.total) * 100)
      : 0,
  );

  function calcularTono(
    libres: number,
    pctEval: number,
    sinSenal: boolean,
  ): TonoEstado {
    if (sinSenal) return "neutro";
    if (libres === 0 || pctEval >= UMBRAL_CRITICO_PCT) return "critico";
    if (pctEval >= UMBRAL_ALERTA_PCT) return "alerta";
    return "operativo";
  }

  function claseTextoTono(tono: TonoEstado): string {
    if (tono === "neutro")
      return tema.value === "oscuro" ? "text-slate-200" : "text-slate-700";
    if (tono === "critico")
      return tema.value === "oscuro" ? "text-[#f87171]" : "text-[#b91c1c]";
    if (tono === "alerta")
      return tema.value === "oscuro" ? "text-[#facc15]" : "text-[#8a6d00]";
    return tema.value === "oscuro" ? "text-[#4ade80]" : "text-[#15803d]";
  }

  function claseBarraTono(tono: TonoEstado): string {
    if (tono === "neutro")
      return tema.value === "oscuro" ? "bg-slate-600" : "bg-slate-400";
    if (tono === "critico")
      return tema.value === "oscuro" ? "bg-red-500" : "bg-[#dc2626]";
    if (tono === "alerta")
      return tema.value === "oscuro" ? "bg-[#facc15]" : "bg-[#eab308]";
    return tema.value === "oscuro" ? "bg-emerald-500" : "bg-[#15803d]";
  }

  const tonoGlobal = computed<TonoEstado>(() => {
    if (!props.conectado || props.bloqueada) return "critico";
    return calcularTono(
      libresEfectivos.value,
      pctComprometido.value,
      sinSenalGlobal.value,
    );
  });

  const cupoColor = computed(() => claseTextoTono(tonoGlobal.value));
  const porcentajeColor = computed(() => claseTextoTono(tonoGlobal.value));
  const porcentajeBarColor = computed(() =>
    claseBarraTono(tonoGlobal.value),
  );

  const sinLectura = computed(
    () => !props.conectado || sinSenalGlobal.value,
  );

  const valorCupos = computed(() => {
    if (sinLectura.value) return "—";
    if (props.bloqueada) return "0";
    return String(libresEfectivos.value);
  });
  const valorOcupadas = computed(() =>
    sinLectura.value ? "—" : String(ocupadas.value),
  );
  const valorEnCamino = computed(() =>
    sinLectura.value ? "—" : String(enCaminoGlobal.value),
  );

  const claseValorCupos = computed(() => {
    if (sinLectura.value)
      return tema.value === "oscuro" ? "text-slate-400" : "text-[#64748b]";
    return cupoColor.value;
  });

  const claseEtiquetaCupos = computed(() => {
    if (!props.conectado || props.bloqueada) {
      return tema.value === "oscuro" ? "text-[#f87171]" : "text-[#b91c1c]";
    }
    return tema.value === "oscuro" ? "text-white" : "text-[#184320]";
  });

  const claseValorOcupadas = computed(() => {
    if (sinLectura.value)
      return tema.value === "oscuro" ? "text-slate-500" : "text-[#94a3b8]";
    return tema.value === "oscuro" ? "text-white" : "text-[#1f2937]";
  });

  const claseValorCamino = computed(() => {
    if (sinLectura.value)
      return tema.value === "oscuro" ? "text-slate-500" : "text-[#94a3b8]";
    return enCaminoGlobal.value > 0
      ? tema.value === "oscuro"
        ? "text-[#fbbf24]"
        : "text-[#a06300]"
      : tema.value === "oscuro"
        ? "text-slate-500"
        : "text-neutral-400";
  });

  const estadoFrescuraSensores = computed<{
    texto: string;
    tono: TonoEstado;
  }>(() => {
    if (!props.conectado) {
      return { texto: "Sensores: sin conexión", tono: "critico" };
    }
    if (props.ultimaActualizacion === null) {
      return { texto: "Sensores: esperando lectura", tono: "alerta" };
    }
    const seg = Math.max(
      0,
      Math.floor((props.ahora - props.ultimaActualizacion) / 1000),
    );
    if (seg < 5) {
      return { texto: "Sensores: actualizado ahora", tono: "operativo" };
    }
    if (seg < 30) {
      return { texto: `Sensores: hace ${seg} s`, tono: "operativo" };
    }
    if (seg < 120) {
      const etiqueta = seg < 60 ? `hace ${seg} s` : "hace 1 min";
      return { texto: `Sensores: ${etiqueta} (demorado)`, tono: "alerta" };
    }
    const min = Math.floor(seg / 60);
    if (min < 60) {
      return {
        texto: `Sensores: hace ${min} min (lectura antigua)`,
        tono: "critico",
      };
    }
    const horas = Math.floor(min / 60);
    if (horas < 48) {
      return {
        texto: `Sensores: hace ${horas} h (lectura antigua)`,
        tono: "critico",
      };
    }
    const dias = Math.floor(horas / 24);
    return {
      texto: `Sensores: hace ${dias} días (lectura antigua)`,
      tono: "critico",
    };
  });

  const detalleFrescura = computed(() =>
    estadoFrescuraSensores.value.texto.replace(/^Sensores:\s*/, ""),
  );

  const resumenSensores = computed(() => {
    if (!props.conectado) return "Sin conexión";
    if (props.ultimaActualizacion === null) return "Sin lectura";
    const seg = Math.max(
      0,
      Math.floor((props.ahora - props.ultimaActualizacion) / 1000),
    );
    if (seg < 5) return "Ahora";
    if (seg < 60) return `Hace ${seg} s`;
    const min = Math.floor(seg / 60);
    if (min < 60) return `Hace ${min} min`;
    const horas = Math.floor(min / 60);
    if (horas < 48) return `Hace ${horas} h`;
    return `Hace ${Math.floor(horas / 24)} d`;
  });

  const estamentoLista = computed(() =>
    ESTAMENTOS.map((est) => {
      const plazas = props.bahias.filter((b) => b.estamento === est.key);
      const totalZona = plazas.length || 10;
      const libres = plazas.filter(
        (b) => b.estado === "LIBRE" && !bahiasEnCamino.value.has(b.id),
      ).length;
      const enCamino = plazas.filter(
        (b) => b.estado === "LIBRE" && bahiasEnCamino.value.has(b.id),
      ).length;
      const ocup = plazas.filter((b) => b.estado === "OCUPADO").length;
      const sinDato = plazas.filter((b) => b.estado === "SIN_DATO").length;
      const sinSenal = sinDato === totalZona;
      const pct =
        totalZona > 0 ? Math.round((ocup / totalZona) * 100) : 0;
      const pctCamino =
        totalZona > 0
          ? Math.min(100 - pct, Math.round((enCamino / totalZona) * 100))
          : 0;
      const pctEval =
        totalZona > 0
          ? Math.round(((ocup + enCamino) / totalZona) * 100)
          : 0;
      const tono = calcularTono(libres, pctEval, sinSenal);
      return {
        key: est.key,
        nombre: est.label,
        rango: est.rango,
        libres,
        enCamino,
        ocupadas: ocup,
        sinDato,
        sinSenal,
        total: totalZona,
        pct,
        pctCamino,
        tono,
      };
    }),
  );

  const zonasConCupo = computed(() =>
    estamentoLista.value.filter(
      (item) => !props.bloqueada && item.libres > 0,
    ),
  );
  const hayCupoEnAlgunaZona = computed(() => zonasConCupo.value.length > 0);
  const unicaZonaConCupoKey = computed<EstamentoKey | null>(() =>
    zonasConCupo.value.length === 1 ? zonasConCupo.value[0].key : null,
  );

  function esSectorAtenuado(libres: number, sinSenal: boolean): boolean {
    if (!hayCupoEnAlgunaZona.value || sinSenal) return false;
    return libres === 0;
  }

  function esSectorDestacado(key: EstamentoKey, libres: number): boolean {
    if (props.bloqueada || libres === 0) return false;
    return unicaZonaConCupoKey.value === key;
  }

  const etiquetaEstadoPrincipal = computed(() => {
    if (!props.conectado) return "Sin conexión";
    if (props.bloqueada) return "Portería cerrada";
    if (isFull.value) return "Aforo completo";
    return libresEfectivos.value === 1 ? "Cupo libre" : "Cupos libres";
  });

  return {
    ocupadas,
    enCaminoGlobal,
    libresEfectivos,
    sinSenalGlobal,
    pctOcupacion,
    pctEnCamino,
    calcularTono,
    claseTextoTono,
    claseBarraTono,
    porcentajeColor,
    porcentajeBarColor,
    sinLectura,
    valorCupos,
    valorOcupadas,
    valorEnCamino,
    claseValorCupos,
    claseEtiquetaCupos,
    claseValorOcupadas,
    claseValorCamino,
    estadoFrescuraSensores,
    detalleFrescura,
    resumenSensores,
    estamentoLista,
    esSectorAtenuado,
    esSectorDestacado,
    etiquetaEstadoPrincipal,
  };
}
