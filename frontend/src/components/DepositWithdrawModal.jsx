import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowDownRight, ArrowUpRight, Loader2, PiggyBank } from 'lucide-react';
import { savingsApi, formatBRL, parseBRLInput } from '../api';

export default function DepositWithdrawModal({ isOpen, onClose, targetItem, defaultMode = 'deposit', onSuccess }) {
  const dialogRef = useRef(null);
  const [mode, setMode] = useState(defaultMode); // 'deposit' ou 'withdraw'
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      setMode(defaultMode);
      setAmount('');
      setErrorMsg(null);
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen, defaultMode]);

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
    if (loading || !targetItem) return;

    const num = parseBRLInput(amount);
    if (isNaN(num) || num <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    if (mode === 'withdraw' && num > targetItem.current_amount) {
      setErrorMsg(`Valor de resgate excede o saldo guardado (${formatBRL(targetItem.current_amount)}).`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (mode === 'deposit') {
        await savingsApi.deposit(targetItem.id, num);
      } else {
        await savingsApi.withdraw(targetItem.id, num);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao processar operação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onPointerDown={handlePointerDown}
      aria-labelledby="dep-with-modal-title"
      className="bg-zinc-900 text-zinc-100 p-0 rounded-2xl border border-zinc-800 shadow-2xl w-full max-w-sm m-auto backdrop:bg-black/75"
    >
      <div className="p-6">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h2 id="dep-with-modal-title" className="text-sm font-bold text-zinc-100">
              {targetItem?.name}
            </h2>
            <p className="text-[11px] text-zinc-400">
              Guardado atualmente: <strong className="text-zinc-200">{formatBRL(targetItem?.current_amount || 0)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alternância: Guardar vs Resgatar */}
        <div className="grid grid-cols-2 gap-1 bg-zinc-800 p-1 rounded-xl mt-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('deposit')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors ${
              mode === 'deposit'
                ? 'bg-blue-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Guardar</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('withdraw')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors ${
              mode === 'withdraw'
                ? 'bg-amber-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Resgatar</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs sm:text-sm">
          <div>
            <label htmlFor="dep-amount" className="block text-zinc-400 font-medium mb-1.5">
              {mode === 'deposit' ? 'Valor a Guardar (R$)' : 'Valor a Resgatar (R$)'}
            </label>
            <input
              id="dep-amount"
              type="text"
              required
              autofocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-base"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              {mode === 'deposit'
                ? 'Este valor será retirado do seu Saldo Disponível em conta e protegido aqui.'
                : 'Este valor sairá desta economia e voltará para o seu Saldo Disponível em conta.'}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-white font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50 ${
                mode === 'deposit' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
              }`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'deposit' ? 'Confirmar Depósito' : 'Confirmar Resgate'}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

