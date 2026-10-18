/** Token del panel de operador/admin (por pestaña, en sessionStorage).
 * No usa prompt(): la consola muestra su propia pantalla de bloqueo. */
let token: string | null = null;

export function tokenAdmin(): string | null {
  if (!token) token = sessionStorage.getItem("token");
  return token;
}

export function guardarToken(t: string): void {
  token = t;
  sessionStorage.setItem("token", t);
}

export function limpiarToken(): void {
  token = null;
  sessionStorage.removeItem("token");
}
