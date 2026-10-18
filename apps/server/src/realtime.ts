/** Clientes WebSocket conectados (hub en memoria, un solo proceso). */
export interface Sock {
  send(data: string): void;
  on(event: string, cb: () => void): void;
}

const clients = new Set<Sock>();

export const attach = (s: Sock) => {
  clients.add(s);
  s.on("close", () => clients.delete(s));
};

export const broadcast = (m: unknown) => {
  const s = JSON.stringify(m);
  for (const c of clients) c.send(s);
};
