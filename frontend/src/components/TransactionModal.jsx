import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, PlusCircle, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { transactionsApi, parseBRLInput } from '../api';

export default function TransactionModal({ isOpen, onClose, categories, onSuccess }) {
  const dialogRef = useRef(null);
  const [tab, setTab] = useState('manual'); // 'manual' ou 'quick'
  const [type, setType] = useState('EXPENSE');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quickText, setQuickText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Controle de abertura e fechamento com o elemento nativo <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Fallback de clique fora para fechar (Light Dismiss)
  const handlePointerDown = (e) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const r = dialog.getBoundingClientRect();
    const isOutside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (isOutside) {
      onClose();
    }
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategoryId('');
    setDate(new Date().toISOString().split('T')[0]);
    setQuickText('');
    setErrorMsg(null);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const numAmount = parseBRLInput(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Informe um valor numérico válido maior que zero.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await transactionsApi.create({
        description: description.trim(),
        amount: numAmount,
        type,
        category_id: categoryId || null,
        date,
      });
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao registrar lançamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    if (loading || !quickText.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      await transactionsApi.quickParse(quickText.trim(), true);
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao interpretar texto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onPointerDown={handlePointerDown}
      aria-labelledby="tx-modal-title"
      className="bg-zinc-900 text-zinc-100 p-0 rounded-2xl border border-zinc-800 shadow-2xl w-full max-w-lg m-auto backdrop:bg-black/75"
    >
      <div className="p-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <h2 id="tx-modal-title" className="text-base font-bold text-zinc-100">
              Novo Lançamento Financeiro
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas: Manual vs Texto Rápido */}
        <div className="flex rounded-xl bg-zinc-800 p-1 mt-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              tab === 'manual' ? 'bg-zinc-700 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Formulário Completo
          </button>
          <button
            type="button"
            onClick={() => setTab('quick')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-colors ${
              tab === 'quick' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Lançamento Rápido</span>
          </button>
        </div>

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Conteúdo Aba Manual */}
        {tab === 'manual' ? (
          <form onSubmit={handleManualSubmit} className="mt-4 space-y-4 text-xs sm:text-sm">
            {/* Seletor Tipo: Despesa vs Receita */}
            <div>
              <label className="block text-zinc-400 font-medium mb-1.5">Tipo de Lançamento</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('EXPENSE')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-xl border font-semibold transition-all ${
                    type === 'EXPENSE'
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-sm'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Despesa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('INCOME')}
                  className={`flex items-center justify-center gap-2 py-2 rounded-xl border font-semibold transition-all ${
                    type === 'INCOME'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-sm'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Receita</span>
                </button>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="tx-desc" className="block text-zinc-400 font-medium mb-1.5">
                Descrição
              </label>
              <input
                id="tx-desc"
                type="text"
                required
                autofocus
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Almoço no shopping, Mercado, Uber..."
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Valor e Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="tx-amount" className="block text-zinc-400 font-medium mb-1.5">
                  Valor (R$)
                </label>
                <input
                  id="tx-amount"
                  type="text"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="25,50 ou 150.00"
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label htmlFor="tx-date" className="block text-zinc-400 font-medium mb-1.5">
                  Data
                </label>
                <input
                  id="tx-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label htmlFor="tx-cat" className="block text-zinc-400 font-medium mb-1.5">
                Categoria
              </label>
              <select
                id="tx-cat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Selecione uma categoria (opcional)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Botões de Ação */}
            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Lançamento'}
              </button>
            </div>
          </form>
        ) : (
          /* Conteúdo Aba Lançamento Rápido */
          <form onSubmit={handleQuickSubmit} className="mt-4 space-y-4 text-xs sm:text-sm">
            <div>
              <label htmlFor="tx-quick" className="block text-zinc-400 font-medium mb-1.5">
                Digite livremente a mensagem financeira
              </label>
              <textarea
                id="tx-quick"
                rows={3}
                required
                autofocus
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder="Exemplos:&#10;• Almoço 25.50 alimentação&#10;• Uber 14 transporte&#10;• Salário 3500 entrada&#10;• +150 freelance"
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                O mesmo sistema de inteligência natural usado no Bot do Discord interpretará valor, categoria e data automaticamente.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !quickText.trim()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Interpretar e Salvar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </dialog>
  );
}

