import React, { useState, useEffect, useRef } from 'react';
import { X, Landmark, Loader2, Info, Sparkles, CheckCircle2, Wallet, History } from 'lucide-react';
import { authApi, formatBRL, parseBRLInput } from '../api';

export default function InitialBalanceModal({ 
  isOpen, 
  onClose, 
  availableBalance = 0,
  initialBalance = 0,
  totalSaved = 0,
  onSuccess, 
  isWelcome = false,
  userName = '' 
}) {
  const dialogRef = useRef(null);
  const [balanceInput, setBalanceInput] = useState('');
  const [mode, setMode] = useState('available'); // 'available' ou 'initial'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      const initialVal = mode === 'available' ? availableBalance : initialBalance;
      setBalanceInput(initialVal !== undefined && initialVal !== null ? String(initialVal) : '0');
      setErrorMsg(null);
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen, mode, availableBalance, initialBalance]);

  const handlePointerDown = (e) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const r = dialog.getBoundingClientRect();
    const isOutside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (isOutside) {
      onClose();
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    const val = newMode === 'available' ? availableBalance : initialBalance;
    setBalanceInput(val !== undefined && val !== null ? String(val) : '0');
    setErrorMsg(null);
  };

  const handleSave = async (amount) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      await authApi.updateBalance(amount, mode);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = typeof err === 'string' ? err : (err?.message || 'Erro ao atualizar saldo da conta.');
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const num = parseBRLInput(balanceInput);
    if (isNaN(num)) {
      setErrorMsg('Informe um valor numérico válido (ex: 1500,00 ou 1500).');
      return;
    }

    await handleSave(num);
  };

  const handleSkipZero = async () => {
    await handleSave(0);
  };

  // Valor digitado em tempo real
  const currentTypedAmount = parseBRLInput(balanceInput);
  const effectiveAvailable = mode === 'available' ? currentTypedAmount : (currentTypedAmount - totalSaved);
  const effectiveTotalBank = mode === 'available' ? (currentTypedAmount + totalSaved) : currentTypedAmount;

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onPointerDown={handlePointerDown}
      aria-labelledby="balance-modal-title"
      className="bg-zinc-900 text-zinc-100 p-0 rounded-3xl border border-zinc-800 shadow-2xl w-full max-w-lg m-auto backdrop:bg-black/80 animate-fadeIn"
    >
      <div className="p-6 sm:p-7">
        
        {/* Cabeçalho */}
        <div className="flex items-start justify-between pb-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg ${
              isWelcome 
                ? 'bg-gradient-to-tr from-emerald-500 to-indigo-500 text-white shadow-emerald-500/20' 
                : 'bg-indigo-500/10 text-indigo-400'
            }`}>
              {isWelcome ? <Sparkles className="w-6 h-6 animate-pulse" /> : <Landmark className="w-5 h-5" />}
            </div>
            <div>
              <h2 id="balance-modal-title" className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                {isWelcome ? `🎉 Boas-vindas${userName ? `, ${userName}` : ''}!` : 'Ajustar Saldo em Conta'}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isWelcome 
                  ? 'Quanto você tem disponível na conta atualmente?' 
                  : 'Defina exatamente o valor que você deseja ver no seu saldo'}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seletor de Modo (Apenas quando não for a tela de boas-vindas inicial) */}
        {!isWelcome && (
          <div className="flex bg-zinc-800/80 p-1 rounded-2xl mt-4 border border-zinc-700/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleModeChange('available')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
                mode === 'available'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Saldo Disponível Atual (Hoje)</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('initial')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
                mode === 'initial'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Saldo Inicial de Abertura</span>
            </button>
          </div>
        )}

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs sm:text-sm">
          <div>
            <label htmlFor="balance-input" className="block text-zinc-300 font-medium mb-1.5">
              {mode === 'available'
                ? 'Qual é o seu Saldo Disponível hoje? (R$)'
                : 'Saldo Inicial Histórico (R$)'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-zinc-400 text-base font-semibold">
                R$
              </span>
              <input
                id="balance-input"
                type="text"
                required
                autoFocus
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                placeholder="Ex: 1500,00 ou 1.500"
                className="w-full pl-11 pr-4 py-3 bg-zinc-800/90 border border-zinc-700 rounded-2xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-lg font-medium"
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1.5">
              {mode === 'available'
                ? 'O DiscFinanci ajusta o saldo para que o seu card principal exiba EXATAMENTE este valor.'
                : 'Define o valor base de abertura antes de computar as transações.'}
            </p>
          </div>

          {/* Prévia em Tempo Real */}
          <div className="p-4 bg-zinc-800/50 border border-zinc-700/60 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Card "Saldo Disponível" exibirá:</span>
              <span className="text-emerald-400 font-bold font-mono text-sm">
                {formatBRL(effectiveAvailable)}
              </span>
            </div>
            
            {totalSaved > 0 && (
              <>
                <div className="flex items-center justify-between text-zinc-400 border-t border-zinc-700/40 pt-2">
                  <span>Economias Reservadas (blindadas):</span>
                  <span className="text-indigo-400 font-mono font-medium">{formatBRL(totalSaved)}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-300 border-t border-zinc-700/40 pt-2">
                  <span className="font-semibold">Total no Banco (Disponível + Economias):</span>
                  <span className="font-mono font-bold text-zinc-100">{formatBRL(effectiveTotalBank)}</span>
                </div>
              </>
            )}
          </div>

          {/* Destaque das Economias */}
          <div className="p-3 bg-zinc-800/20 border border-zinc-800 rounded-2xl text-xs text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Regra de Cálculo Automático</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Ao definir seu Saldo Disponível como <strong>{formatBRL(currentTypedAmount)}</strong>, você poderá gastar até esse limite sem tocar nas suas economias guardadas.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-zinc-800">
            {isWelcome ? (
              <>
                <button
                  type="button"
                  onClick={handleSkipZero}
                  disabled={loading}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 font-semibold transition-colors text-center"
                >
                  Começar do Zero (R$ 0,00)
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-semibold transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Salvar e Acessar Painel</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Saldo'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </dialog>
  );
}
