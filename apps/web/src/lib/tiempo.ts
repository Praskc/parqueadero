/** "hace 12 s", "hace 3 min"… */
export const relativo = (ts: number | null, ahora: number): string => {
  if (!ts) return "sin dato";
  const s = Math.max(0, Math.round((ahora - ts) / 1000));
  if (s < 5) return "ahora";
  if (s < 60) return `hace ${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
};
