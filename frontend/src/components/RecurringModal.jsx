import React, { useState, useEffect, useRef } from 'react';
import { X, CalendarClock, Loader2 } from 'lucide-react';
import { recurringApi, parseBRLInput } from '../api';

export default function RecurringModal({ isOpen, onClose, categories, onSuccess }) {
  const dialogRef = useRef(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('10');
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

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
    setDueDay('10');
    setCategoryId('');
    setIsActive(true);
    setErrorMsg(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const numAmount = parseBRLInput(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    const day = parseInt(dueDay, 10);
    if (isNaN(day) || day < 1 || day > 31) {
      setErrorMsg('O dia de vencimento deve estar entre 1 e 31.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await recurringApi.create({
        description: description.trim(),
        amount: numAmount,
        due_day: day,
        category_id: categoryId || null,
        is_active: isActive,
      });
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao salvar gasto fixo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onPointerDown={handlePointerDown}
      aria-labelledby="recurring-modal-title"
      className="bg-zinc-900 text-zinc-100 p-0 rounded-2xl border border-zinc-800 shadow-2xl w-full max-w-md m-auto backdrop:bg-black/75"
    >
      <div className="p-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-purple-400" />
            <h2 id="recurring-modal-title" className="text-base font-bold text-zinc-100">
              Novo Gasto Fixo Recorrente
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

        {errorMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs sm:text-sm">
          {/* Descrição */}
          <div>
            <label htmlFor="rec-desc" className="block text-zinc-400 font-medium mb-1.5">
              Descrição da Conta
            </label>
            <input
              id="rec-desc"
              type="text"
              required
              autofocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Aluguel, Internet, Netflix, Academia..."
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Valor e Dia de Vencimento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="rec-amount" className="block text-zinc-400 font-medium mb-1.5">
                Valor Mensal (R$)
              </label>
              <input
                id="rec-amount"
                type="text"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="120,00"
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
              />
            </div>

            <div>
              <label htmlFor="rec-due" className="block text-zinc-400 font-medium mb-1.5">
                Dia do Vencimento
              </label>
              <input
                id="rec-due"
                type="number"
                min="1"
                max="31"
                required
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label htmlFor="rec-cat" className="block text-zinc-400 font-medium mb-1.5">
              Categoria
            </label>
            <select
              id="rec-cat"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Selecione uma categoria (opcional)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Checkbox Ativo */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="rec-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="rec-active" className="text-xs text-zinc-300 font-medium cursor-pointer">
              Ativo na projeção mensal deste mês
            </label>
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
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all shadow-md shadow-purple-600/20 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Gasto Fixo'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

