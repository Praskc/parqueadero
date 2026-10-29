// Estado reactivo de accesibilidad (WCAG 2.1 AA) persistido en localStorage.
import { computed, ref, watch } from "vue";
import { setTema } from "./theme";

export const ESCALAS_TEXTO = [100, 125, 150, 200] as const;
export type EscalaTexto = (typeof ESCALAS_TEXTO)[number];
export type FuenteLectura = "estandar" | "legible" | "dislexia";

const TAMANOS_BASE: Record<EscalaTexto, string> = {
  100: "16px",
  125: "20px",
  150: "24px",
  200: "32px",
};

export const escalaTexto = ref<EscalaTexto>(100);
export const fuenteLectura = ref<FuenteLectura>("estandar");
export const espaciadoAmplio = ref(false);
export const enlacesSubrayados = ref(false);
export const escalaGrises = ref(false);
export const altoContraste = ref(false);
export const focoDestacado = ref(false);
export const reducirMovimiento = ref(false);

const prefiereMovimientoReducidoSO = ref(
  typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
);

export const movimientoReducidoActivo = computed(
  () => reducirMovimiento.value || prefiereMovimientoReducidoSO.value,
);

export function alternarFuenteLectura(objetivo: "legible" | "dislexia") {
  fuenteLectura.value = fuenteLectura.value === objetivo ? "estandar" : objetivo;
}

let inicializado = false;

export function inicializarAccesibilidad() {
  if (inicializado || typeof window === "undefined") return;
  inicializado = true;

  try {
    const guardada = Number(localStorage.getItem("accesibilidad:escala"));
    if (guardada === 125 || guardada === 150 || guardada === 200) {
      escalaTexto.value = guardada;
    }
    const fuenteGuardada = localStorage.getItem("accesibilidad:fuente");
    if (fuenteGuardada === "legible" || fuenteGuardada === "dislexia") {
      fuenteLectura.value = fuenteGuardada;
    }
    espaciadoAmplio.value = localStorage.getItem("accesibilidad:espaciado") === "1";
    enlacesSubrayados.value = localStorage.getItem("accesibilidad:enlaces") === "1";
    escalaGrises.value = localStorage.getItem("accesibilidad:grises") === "1";
    altoContraste.value = localStorage.getItem("accesibilidad:contraste") === "1";
    focoDestacado.value = localStorage.getItem("accesibilidad:foco") === "1";
    reducirMovimiento.value = localStorage.getItem("accesibilidad:movimiento") === "1";
  } catch {
    // Sin acceso a localStorage en modo restringido.
  }

  if (typeof window.matchMedia === "function") {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefiereMovimientoReducidoSO.value = mq.matches;
    mq.addEventListener?.("change", (ev) => {
      prefiereMovimientoReducidoSO.value = ev.matches;
    });
  }

  aplicarPreferenciasDOM();
}

function aplicarPreferenciasDOM() {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (escalaTexto.value === 100) {
    html.style.removeProperty("font-size");
  } else {
    html.style.fontSize = TAMANOS_BASE[escalaTexto.value];
  }
  html.dataset.escala = String(escalaTexto.value);
  html.dataset.fuente = fuenteLectura.value;
  html.classList.toggle("fuente-legible", fuenteLectura.value === "legible");
  html.classList.toggle("fuente-dislexia", fuenteLectura.value === "dislexia");
  html.classList.toggle("espaciado-amplio", espaciadoAmplio.value);
  html.classList.toggle("enlaces-subrayados", enlacesSubrayados.value);
  html.classList.toggle("escala-grises", escalaGrises.value);
  html.classList.toggle("alto-contraste", altoContraste.value);
  html.classList.toggle("foco-destacado", focoDestacado.value);
  html.classList.toggle("reducir-movimiento", movimientoReducidoActivo.value);

  try {
    localStorage.setItem("accesibilidad:escala", String(escalaTexto.value));
    localStorage.setItem("accesibilidad:fuente", fuenteLectura.value);
    localStorage.setItem("accesibilidad:espaciado", espaciadoAmplio.value ? "1" : "0");
    localStorage.setItem("accesibilidad:enlaces", enlacesSubrayados.value ? "1" : "0");
    localStorage.setItem("accesibilidad:grises", escalaGrises.value ? "1" : "0");
    localStorage.setItem("accesibilidad:contraste", altoContraste.value ? "1" : "0");
    localStorage.setItem("accesibilidad:foco", focoDestacado.value ? "1" : "0");
    localStorage.setItem("accesibilidad:movimiento", reducirMovimiento.value ? "1" : "0");
  } catch {
    // Sin persistencia disponible.
  }
}

watch(
  [
    escalaTexto,
    fuenteLectura,
    espaciadoAmplio,
    enlacesSubrayados,
    escalaGrises,
    altoContraste,
    focoDestacado,
    reducirMovimiento,
    prefiereMovimientoReducidoSO,
  ],
  aplicarPreferenciasDOM,
);

export function restablecerAccesibilidad() {
  escalaTexto.value = 100;
  fuenteLectura.value = "estandar";
  espaciadoAmplio.value = false;
  enlacesSubrayados.value = false;
  escalaGrises.value = false;
  altoContraste.value = false;
  focoDestacado.value = false;
  reducirMovimiento.value = false;
  setTema("claro");
}
