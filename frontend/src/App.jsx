import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import Navbar from './components/Navbar';
import MetricCards from './components/MetricCards';
import BudgetProgress from './components/BudgetProgress';
import DonutChart from './components/DonutChart';
import QuickAddBar from './components/QuickAddBar';
import TransactionsList from './components/TransactionsList';
import RecurringList from './components/RecurringList';
import SavingsList from './components/SavingsList';
import DiscordSettings from './components/DiscordSettings';
import TransactionModal from './components/TransactionModal';
import RecurringModal from './components/RecurringModal';
import InitialBalanceModal from './components/InitialBalanceModal';
import SavingsModal from './components/SavingsModal';
import DepositWithdrawModal from './components/DepositWithdrawModal';
import AuthModal from './components/AuthModal';
import { 
  getCurrentUser, 
  authApi, 
  analyticsApi, 
  transactionsApi, 
  recurringApi, 
  savingsApi,
  categoriesApi,
  API_BASE_URL 
} from './api';

export default function App() {
  const [user, setUser] = useState(() => getCurrentUser());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [activeTab, setActiveTab] = useState('dashboard');

  // Dados financeiros
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [savings, setSavings] = useState([]);
  const [categories, setCategories] = useState([]);

  // Estados de Filtro para Extrato
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modais
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [editingSavingsItem, setEditingSavingsItem] = useState(null);
  const [depositWithdrawItem, setDepositWithdrawItem] = useState(null);
  const [depositWithdrawMode, setDepositWithdrawMode] = useState('deposit');
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Escuta eventos globais de conexão com backend
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('backend_offline', handleOffline);
    window.addEventListener('backend_online', handleOnline);

    return () => {
      window.removeEventListener('backend_offline', handleOffline);
      window.removeEventListener('backend_online', handleOnline);
    };
  }, []);

  // Carregar todos os dados do mês
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [sumRes, txRes, recRes, savRes, catRes] = await Promise.all([
        analyticsApi.getSummary(currentMonth, currentYear),
        transactionsApi.list({ month: currentMonth, year: currentYear, limit: 150 }),
        recurringApi.list(currentMonth, currentYear),
        savingsApi.list(),
        categoriesApi.list(),
      ]);

      setSummary(sumRes);
      setTransactions(txRes || []);
      setRecurring(recRes || []);
      setSavings(savRes || []);
      setCategories(catRes || []);
      setIsOffline(false);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth, currentYear]);

  // Ping periódico em background quando offline para auto-reconectar
  useEffect(() => {
    if (!isOffline) return;
    const interval = setInterval(async () => {
      try {
        await fetch(`${API_BASE_URL}/docs`, { method: 'GET', mode: 'no-cors' });
        setIsOffline(false);
        if (user) {
          loadData();
        }
      } catch {
        // Continua offline
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [isOffline, user, loadData]);

  const handleManualReconnect = async () => {
    setIsReconnecting(true);
    try {
      await fetch(`${API_BASE_URL}/docs`, { method: 'GET', mode: 'no-cors' });
      setIsOffline(false);
      if (user) {
        await loadData();
      }
    } catch {
      setIsOffline(true);
    } finally {
      setIsReconnecting(false);
    }
  };

  // Atualizar dados quando muda mês, ano ou login
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, currentMonth, currentYear, loadData]);

  // Listener para logout por token expirado
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
  }, []);

  const handleMonthChange = (month, year) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  const handleLogout = () => {
    authApi.logout();
    setUser(null);
  };

  const handleUserUpdated = async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      // Ignora erro
    }
  };

  const handleOpenEditSavings = (item) => {
    setEditingSavingsItem(item);
    setIsSavingsModalOpen(true);
  };

  const handleOpenDepositWithdraw = (item, mode = 'deposit') => {
    setDepositWithdrawItem(item);
    setDepositWithdrawMode(mode);
  };

  // Se não estiver autenticado, exibe o modal de Login/Registro
  if (!user) {
    return (
      <AuthModal 
        onSuccess={(newUser, isNewRegistration) => {
          setUser(newUser);
          if (isNewRegistration) {
            setIsWelcomeModalOpen(true);
          }
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      
      {/* Banner de Aviso de Offline */}
      {isOffline && (
        <div className="bg-rose-950/90 border-b border-rose-500/50 text-rose-200 px-4 py-2.5 text-xs sm:text-sm flex items-center justify-between sticky top-0 z-50 backdrop-blur-md shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <span>
              <strong className="text-white">Servidor Backend Desconectado (Porta 8001)</strong> — 
              O backend não está respondendo. Execute o arquivo <strong>start.bat</strong> na pasta do projeto.
            </span>
          </div>
          <button
            onClick={handleManualReconnect}
            disabled={isReconnecting}
            className="ml-4 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium transition flex items-center gap-1.5 shrink-0 shadow text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
            {isReconnecting ? 'Tentando...' : 'Reconectar'}
          </button>
        </div>
      )}

      {/* Barra de Navegação */}
      <Navbar
        user={user}
        currentMonth={currentMonth}
        currentYear={currentYear}
        onMonthChange={handleMonthChange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewTransaction={() => setIsTxModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* ABA DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* 1. Cards de Métricas Principais (Saldo em Conta, Economias, Entradas, Saídas) */}
            <MetricCards 
              summary={summary} 
              onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
              onGoToSavings={() => setActiveTab('savings')}
            />

            {/* 2. Barra de Progresso do Orçamento */}
            <BudgetProgress summary={summary} />

            {/* 3. Barra de Lançamento Rápido em Linguagem Natural */}
            <QuickAddBar onTransactionAdded={loadData} />

            {/* 4. Gráfico Donut de Categorias + Histórico Recente */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6">
                <DonutChart
                  categoryBreakdown={summary?.category_breakdown || []}
                  totalExpenses={summary?.total_expenses || 0}
                />
              </div>

              <div className="lg:col-span-6">
                <TransactionsList
                  transactions={summary?.recent_transactions || []}
                  categories={categories}
                  onRefresh={loadData}
                  isFullView={false}
                />
              </div>
            </div>

          </div>
        )}

        {/* ABA GASTOS FIXOS */}
        {activeTab === 'recurring' && (
          <div className="animate-fadeIn">
            <RecurringList
              recurring={recurring}
              currentMonth={currentMonth}
              currentYear={currentYear}
              onRefresh={loadData}
              onOpenNewModal={() => setIsRecurringModalOpen(true)}
            />
          </div>
        )}

        {/* ABA ECONOMIAS E GASTOS FUTUROS */}
        {activeTab === 'savings' && (
          <div className="animate-fadeIn">
            <SavingsList
              savings={savings}
              onRefresh={loadData}
              onOpenNewModal={() => {
                setEditingSavingsItem(null);
                setIsSavingsModalOpen(true);
              }}
              onOpenEditModal={handleOpenEditSavings}
              onOpenDepositWithdraw={handleOpenDepositWithdraw}
            />
          </div>
        )}

        {/* ABA EXTRATO COMPLETO */}
        {activeTab === 'transactions' && (
          <div className="animate-fadeIn">
            <TransactionsList
              transactions={transactions}
              categories={categories}
              onRefresh={loadData}
              isFullView={true}
              selectedCategory={selectedCategory}
              onCategoryFilterChange={setSelectedCategory}
              selectedType={selectedType}
              onTypeFilterChange={setSelectedType}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        )}

        {/* ABA DISCORD & CONFIGURAÇÕES */}
        {activeTab === 'discord' && (
          <div className="animate-fadeIn">
            <DiscordSettings user={user} onUserUpdated={handleUserUpdated} />
          </div>
        )}

      </main>

      {/* Modais do Sistema */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        categories={categories}
        onSuccess={loadData}
      />

      <RecurringModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        categories={categories}
        onSuccess={loadData}
      />

      <InitialBalanceModal
        isOpen={isBalanceModalOpen || isWelcomeModalOpen}
        isWelcome={isWelcomeModalOpen}
        userName={user?.name?.split(' ')[0] || ''}
        onClose={() => {
          setIsBalanceModalOpen(false);
          setIsWelcomeModalOpen(false);
        }}
        availableBalance={summary?.available_balance ?? 0}
        initialBalance={summary?.initial_balance ?? user?.initial_balance ?? 0}
        totalSaved={summary?.total_saved ?? 0}
        onSuccess={() => {
          setIsWelcomeModalOpen(false);
          loadData();
        }}
      />

      <SavingsModal
        isOpen={isSavingsModalOpen}
        onClose={() => {
          setIsSavingsModalOpen(false);
          setEditingSavingsItem(null);
        }}
        editingItem={editingSavingsItem}
        onSuccess={loadData}
      />

      <DepositWithdrawModal
        isOpen={Boolean(depositWithdrawItem)}
        onClose={() => setDepositWithdrawItem(null)}
        targetItem={depositWithdrawItem}
        defaultMode={depositWithdrawMode}
        onSuccess={loadData}
      />

      {/* Rodapé Moderno */}
      <footer className="border-t border-zinc-800/80 py-4 text-center text-xs text-zinc-500">
        <p>DiscFinanci — Gestão Financeira com Economias Futuras e Bot Discord • FastAPI + React + Supabase</p>
      </footer>
    </div>
  );
}
