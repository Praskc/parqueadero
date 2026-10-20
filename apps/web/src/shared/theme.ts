import { ref, watch } from "vue";

export type Tema = "claro" | "oscuro";

const TEMA_KEY = "parq_tema_preferido";

// Requisito del usuario: "en este caso muestrae el claro"
// Por defecto siempre 'claro', respetando la instrucción explícita del usuario
export const tema = ref<Tema>("claro");

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
      } catch {}
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
      // La barra del navegador / borde del kiosco acompaña al tema.
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", val === "oscuro" ? "#0b1120" : "#f1f5f9");
    },
    { immediate: true }
  );
}
