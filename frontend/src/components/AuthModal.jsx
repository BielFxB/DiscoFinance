import React, { useState, useEffect } from 'react';
import { Wallet, Lock, Mail, User, Loader2, ArrowRight, Landmark, AlertTriangle, RefreshCw } from 'lucide-react';
import { authApi, parseBRLInput, API_BASE_URL } from '../api';

export default function AuthModal({ onSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setErrorMsg(null);
    };

    window.addEventListener('backend_offline', handleOffline);
    window.addEventListener('backend_online', handleOnline);

    return () => {
      window.removeEventListener('backend_offline', handleOffline);
      window.removeEventListener('backend_online', handleOnline);
    };
  }, []);

  const checkConnection = async () => {
    setCheckingConnection(true);
    try {
      const res = await fetch(`${API_BASE_URL}/docs`, { method: 'GET', mode: 'no-cors' });
      setIsOffline(false);
      setErrorMsg(null);
    } catch {
      setIsOffline(true);
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setErrorMsg('Por favor, informe seu nome.');
          setLoading(false);
          return;
        }
        const numBalance = parseBRLInput(initialBalance);
        const data = await authApi.register(
          name.trim(), 
          email.trim(), 
          password, 
          numBalance
        );
        onSuccess(data.user, true);
      } else {
        const data = await authApi.login(email.trim(), password);
        onSuccess(data.user, false);
      }
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
        setIsOffline(true);
        setErrorMsg('Não foi possível conectar ao servidor backend (porta 8002). Verifique se o start.bat está aberto.');
      } else {
        setErrorMsg(err.message || 'Erro durante a autenticação.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-fadeIn">
        
        {/* Banner de Aviso de Offline */}
        {isOffline && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-semibold">Servidor Backend Desconectado</strong>
                O serviço FastAPI na porta 8002 não está rodando. Execute o arquivo <strong>start.bat</strong> na pasta do projeto.
              </div>
            </div>
            <button
              type="button"
              onClick={checkConnection}
              disabled={checkingConnection}
              className="self-end px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium transition text-xs flex items-center gap-1.5 shadow"
            >
              <RefreshCw className={`w-3 h-3 ${checkingConnection ? 'animate-spin' : ''}`} />
              {checkingConnection ? 'Verificando...' : 'Testar Conexão'}
            </button>
          </div>
        )}

        {/* Header do Modal */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/20">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100">
            {isRegister ? 'Criar Nova Conta' : 'Acessar DiscFinanci'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isRegister 
              ? 'Comece a organizar suas finanças com suporte a Discord Bot' 
              : 'Entre com seu e-mail e senha para gerenciar seu painel'}
          </p>
        </div>

        {/* Mensagem de Erro */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {isRegister && (
            <div>
              <label className="block text-zinc-400 font-medium mb-1.5">Seu Nome</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-zinc-400 font-medium mb-1.5">Endereço de E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 font-medium mb-1.5">Senha de Acesso</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-zinc-400 font-medium">Saldo Atual em Conta (R$)</label>
                <span className="text-[11px] text-zinc-500">Opcional</span>
              </div>
              <div className="relative">
                <Landmark className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400" />
                <input
                  type="text"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="0,00 (quanto você tem hoje no banco)"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Informe o valor que você já possui hoje no seu banco para começar com o saldo real.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-98 mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Criar Minha Conta' : 'Entrar no Sistema'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Alternância Login / Registro */}
        <div className="mt-6 pt-5 border-t border-zinc-800 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg(null);
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
          >
            {isRegister
              ? 'Já tem uma conta? Clique aqui para entrar'
              : 'Novo por aqui? Crie uma conta em segundos'}
          </button>
        </div>

      </div>
    </div>
  );
}

