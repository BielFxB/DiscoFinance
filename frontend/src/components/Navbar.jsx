import React from 'react';
import { 
  Wallet, 
  PlusCircle, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Bot, 
  LayoutDashboard, 
  CalendarClock, 
  ReceiptText, 
  PiggyBank, 
  Settings 
} from 'lucide-react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function Navbar({
  user,
  currentMonth,
  currentYear,
  onMonthChange,
  activeTab,
  onTabChange,
  onOpenNewTransaction,
  onLogout
}) {
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      onMonthChange(12, currentYear - 1);
    } else {
      onMonthChange(currentMonth - 1, currentYear);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      onMonthChange(1, currentYear + 1);
    } else {
      onMonthChange(currentMonth + 1, currentYear);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Marca */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                DiscFinanci
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono border border-indigo-500/20">
                  v1.0
                </span>
              </span>
              <p className="text-xs text-zinc-400 hidden sm:block">Finanças Pessoais + Discord Bot</p>
            </div>
          </div>

          {/* Seletor de Mês e Ano */}
          <div className="flex items-center gap-1 bg-zinc-800/80 p-1 rounded-xl border border-zinc-700/60 shadow-inner">
            <button
              onClick={handlePrevMonth}
              aria-label="Mês anterior"
              className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs sm:text-sm font-semibold text-zinc-100 px-2 min-w-[120px] text-center">
              {MONTHS[currentMonth - 1]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              aria-label="Próximo mês"
              className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Ações e Usuário */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenNewTransaction}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Lançamento</span>
              <span className="sm:hidden">Novo</span>
            </button>

            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                <button
                  onClick={() => onTabChange('discord')}
                  title={user.is_discord_linked ? "Discord Conectado" : "Conectar Discord"}
                  className={`p-2 rounded-xl transition-colors border ${
                    user.is_discord_linked
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-amber-400'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                </button>

                <button
                  onClick={onLogout}
                  title="Sair da conta"
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Barra de Navegação por Abas */}
        <nav className="flex space-x-1 sm:space-x-4 border-t border-zinc-800/80 pt-2 pb-2 overflow-x-auto text-xs sm:text-sm font-medium">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-indigo-400" />
            Dashboard
          </button>

          <button
            onClick={() => onTabChange('recurring')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'recurring'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <CalendarClock className="w-4 h-4 text-purple-400" />
            Gastos Fixos
          </button>

          <button
            onClick={() => onTabChange('savings')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'savings'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <PiggyBank className="w-4 h-4 text-blue-400" />
            Economias & Metas
          </button>

          <button
            onClick={() => onTabChange('transactions')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <ReceiptText className="w-4 h-4 text-emerald-400" />
            Extrato Completo
          </button>

          <button
            onClick={() => onTabChange('discord')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'discord'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <Settings className="w-4 h-4 text-amber-400" />
            Discord & Configurações
          </button>
        </nav>
      </div>
    </header>
  );
}

