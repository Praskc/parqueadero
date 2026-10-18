import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export interface OccupancyRingChartProps {
  ocupados: number;
  disponibles: number;
  total: number;
  porcentaje: number;
  talanqueraBloqueada?: boolean;
  estudiantesOcupados?: number;
  estudiantesTotal?: number;
  docentesOcupados?: number;
  docentesTotal?: number;
}

export const OccupancyRingChart: React.FC<OccupancyRingChartProps> = ({
  ocupados,
  disponibles,
  total,
  porcentaje,
  talanqueraBloqueada = false,
  estudiantesOcupados = 0,
  estudiantesTotal = 5,
  docentesOcupados = 0,
  docentesTotal = 5,
}) => {
  const isFull = disponibles === 0;

  // Color de estado según el nivel de ocupación
  const ringColor = talanqueraBloqueada
    ? '#dc2626' // Rojo bloqueo
    : isFull
    ? '#dc2626' // Rojo lleno
    : porcentaje >= 70
    ? '#ea580c' // Naranja aforo alto
    : porcentaje >= 40
    ? '#ca8a04' // Amarillo medio
    : '#16a34a'; // Verde óptimo

  // Datos para el anillo exterior principal (Ocupación Total)
  // Manejo de caso cuando ambos son 0 para evitar anillo roto
  const totalData = total === 0 ? [
    { name: 'Sin datos', value: 1, color: '#e2e8f0' }
  ] : [
    { name: 'Ocupadas', value: ocupados, color: ringColor },
    { name: 'Disponibles', value: disponibles, color: '#f1f5f9' },
  ];

  // Datos para el anillo interior (Desglose por zonas: Estudiantes y Docentes)
  const zoneData = [
    { name: 'Estudiantes Ocup.', value: estudiantesOcupados, color: '#0284c7' },
    { name: 'Estudiantes Libres', value: Math.max(0, estudiantesTotal - estudiantesOcupados), color: '#e0f2fe' },
    { name: 'Docentes Ocup.', value: docentesOcupados, color: '#7c3aed' },
    { name: 'Docentes Libres', value: Math.max(0, docentesTotal - docentesOcupados), color: '#ede9fe' },
  ];

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Cabecera del widget */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                talanqueraBloqueada ? 'bg-red-400' : isFull ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                talanqueraBloqueada ? 'bg-red-500' : isFull ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
          </span>
          <span className="text-[10px] font-extrabold tracking-wider text-slate-700 uppercase font-mono">
            OCUPACIÓN EN TIEMPO REAL
          </span>
        </div>
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
            talanqueraBloqueada
              ? 'bg-red-100 text-red-700'
              : isFull
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {talanqueraBloqueada ? 'BLOQUEADO' : isFull ? 'COMPLETO' : 'OPERATIVO'}
        </span>
      </div>

      {/* Gráfico de Anillos Recharts con Porcentaje Central */}
      <div className="relative w-full h-[150px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            {/* Anillo Interior: Segmentación Estudiantes vs Docentes */}
            <Pie
              data={zoneData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={36}
              outerRadius={48}
              stroke="#ffffff"
              strokeWidth={1.5}
              isAnimationActive={true}
              animationDuration={500}
            >
              {zoneData.map((entry, index) => (
                <Cell key={`zone-cell-${index}`} fill={entry.color} />
              ))}
            </Pie>

            {/* Anillo Exterior Principal: Ocupadas vs Libres */}
            <Pie
              data={totalData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={68}
              stroke="#ffffff"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={true}
              animationDuration={600}
            >
              {totalData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0];
                  return (
                    <div className="bg-slate-900/90 text-white text-[10px] px-2 py-1 rounded shadow-md border border-slate-700">
                      <span className="font-semibold">{data.name}:</span> {data.value} plazas
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Centro del Anillo: Porcentaje y Etiqueta */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="text-2xl font-black tracking-tight leading-none font-mono"
            style={{ color: ringColor }}
          >
            {porcentaje}%
          </span>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
            Aforo
          </span>
        </div>
      </div>

      {/* Métricas y leyenda compacta */}
      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] border-t border-slate-100">
        <div className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded">
          <span className="text-slate-500 font-medium">Ocupadas:</span>
          <span className="font-bold font-mono text-slate-800">{ocupados}/{total}</span>
        </div>
        <div className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded">
          <span className="text-slate-500 font-medium">Libres:</span>
          <span className="font-bold font-mono text-emerald-700">{disponibles}</span>
        </div>
      </div>

      {/* Desglose por zona institucional */}
      <div className="flex items-center justify-between text-[9px] text-slate-500 font-medium px-0.5">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          Estudiantes: {estudiantesOcupados}/{estudiantesTotal}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          Docentes: {docentesOcupados}/{docentesTotal}
        </span>
      </div>
    </div>
  );
};

export default OccupancyRingChart;
