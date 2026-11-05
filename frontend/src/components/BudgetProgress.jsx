import React from 'react';
import { formatBRL } from '../api';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

export default function BudgetProgress({ summary }) {
  const totalIncome = summary?.total_income || 0;
  const totalExpenses = summary?.total_expenses || 0;
  const totalRecurring = summary?.total_recurring || 0;
  const recurringPending = summary?.recurring_pending ?? Math.max(0, totalRecurring - (summary?.recurring_paid || 0));
  const totalCommitted = totalExpenses + recurringPending;

  const percentage = summary?.budget_usage_percent ?? (
    totalIncome > 0 
      ? Math.min(Math.round((totalCommitted / totalIncome) * 100), 200) 
      : 0
  );

  // Determinar status e cor
  let statusColor = 'bg-emerald-500';
  let badgeText = 'Saudável';
  let badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  let Icon = ShieldCheck;

  if (totalIncome === 0 && totalCommitted > 0) {
    statusColor = 'bg-rose-500';
    badgeText = 'Sem receitas registradas';
    badgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    Icon = AlertTriangle;
  } else if (percentage > 100) {
    statusColor = 'bg-rose-500';
    badgeText = `Orçamento Estourado (${percentage}%)`;
    badgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    Icon = AlertOctagon;
  } else if (percentage >= 85) {
    statusColor = 'bg-amber-500';
    badgeText = `Atenção (${percentage}%)`;
    badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    Icon = AlertTriangle;
  } else {
    badgeText = `Dentro do Planejado (${percentage}%)`;
  }

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">
            Consumo do Orçamento Mensal
          </h3>
          <p className="text-xs text-zinc-400">
            Comprometimento total (Variáveis + Fixos) em relação às receitas
          </p>
        </div>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${badgeClass}`}>
          <Icon className="w-3.5 h-3.5" />
          <span>{badgeText}</span>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-700 ${statusColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2.5 text-xs text-zinc-400">
        <span>Comprometido: <strong className="text-zinc-200">{formatBRL(totalCommitted)}</strong></span>
        <span>Receitas: <strong className="text-zinc-200">{formatBRL(totalIncome)}</strong></span>
      </div>
    </div>
  );
}

