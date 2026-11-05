import React, { useState } from 'react';
import { 
  PiggyBank, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  Target 
} from 'lucide-react';
import { formatBRL, savingsApi } from '../api';

export default function SavingsList({
  savings,
  onRefresh,
  onOpenNewModal,
  onOpenEditModal,
  onOpenDepositWithdraw
}) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (item) => {
    const confirmMsg = item.current_amount > 0
      ? `A economia "${item.name}" possui ${formatBRL(item.current_amount)} guardados.\nAo excluir, este valor retornará ao cálculo geral.\nDeseja realmente excluir?`
      : `Deseja realmente excluir "${item.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    setDeletingId(item.id);
    try {
      await savingsApi.delete(item.id);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Erro ao excluir: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const totalSaved = savings.reduce((sum, s) => sum + s.current_amount, 0);
  const totalTarget = savings.reduce((sum, s) => sum + s.target_amount, 0);

  return (
    <div className="space-y-6">
      
      {/* Banner Principal de Economias & Gastos Futuros */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              Economias e Gastos Futuros
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Protegido do Saldo em Conta
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100">
            Total Guardado: <span className="text-blue-400 font-mono">{formatBRL(totalSaved)}</span>
          </h2>

          <p className="text-xs text-zinc-400 max-w-xl">
            Todo dinheiro alocado nesta área é <strong className="text-zinc-200">automaticamente descontado</strong> do seu <em>Saldo Disponível em Conta</em>. Assim, você garante que não gastará suas reservas por engano.
          </p>
        </div>

        <button
          onClick={onOpenNewModal}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-95 flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nova Economia / Meta</span>
        </button>
      </div>

      {/* Grid de Cofrinhos / Economias */}
      {savings.length === 0 ? (
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-blue-400 flex items-center justify-center mx-auto mb-3">
            <PiggyBank className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">Nenhuma economia cadastrada</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
            Crie cofrinhos como "Reserva de Emergência", "Viagem", "IPVA/IPTU" ou "Gastos Futuros" para separar seu dinheiro poupado.
          </p>
          <button
            onClick={onOpenNewModal}
            className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold px-4 py-2 rounded-xl border border-zinc-700 transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-blue-400" />
            <span>Criar primeira economia</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savings.map((item) => {
            const hasTarget = item.target_amount > 0;
            const progress = hasTarget ? Math.min(Math.round((item.current_amount / item.target_amount) * 100), 100) : 0;
            const itemColor = item.color || '#3B82F6';

            return (
              <div
                key={item.id}
                className="bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${itemColor}20`, color: itemColor }}
                      >
                        <PiggyBank className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-zinc-100 truncate">
                          {item.name}
                        </h3>
                        {hasTarget && (
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                            <Target className="w-3 h-3 text-zinc-500" />
                            Meta: {formatBRL(item.target_amount)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenEditModal(item)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Valor Guardado */}
                  <div className="mt-4">
                    <span className="text-xs text-zinc-400 font-medium">Saldo Reservado:</span>
                    <p className="text-2xl font-extrabold font-mono text-zinc-100 mt-0.5">
                      {formatBRL(item.current_amount)}
                    </p>
                  </div>

                  {/* Barra de Progresso se houver meta */}
                  {hasTarget && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Progresso da meta</span>
                        <span className="font-mono font-semibold text-zinc-200">{progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: itemColor,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Ações Rápidas: Guardar e Resgatar */}
                <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-zinc-800/80">
                  <button
                    onClick={() => onOpenDepositWithdraw(item, 'deposit')}
                    className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 transition-all active:scale-95"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+ Guardar</span>
                  </button>

                  <button
                    onClick={() => onOpenDepositWithdraw(item, 'withdraw')}
                    disabled={item.current_amount <= 0}
                    className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 border border-zinc-700 transition-all active:scale-95"
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>- Resgatar</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

