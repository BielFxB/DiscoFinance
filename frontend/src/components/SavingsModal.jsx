import React, { useState, useEffect, useRef } from 'react';
import { X, PiggyBank, Loader2 } from 'lucide-react';
import { savingsApi, parseBRLInput } from '../api';

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#14B8A6', '#6366F1', '#84CC16'
];

export default function SavingsModal({ isOpen, onClose, editingItem, onSuccess }) {
  const dialogRef = useRef(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (editingItem) {
        setName(editingItem.name || '');
        setTargetAmount(editingItem.target_amount ? String(editingItem.target_amount) : '');
        setCurrentAmount(editingItem.current_amount ? String(editingItem.current_amount) : '0');
        setColor(editingItem.color || '#3B82F6');
      } else {
        setName('');
        setTargetAmount('');
        setCurrentAmount('0');
        setColor('#3B82F6');
      }
      setErrorMsg(null);
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen, editingItem]);

  const handlePointerDown = (e) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const r = dialog.getBoundingClientRect();
    const isOutside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (isOutside) {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!name.trim()) {
      setErrorMsg('Informe um nome para a economia (ex: Reserva de Emergência, Viagem).');
      return;
    }

    const targetVal = targetAmount ? parseBRLInput(targetAmount) : 0.0;
    const currentVal = currentAmount ? parseBRLInput(currentAmount) : 0.0;

    setLoading(true);
    setErrorMsg(null);

    try {
      if (editingItem) {
        await savingsApi.update(editingItem.id, {
          name: name.trim(),
          target_amount: targetVal,
          color,
        });
      } else {
        await savingsApi.create({
          name: name.trim(),
          target_amount: targetVal,
          current_amount: currentVal,
          color,
          icon: 'PiggyBank',
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao salvar economia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onPointerDown={handlePointerDown}
      aria-labelledby="savings-modal-title"
      className="bg-zinc-900 text-zinc-100 p-0 rounded-2xl border border-zinc-800 shadow-2xl w-full max-w-md m-auto backdrop:bg-black/75"
    >
      <div className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
            <h2 id="savings-modal-title" className="text-base font-bold text-zinc-100">
              {editingItem ? 'Editar Economia / Meta' : 'Nova Economia para Gastos Futuros'}
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
          <div>
            <label htmlFor="sav-name" className="block text-zinc-400 font-medium mb-1.5">
              Nome da Economia / Destino
            </label>
            <input
              id="sav-name"
              type="text"
              required
              autofocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Reserva de Emergência, Viagem, IPVA/IPTU..."
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sav-target" className="block text-zinc-400 font-medium mb-1.5">
                Meta Desejada (R$)
              </label>
              <input
                id="sav-target"
                type="text"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="Ex: 5000,00"
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <span className="text-[10px] text-zinc-500">Opcional</span>
            </div>

            {!editingItem && (
              <div>
                <label htmlFor="sav-current" className="block text-zinc-400 font-medium mb-1.5">
                  Já Guardado (R$)
                </label>
                <input
                  id="sav-current"
                  type="text"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  placeholder="Ex: 500,00"
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <span className="text-[10px] text-zinc-500">Deduz do saldo livre</span>
              </div>
            )}
          </div>

          {/* Seletor de Cores */}
          <div>
            <label className="block text-zinc-400 font-medium mb-1.5">
              Cor de Destaque
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-125 border-white shadow-md' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
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
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-md shadow-blue-600/20 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Economia'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

