import React, { useState } from 'react';
import { 
  PlusCircle, 
  Calendar, 
  Trash2, 
  CheckCircle, 
  PauseCircle, 
  CheckCircle2, 
  RotateCcw, 
  Loader2, 
  Clock, 
  Filter,
  Wallet
} from 'lucide-react';
import { formatBRL, recurringApi } from '../api';

export default function RecurringList({ 
  recurring = [], 
  currentMonth, 
  currentYear, 
  onRefresh, 
  onOpenNewModal 
}) {
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'PENDING', 'PAID'
  const [processingId, setProcessingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handlePay = async (item) => {
    setProcessingId(item.id);
    try {
      await recurringApi.pay(item.id, { month: currentMonth, year: currentYear });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Erro ao registrar pagamento: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnpay = async (item) => {
    setProcessingId(item.id);
    try {
      await recurringApi.unpay(item.id, { month: currentMonth, year: currentYear });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Erro ao desfazer pagamento: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggle = async (id) => {
    setTogglingId(id);
    try {
      await recurringApi.toggle(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Erro ao alterar status: ${err.message}`);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir este gasto fixo?')) return;
    setDeletingId(id);
    try {
      await recurringApi.delete(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Erro ao remover: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Cálculos de totais
  const activeItems = recurring.filter((r) => r.is_active);
  const totalMonthly = activeItems.reduce((sum, r) => sum + r.amount, 0);
  const paidItems = activeItems.filter((r) => r.is_paid);
  const paidTotal = paidItems.reduce((sum, r) => sum + r.amount, 0);
  const pendingItems = activeItems.filter((r) => !r.is_paid);
  const pendingTotal = pendingItems.reduce((sum, r) => sum + r.amount, 0);

  const percentPaid = totalMonthly > 0 ? Math.round((paidTotal / totalMonthly) * 100) : 0;

  // Filtragem da lista
  const filteredList = recurring.filter((item) => {
    if (filter === 'PAID') return item.is_paid;
    if (filter === 'PENDING') return !item.is_paid && item.is_active;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Header com Resumo Financeiro de Fixos e Barra de Progresso */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Compromissos e Gastos Fixos
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 mt-1">
              Total Comprometido: <span className="text-purple-300 font-mono">{formatBRL(totalMonthly)}</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Ao marcar um gasto fixo como pago, ele é <strong className="text-emerald-400">debitado automaticamente do saldo em conta</strong>.
            </p>
          </div>

          <button
            onClick={onOpenNewModal}
            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-purple-600/20 active:scale-95 flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Novo Gasto Fixo</span>
          </button>
        </div>

        {/* Cards Resumo: Já Pago vs Pendente */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/80">
          <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-3">
            <span className="text-[11px] font-medium text-zinc-400">Total Previsto no Mês</span>
            <p className="text-base font-bold font-mono text-zinc-100 mt-0.5">{formatBRL(totalMonthly)}</p>
          </div>
          
          <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-emerald-400">Já Pago ({paidItems.length})</span>
              <span className="text-[11px] font-bold text-emerald-400">{percentPaid}%</span>
            </div>
            <p className="text-base font-bold font-mono text-emerald-400 mt-0.5">{formatBRL(paidTotal)}</p>
          </div>

          <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3">
            <span className="text-[11px] font-medium text-amber-400">A Pagar ({pendingItems.length})</span>
            <p className="text-base font-bold font-mono text-amber-400 mt-0.5">{formatBRL(pendingTotal)}</p>
          </div>
        </div>

        {/* Barra de Progresso de Fixos Pagos */}
        {totalMonthly > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Progresso de Pagamentos</span>
              <span>{paidItems.length} de {activeItems.length} contas pagas</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, percentPaid)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Filtros de Exibição */}
      {recurring.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'ALL'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            Todos ({recurring.length})
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            ⏳ Pendentes ({pendingItems.length})
          </button>
          <button
            onClick={() => setFilter('PAID')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === 'PAID'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            ✅ Pagos ({paidItems.length})
          </button>
        </div>
      )}

      {/* 3. Grid de Gastos Fixos */}
      {filteredList.length === 0 ? (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-purple-400 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">
            {filter === 'ALL' ? 'Nenhum gasto fixo cadastrado' : 'Nenhum gasto fixo nesta categoria'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
            Cadastre aluguel, internet, assinaturas e parcelas para manter o controle dos seus compromissos.
          </p>
          {filter === 'ALL' && (
            <button
              onClick={onOpenNewModal}
              className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold px-4 py-2 rounded-xl border border-zinc-700 transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-purple-400" />
              <span>Adicionar o primeiro</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((item) => {
            const catColor = item.category_color || '#8B5CF6';
            const isProcessing = processingId === item.id;
            const isToggling = togglingId === item.id;
            const isDeleting = deletingId === item.id;

            return (
              <div
                key={item.id}
                className={`bg-zinc-900/70 border rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between ${
                  item.is_paid 
                    ? 'border-emerald-500/30 bg-emerald-950/10' 
                    : item.is_active 
                      ? 'border-zinc-800 hover:border-zinc-700' 
                      : 'border-zinc-800/40 opacity-60'
                }`}
              >
                <div>
                  {/* Badges de Topo: Vencimento e Status Pago */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      <Calendar className="w-3 h-3" />
                      Vence dia {item.due_day}
                    </span>

                    {item.is_paid ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-fadeIn">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Pago</span>
                        {item.paid_date && (
                          <span className="text-[10px] opacity-80">
                            ({item.paid_date.split('-').reverse().slice(0, 2).join('/')})
                          </span>
                        )}
                      </span>
                    ) : item.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        <span>Pendente</span>
                      </span>
                    ) : null}
                  </div>

                  {/* Descrição e Valor */}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-zinc-100 truncate">
                      {item.description}
                    </h3>
                    <span className={`text-lg font-bold font-mono flex-shrink-0 ${
                      item.is_paid ? 'text-emerald-400' : 'text-purple-300'
                    }`}>
                      {formatBRL(item.amount)}
                    </span>
                  </div>

                  {/* Categoria */}
                  <div className="mt-2">
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${catColor}15`,
                        color: catColor,
                        border: `1px solid ${catColor}30`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor }} />
                      {item.category_name || 'Fixos'}
                    </span>
                  </div>
                </div>

                {/* Ações: Botão Pagar / Desfazer e Controles */}
                <div className="mt-5 pt-3.5 border-t border-zinc-800/80 space-y-2.5">
                  
                  {/* Botão Principal de Pagamento */}
                  {item.is_active && (
                    item.is_paid ? (
                      <button
                        onClick={() => handleUnpay(item)}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-800/80 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-300 text-xs font-semibold border border-zinc-700/60 transition-all active:scale-98 disabled:opacity-50"
                        title="Desfazer pagamento e devolver o valor ao saldo em conta"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Desmarcar Pagamento (Estornar)</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePay(item)}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all active:scale-98 disabled:opacity-50"
                        title="Marcar como pago e debitar do saldo em conta agora"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Marcar como Pago (Debitar)</span>
                          </>
                        )}
                      </button>
                    )
                  )}

                  {/* Controles de Ativo / Pausado e Excluir */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleToggle(item.id)}
                      disabled={isToggling}
                      className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg border transition-colors ${
                        item.is_active
                          ? 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {item.is_active ? (
                        <>
                          <PauseCircle className="w-3 h-3" />
                          <span>Pausar</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          <span>Ativar</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={isDeleting}
                      className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Excluir despesa fixa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
