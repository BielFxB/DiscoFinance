import React from 'react';
import { 
  Landmark, 
  PiggyBank, 
  TrendingUp, 
  TrendingDown, 
  Edit3, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck 
} from 'lucide-react';
import { formatBRL } from '../api';

export default function MetricCards({ summary, onOpenBalanceModal, onGoToSavings }) {
  const availableBalance = summary?.available_balance ?? 0;
  const totalSaved = summary?.total_saved ?? 0;
  const totalIncome = summary?.total_income || 0;
  const totalExpenses = summary?.total_expenses || 0;
  const totalRecurring = summary?.total_recurring || 0;
  const recurringPaid = summary?.recurring_paid || 0;
  const recurringPending = summary?.recurring_pending || 0;
  const monthTotalOut = totalExpenses + recurringPending;

  const isPositiveBalance = availableBalance >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. Saldo Disponível em Conta */}
      <div className={`border rounded-2xl p-5 shadow-sm transition-all ${
        isPositiveBalance 
          ? 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700' 
          : 'bg-rose-950/20 border-rose-900/50 hover:border-rose-700'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            Saldo Disponível em Conta
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenBalanceModal}
              title="Ajustar saldo inicial/atual da conta"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isPositiveBalance ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              <Landmark className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <p className={`text-2xl font-bold font-mono tracking-tight ${
            isPositiveBalance ? 'text-zinc-100' : 'text-rose-400'
          }`}>
            {formatBRL(availableBalance)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-zinc-400">
            <span>Deduze economias guardadas</span>
          </div>
        </div>
      </div>

      {/* 2. Economias / Gastos Futuros */}
      <div 
        onClick={onGoToSavings}
        className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm hover:border-blue-500/50 cursor-pointer transition-all group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
            Economias / Gastos Futuros
          </span>
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <PiggyBank className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold font-mono tracking-tight text-blue-400">
            {formatBRL(totalSaved)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-zinc-400">
            <ShieldCheck className="w-3 h-3 text-blue-400" />
            <span>Não entra no saldo disponível</span>
          </div>
        </div>
      </div>

      {/* 3. Total Entradas do Mês */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm hover:border-zinc-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Entradas do Mês
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
            {formatBRL(totalIncome)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-zinc-400">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Receitas acumuladas</span>
          </div>
        </div>
      </div>

      {/* 4. Gastos Comprometidos no Mês (Variáveis + Fixos) */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm hover:border-zinc-700 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Total Gastos no Mês
          </span>
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold font-mono tracking-tight text-rose-400">
            {formatBRL(monthTotalOut)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-zinc-400">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            <span>{formatBRL(totalExpenses)} gastos • {formatBRL(recurringPending)} fixos pendentes</span>
          </div>
        </div>
      </div>

    </div>
  );
}
