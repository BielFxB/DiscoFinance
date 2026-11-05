import React, { useState } from 'react';
import { 
  Trash2, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Receipt, 
  Tag 
} from 'lucide-react';
import { formatBRL, transactionsApi } from '../api';

export default function TransactionsList({
  transactions,
  categories,
  onRefresh,
  isFullView = false,
  selectedCategory,
  onCategoryFilterChange,
  selectedType,
  onTypeFilterChange,
  searchQuery,
  onSearchChange
}) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir esta transação?')) return;
    setDeletingId(id);
    try {
      await transactionsApi.delete(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Erro ao excluir transação: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Filtragem local se estiver na visualização completa
  const filtered = transactions.filter((tx) => {
    if (selectedType && selectedType !== 'ALL' && tx.type !== selectedType) {
      return false;
    }
    if (selectedCategory && selectedCategory !== 'ALL' && tx.category_id !== selectedCategory) {
      return false;
    }
    if (searchQuery && !tx.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">
            {isFullView ? 'Extrato Completo de Transações' : 'Transações Recentes'}
          </h3>
          <p className="text-xs text-zinc-400">
            {filtered.length} {filtered.length === 1 ? 'registro encontrado' : 'registros encontrados'}
          </p>
        </div>

        {/* Filtros para visão completa */}
        {isFullView && (
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Busca por texto */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar descrição..."
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Filtro por Categoria */}
            <select
              value={selectedCategory || 'ALL'}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Filtro por Tipo */}
            <div className="flex rounded-xl bg-zinc-800 p-0.5 border border-zinc-700 text-xs">
              <button
                onClick={() => onTypeFilterChange('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  !selectedType || selectedType === 'ALL'
                    ? 'bg-zinc-700 text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => onTypeFilterChange('EXPENSE')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  selectedType === 'EXPENSE'
                    ? 'bg-rose-500/20 text-rose-300 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Despesas
              </button>
              <button
                onClick={() => onTypeFilterChange('INCOME')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  selectedType === 'INCOME'
                    ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Receitas
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-500 flex items-center justify-center mb-2">
            <Receipt className="w-5 h-5" />
          </div>
          <p className="text-xs text-zinc-400">Nenhuma transação encontrada para este período.</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/80">
          {filtered.map((tx) => {
            const isIncome = tx.type === 'INCOME';
            const catColor = tx.category_color || '#64748B';

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 px-1 hover:bg-zinc-800/30 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Ícone Indicador */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>

                  {/* Descrição e Categoria */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <p className="text-sm font-semibold text-zinc-100 truncate">
                        {tx.description}
                      </p>
                      {tx.is_recurring && (
                        <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          📌 Fixo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${catColor}15`,
                          color: catColor,
                          border: `1px solid ${catColor}30`,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor }} />
                        {tx.category_name || 'Geral'}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {new Date(tx.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Valor e Ação de Exclusão */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className={`text-sm font-bold font-mono ${
                      isIncome ? 'text-emerald-400' : 'text-zinc-200'
                    }`}
                  >
                    {isIncome ? '+' : '-'} {formatBRL(tx.amount)}
                  </span>

                  <button
                    onClick={() => handleDelete(tx.id)}
                    disabled={deletingId === tx.id}
                    title="Excluir lançamento"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-70 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
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

