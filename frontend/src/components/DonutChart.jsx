import React, { useState } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { formatBRL } from '../api';

export default function DonutChart({ categoryBreakdown, totalExpenses }) {
  const [activeCategory, setActiveCategory] = useState(null);

  if (!categoryBreakdown || categoryBreakdown.length === 0 || totalExpenses <= 0) {
    return (
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[320px] text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 text-zinc-500 flex items-center justify-center mb-3">
          <PieChartIcon className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-zinc-300">Sem despesas registradas</p>
        <p className="text-xs text-zinc-500 max-w-xs mt-1">
          Lance despesas pelo Web App ou via Discord para visualizar o gráfico por categorias.
        </p>
      </div>
    );
  }

  // Dimensões do SVG
  const size = 220;
  const center = size / 2;
  const outerRadius = 90;
  const innerRadius = 55;

  // Gerar arcos para cada categoria
  let cumulativeAngle = -Math.PI / 2; // Começa no topo (12 horas)

  const slices = categoryBreakdown.map((cat) => {
    const sliceAngle = (cat.total / totalExpenses) * (2 * Math.PI);
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle = endAngle;

    const x1 = center + outerRadius * Math.cos(startAngle);
    const y1 = center + outerRadius * Math.sin(startAngle);
    const x2 = center + outerRadius * Math.cos(endAngle);
    const y2 = center + outerRadius * Math.sin(endAngle);

    const x3 = center + innerRadius * Math.cos(endAngle);
    const y3 = center + innerRadius * Math.sin(endAngle);
    const x4 = center + innerRadius * Math.cos(startAngle);
    const y4 = center + innerRadius * Math.sin(startAngle);

    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

    // Se for quase 100%, faz dois semicírculos para evitar bugs de arco completo no SVG
    const pathData = sliceAngle >= 2 * Math.PI - 0.001
      ? `M ${center - outerRadius} ${center} A ${outerRadius} ${outerRadius} 0 1 0 ${center + outerRadius} ${center} A ${outerRadius} ${outerRadius} 0 1 0 ${center - outerRadius} ${center} M ${center - innerRadius} ${center} A ${innerRadius} ${innerRadius} 0 1 1 ${center + innerRadius} ${center} A ${innerRadius} ${innerRadius} 0 1 1 ${center - innerRadius} ${center} Z`
      : `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;

    return {
      ...cat,
      pathData,
      startAngle,
      endAngle,
    };
  });

  const displayItem = activeCategory || {
    category_name: 'Total Despesas',
    total: totalExpenses,
    percentage: 100,
    color: '#6366f1',
  };

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-200">
          Despesas por Categoria
        </h3>
        <span className="text-xs text-zinc-400">
          {categoryBreakdown.length} {categoryBreakdown.length === 1 ? 'categoria' : 'categorias'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        
        {/* SVG Donut */}
        <div className="relative flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="overflow-visible"
          >
            {slices.map((slice, index) => {
              const isSelected = activeCategory?.category_name === slice.category_name;
              return (
                <path
                  key={index}
                  d={slice.pathData}
                  fill={slice.color || '#64748B'}
                  stroke="#18181b"
                  strokeWidth="2"
                  className="cursor-pointer transition-all duration-200 hover:opacity-90"
                  style={{
                    transformOrigin: `${center}px ${center}px`,
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    filter: isSelected ? 'drop-shadow(0 0 8px rgba(255,255,255,0.2))' : 'none',
                  }}
                  onMouseEnter={() => setActiveCategory(slice)}
                  onMouseLeave={() => setActiveCategory(null)}
                  onClick={() => setActiveCategory(isSelected ? null : slice)}
                />
              );
            })}
          </svg>

          {/* Centro do Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider truncate max-w-[100px]">
              {displayItem.category_name}
            </span>
            <span className="text-base font-bold text-zinc-100">
              {formatBRL(displayItem.total)}
            </span>
            {activeCategory && (
              <span className="text-[10px] text-zinc-400 font-mono">
                {activeCategory.percentage}%
              </span>
            )}
          </div>
        </div>

        {/* Legenda de Categorias */}
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
          {categoryBreakdown.map((item, index) => {
            const isHovered = activeCategory?.category_name === item.category_name;
            return (
              <div
                key={index}
                onMouseEnter={() => setActiveCategory(item)}
                onMouseLeave={() => setActiveCategory(null)}
                className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                  isHovered ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-zinc-200 font-medium truncate">
                    {item.category_name}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 text-right">
                  <span className="text-zinc-400 font-mono text-[11px]">
                    {item.percentage}%
                  </span>
                  <span className="text-zinc-100 font-semibold font-mono">
                    {formatBRL(item.total)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

