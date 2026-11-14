import { ref, watch } from "vue";

export type Tema = "claro" | "oscuro";

const TEMA_KEY = "parq_tema_preferido";

function leerTemaInicial(): Tema {
  if (typeof window === "undefined") return "claro";
  try {
    return localStorage.getItem(TEMA_KEY) === "oscuro" ? "oscuro" : "claro";
  } catch {
    return "claro";
  }
}

// Por defecto en modo institucional claro; conmutable desde el menú de accesibilidad.
export const tema = ref<Tema>(leerTemaInicial());

export function toggleTema() {
  tema.value = tema.value === "claro" ? "oscuro" : "claro";
}

export function setTema(nuevo: Tema) {
  tema.value = nuevo;
}

if (typeof window !== "undefined") {
  watch(
    tema,
    (val) => {
      try {
        localStorage.setItem(TEMA_KEY, val);
      } catch {
        // Sin persistencia disponible
      }
      if (val === "oscuro") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.body.classList.add("bg-[#0b1120]", "text-slate-100");
        document.body.classList.remove("bg-[#f1f5f9]", "text-slate-900");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.body.classList.add("bg-[#f1f5f9]", "text-slate-900");
        document.body.classList.remove("bg-[#0b1120]", "text-slate-100");
      }

      // Controles nativos y barra del navegador siguen al tema elegido.
      document.documentElement.style.colorScheme = val === "oscuro" ? "dark" : "light";
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", val === "oscuro" ? "#0b1120" : "#0f172a");
    },
    { immediate: true },
  );
}


