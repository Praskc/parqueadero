import { ref } from "vue";
import type { MensajeWs } from "@parq/shared";

/**
 * Bus único de WebSocket: una sola conexión por pestaña, con reconexión.
 * Las capas/composables se suscriben con `onMensaje`.
 */
export const conectado = ref(false);

type Handler = (m: MensajeWs) => void;
const handlers = new Set<Handler>();
let started = false;

export function onMensaje(h: Handler): () => void {
  handlers.add(h);
  if (!started) {
    started = true;
    conn();
  }
  return () => handlers.delete(h);
}

function conn() {
  const w = new WebSocket(`ws://${location.host}/ws`);
  w.onopen = () => (conectado.value = true);
  w.onclose = () => {
    conectado.value = false;
    setTimeout(conn, 2000);
  };
  w.onmessage = (ev) => {
    const m = JSON.parse(ev.data) as MensajeWs;
    for (const h of handlers) h(m);
  };
}
