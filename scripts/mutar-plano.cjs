// Ajustes de geometría del plano vertical (una sola pasada, UTF-8 seguro).
const fs = require("fs");
const f = "apps/web/src/features/parqueadero/ParkingMap.vue";
let t = fs.readFileSync(f, "utf8");
const reemplazos = [
  ['<rect x="126" y="370" width="16" height="190"', '<rect x="126" y="370" width="16" :height="ALTO_PLANO - 560"'],
  ['<line x1="126" y1="370" x2="126" y2="560"', '<line x1="126" y1="370" x2="126" :y2="ALTO_PLANO - 42"'],
  ['<rect x="240" y="42" width="750" height="476"', '<rect x="240" y="42" width="750" :height="ALTO_PLANO - 84"'],
  ['      <line x1="260" y1="280" x2="950" y2="280" stroke="#ffffff" stroke-width="3" opacity="0.9" />\n', ''],
  ['transform="translate(955, 340)"', 'transform="translate(955, 1120)"'],
  ['      <!-- 5. BAHÍAS (2 filas × 15, segmentadas de 5 en 5) — presentación, no interacción -->',
   '      <!-- 5. VÍAS INTERNAS: carril vertical desde portería + pasillo de cada zona -->\n      <rect :x="(CIRCULACION.carrilX0 / 100) * 1000" :y="(CIRCULACION.carrilDesde / 100) * ALTO_PLANO"\n            :width="((CIRCULACION.carrilX1 - CIRCULACION.carrilX0) / 100) * 1000"\n            :height="((CIRCULACION.carrilHasta - CIRCULACION.carrilDesde) / 100) * ALTO_PLANO" fill="#475569" />\n      <line :x1="(CIRCULACION.carrilX / 100) * 1000" :y1="(CIRCULACION.carrilDesde / 100) * ALTO_PLANO + 30"\n            :x2="(CIRCULACION.carrilX / 100) * 1000" :y2="(CIRCULACION.pasillos[2] / 100) * ALTO_PLANO"\n            stroke="#facc15" stroke-width="1.6" stroke-dasharray="10 8" opacity="0.9" />\n      <g v-for="p in CIRCULACION.pasillos" :key="`via-${p}`">\n        <rect :x="(CIRCULACION.pasilloDesde / 100) * 1000" :y="((p - 1.6) / 100) * ALTO_PLANO"\n              :width="((CIRCULACION.pasilloHasta - CIRCULACION.pasilloDesde) / 100) * 1000" :height="46" fill="#475569" />\n        <line :x1="(CIRCULACION.carrilX1 / 100) * 1000" :y1="(p / 100) * ALTO_PLANO"\n              :x2="(CIRCULACION.pasilloHasta / 100) * 1000" :y2="(p / 100) * ALTO_PLANO"\n              stroke="#facc15" stroke-width="1.6" stroke-dasharray="10 8" opacity="0.9" />\n        <path :d="`M ${(290 / 1000) * 1000} ${(p / 100) * ALTO_PLANO} l 26 -7 l 0 14 z`" fill="#facc15" opacity="0.85" />\n      </g>\n\n      <!-- 6. BAHÍAS (3 zonas × 10, data-driven) — presentación, no interacción -->'],
];
let n = 0;
for (const [a, b] of reemplazos) { if (t.includes(a)) { t = t.split(a).join(b); n++; } }
fs.writeFileSync(f, t);
console.log("reemplazos aplicados:", n, "de", reemplazos.length);
