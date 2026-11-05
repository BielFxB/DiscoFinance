import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Copy, 
  Check, 
  RefreshCw, 
  Unlink, 
  Sparkles, 
  Clock, 
  MessageSquare, 
  Terminal, 
  ShieldCheck 
} from 'lucide-react';
import { authApi } from '../api';

export default function DiscordSettings({ user, onUserUpdated }) {
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const isLinked = Boolean(user?.discord_id);

  // Contador regressivo do token
  useEffect(() => {
    if (!tokenData?.expires_at) return;
    const interval = setInterval(() => {
      const exp = new Date(tokenData.expires_at).getTime();
      const now = new Date().getTime();
      const remainingSeconds = Math.max(0, Math.floor((exp - now) / 1000));
      setTimeLeft(remainingSeconds);
      if (remainingSeconds <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [tokenData]);

  const handleGenerateToken = async () => {
    setLoading(true);
    try {
      const res = await authApi.getDiscordToken();
      setTokenData(res);
      setCopied(false);
    } catch (err) {
      alert(`Erro ao gerar código: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!tokenData?.token) return;
    navigator.clipboard.writeText(`/vincular ${tokenData.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleUnlink = async () => {
    if (!window.confirm('Tem certeza que deseja desvincular sua conta do Discord?')) return;
    try {
      await authApi.unlinkDiscord();
      if (onUserUpdated) onUserUpdated();
      setTokenData(null);
    } catch (err) {
      alert(`Erro ao desvincular: ${err.message}`);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Card Principal de Vinculação */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              isLinked ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
            }`}>
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-100">Integração com Bot do Discord</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  isLinked 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {isLinked ? '● Conectado' : '○ Não Vinculado'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Lance despesas e consulte relatórios diretamente pelo Discord via mensagens e comandos slash.
              </p>
            </div>
          </div>

          {isLinked && (
            <button
              onClick={handleUnlink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
            >
              <Unlink className="w-4 h-4" />
              <span>Desvincular Discord</span>
            </button>
          )}
        </div>

        {/* Área de Ação de Vinculação */}
        {!isLinked && (
          <div className="mt-8 pt-6 border-t border-zinc-800/80">
            {!tokenData ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-800/40 border border-zinc-700/50 p-5 rounded-2xl">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">Gere um código de vinculação</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    O código tem validade de 15 minutos e é usado apenas uma vez.
                  </p>
                </div>
                <button
                  onClick={handleGenerateToken}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Gerar Código de Vinculação</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 bg-zinc-800/40 border border-indigo-500/30 p-6 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Seu Código de Vinculação
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Expira em: <strong className="text-zinc-200 font-mono">{formatTimer(timeLeft)}</strong></span>
                  </div>
                </div>

                {/* Exibição do Código */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-full sm:w-auto flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-5 py-3 text-center sm:text-left">
                    <span className="text-2xl sm:text-3xl font-extrabold tracking-widest font-mono text-indigo-400">
                      {tokenData.token}
                    </span>
                  </div>

                  <button
                    onClick={handleCopyCode}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-6 py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Comando Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar `/vincular {tokenData.token}`</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Passo a Passo Visual */}
                <div className="mt-4 pt-4 border-t border-zinc-700/40 text-xs text-zinc-300 space-y-2">
                  <p className="font-semibold text-zinc-200">Como vincular em 3 passos:</p>
                  <ol className="list-decimal list-inside space-y-1 text-zinc-400">
                    <li>Abra seu Discord e localize o bot <strong>DiscFinanci</strong>.</li>
                    <li>Envie uma mensagem direta (DM) ou use em um canal o comando: <code className="bg-zinc-800 text-indigo-300 px-1.5 py-0.5 rounded font-mono">/vincular {tokenData.token}</code></li>
                    <li>O bot confirmará a vinculação com um embed e você já poderá lançar gastos por chat!</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Guia de Comandos e Exemplos do Bot */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2 mb-4">
          <Terminal className="w-4 h-4 text-indigo-400" />
          Comandos e Lançamentos Rápidos Disponíveis no Discord
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          {/* Lançamento via DM */}
          <div className="bg-zinc-800/40 border border-zinc-700/60 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold">
              <MessageSquare className="w-4 h-4" />
              <span>Lançamento em Linguagem Natural (DM)</span>
            </div>
            <p className="text-zinc-400">
              Envie qualquer mensagem direta para o bot e ele interpretará automaticamente:
            </p>
            <div className="bg-zinc-950 p-2.5 rounded-lg font-mono text-[11px] text-zinc-300 space-y-1">
              <p>• <span className="text-rose-400">Almoço 25.50 alimentação</span></p>
              <p>• <span className="text-rose-400">Uber 14 transporte</span></p>
              <p>• <span className="text-emerald-400">Salário 3000 entrada</span></p>
              <p>• <span className="text-rose-400">Pizza 49,90</span></p>
              <p>• <span className="text-emerald-400">+150 freelance</span></p>
            </div>
          </div>

          {/* Slash Commands */}
          <div className="bg-zinc-800/40 border border-zinc-700/60 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold">
              <Terminal className="w-4 h-4" />
              <span>Comandos Slash Interativos</span>
            </div>
            <p className="text-zinc-400">
              Disponíveis tanto em mensagens diretas quanto em servidores:
            </p>
            <div className="bg-zinc-950 p-2.5 rounded-lg font-mono text-[11px] text-zinc-300 space-y-1.5">
              <p><span className="text-indigo-400">/gasto</span> [descricao] [valor] [categoria]</p>
              <p><span className="text-indigo-400">/entrada</span> [descricao] [valor] [categoria]</p>
              <p><span className="text-indigo-400">/resumo</span> (Visão geral do mês)</p>
              <p><span className="text-indigo-400">/fixos</span> (Lista de contas recorrentes)</p>
              <p><span className="text-indigo-400">/vincular</span> [codigo] (Vincula conta)</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

