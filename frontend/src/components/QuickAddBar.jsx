import React, { useState } from 'react';
import { Send, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { transactionsApi, formatBRL } from '../api';

export default function QuickAddBar({ onTransactionAdded }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await transactionsApi.quickParse(text.trim(), true);
      const isIncome = res.type === 'INCOME';
      setSuccessMsg(
        `${isIncome ? '📈 Receita' : '📉 Despesa'} registrada: ${res.description} (${formatBRL(res.amount)})`
      );
      setText('');
      if (onTransactionAdded) {
        onTransactionAdded();
      }
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Não foi possível interpretar o texto.');
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 shadow-sm">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="💬 Lançamento Rápido: Ex: Almoço 25.50 alimentação ou Salário 3000 entrada"
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Lançar</span>
            </>
          )}
        </button>
      </form>

      {/* Mensagens de Feedback */}
      {successMsg && (
        <div className="mt-2.5 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg animate-fadeIn">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mt-2.5 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
          {errorMsg}
        </div>
      )}
    </div>
  );
}

