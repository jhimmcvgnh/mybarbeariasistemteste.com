import React, { useState, useEffect } from 'react';
import { Header, Account } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { StatCard } from './components/StatCard';
import { ActivityTable } from './components/ActivityTable';
import { DateFilterBar } from './components/DateFilterBar';
import { type Appointment } from './lib/supabase';

// Importações pesadas foram movidas para Lazy Loading abaixo
import { IncomeChart } from './components/IncomeChart';
import { LoginScreen } from './components/LoginScreen';

// Lazy loading das telas pesadas
const LazyChatScreen = React.lazy(() => import('./components/ChatScreen').then(module => ({ default: module.ChatScreen })));
const LazyFinanceScreen = React.lazy(() => import('./components/FinanceScreen').then(module => ({ default: module.FinanceScreen })));
const LazyAppointmentsScreen = React.lazy(() => import('./components/AppointmentsScreen').then(module => ({ default: module.AppointmentsScreen })));
const LazyNotesScreen = React.lazy(() => import('./components/NotesScreen').then(module => ({ default: module.NotesScreen })));
const LazyInventoryScreen = React.lazy(() => import('./components/InventoryScreen').then(module => ({ default: module.InventoryScreen })));
const LazyEmployeesScreen = React.lazy(() => import('./components/EmployeesScreen').then(module => ({ default: module.EmployeesScreen })));
const LazySettingsScreen = React.lazy(() => import('./components/SettingsScreen').then(module => ({ default: module.SettingsScreen })));
const LazyClientsScreen = React.lazy(() => import('./components/ClientsScreen').then(module => ({ default: module.ClientsScreen })));
const LazyForecastScreen = React.lazy(() => import('./components/ForecastScreen').then(module => ({ default: module.ForecastScreen })));
const LazyReportsModal = React.lazy(() => import('./components/ReportsModal').then(module => ({ default: module.ReportsModal })));
const LazyAddAccountModal = React.lazy(() => import('./components/AddAccountModal').then(module => ({ default: module.AddAccountModal })));
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AnimatedBackground } from './components/AnimatedBackground';
import { PromoModal } from './components/PromoModal';

import { useAuth } from './hooks/useAuth';
import { useStats, type DateFilterState } from './hooks/useStats';
import { useAppointments } from './hooks/useAppointments';

const KNOWN_ACCOUNTS_KEY = 'barduka_known_accounts';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeScreen, setActiveScreen] = useState('dashboard');

  // Auth via Supabase
  const { user, isAuthenticated, loading: authLoading, logout, register, updateAvatar } = useAuth();
  
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Estado de Filtro Temporal Global
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    period: 'month',
    referenceDate: new Date(),
  });

  // Lista de contas conhecidas salvas
  const [savedAccounts, setSavedAccounts] = useState<Account[]>([]);

  // Pop-up de Anúncio e Botão CTA da Navbar
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [showNavbarCta, setShowNavbarCta] = useState(() => {
    return localStorage.getItem('barber_show_navbar_cta') === 'true';
  });

  useEffect(() => {
    // Anúncio pop-up aparece a cada 1:30 minutos (90.000 ms)
    // Não aparece imediatamente ao entrar, aguarda 1 minuto e 30 segundos
    const PROMO_INTERVAL_MS = (1 * 60 + 30) * 1000; // 90 segundos
    const timer = setInterval(() => {
      setIsPromoOpen(true);
    }, PROMO_INTERVAL_MS);

    // Helpers globais no console para testes rápidos se necessário
    (window as any).openPromoModal = () => setIsPromoOpen(true);
    (window as any).resetPromoModal = () => {
      localStorage.removeItem('barber_show_navbar_cta');
      setShowNavbarCta(false);
      setIsPromoOpen(false);
    };

    return () => clearInterval(timer);
  }, []);

  const handleClosePromo = () => {
    setIsPromoOpen(false);
    setShowNavbarCta(true);
    localStorage.setItem('barber_show_navbar_cta', 'true');
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const currentUser: Account = {
    id: user?.id || '1',
    name: user?.profile?.name || user?.profile?.nome || user?.email?.split('@')[0] || 'Usuário',
    email: user?.email || '',
    avatar: user?.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.profile?.name || user?.email || 'U')}&background=FF622B&color=fff`
  };

  useEffect(() => {
    if (user?.id && user?.email) {
      try {
        const raw = localStorage.getItem(KNOWN_ACCOUNTS_KEY);
        const existing: Account[] = raw ? JSON.parse(raw) : [];
        const filtered = existing.filter(a => a.id !== user.id && a.email !== user.email);
        const updated = [currentUser, ...filtered];
        localStorage.setItem(KNOWN_ACCOUNTS_KEY, JSON.stringify(updated));
        setSavedAccounts(updated);
      } catch {
        setSavedAccounts([currentUser]);
      }
    }
  }, [user?.id, user?.email, user?.profile?.avatar_url, user?.profile?.name]);

  const toggleDarkMode = () => setDarkMode(!darkMode);
  
  const handleSwitchAccount = async (account: Account) => {
    if (account.id === currentUser.id) return;
    await logout();
  };

  const handleLogout = async () => { 
    await logout();
  };

  const handleUpdateAvatar = async (url: string) => { 
    if (updateAvatar) {
      await updateAvatar(url);
    }
  };
  
  const handleAddAccount = async (account: any) => { 
    try {
      if (account.password) {
        await register(account.email, account.password, account.name, account.phone);
        alert('Usuário cadastrado com sucesso!');
      }
    } catch (err: any) {
      alert(`Erro ao cadastrar: ${err.message}`);
    } finally {
      setIsAddAccountModalOpen(false);
    }
  };

  // Dados Reais via Hooks
  const { appointments, updateStatus, addAppointment } = useAppointments();
  
  // Estatísticas calculadas dinamicamente com base no filtro ativo
  const stats = useStats(dateFilter, appointments);

  const accounts: Account[] = savedAccounts.length > 0 ? savedAccounts : [currentUser];

  if (authLoading) {
    return <div className="h-screen w-screen bg-black flex items-center justify-center text-primary">Carregando Sistema...</div>;
  }

  // Mostra o Login se não estiver autenticado
  if (!isAuthenticated) {
    return (
      <LoginScreen />
    );
  }

  return (
    <div className="bg-bg-base text-text-main antialiased transition-colors duration-200 h-screen h-[100dvh] flex flex-col font-display relative overflow-hidden">
      <AnimatedBackground darkMode={darkMode} />
      <Header 
        currentUser={currentUser}
        accounts={accounts}
        onSwitchAccount={handleSwitchAccount}
        onAddAccount={() => setIsAddAccountModalOpen(true)}
        onUpdateAvatar={handleUpdateAvatar}
        onOpenReports={() => setIsReportsModalOpen(true)}
        toggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        handleLogoutProp={handleLogout}
        showNavbarCta={showNavbarCta}
      />
      <div className="flex flex-1 overflow-hidden relative">
          <Sidebar 
            darkMode={darkMode} 
            toggleDarkMode={toggleDarkMode} 
            activeScreen={activeScreen} 
            setActiveScreen={(screen) => {
              setActiveScreen(screen);
              setIsMobileSidebarOpen(false);
            }} 
            isMobileOpen={isMobileSidebarOpen}
            closeMobileSidebar={() => setIsMobileSidebarOpen(false)}
            handleLogoutProp={handleLogout}
          />
          <main className="flex-1 overflow-y-auto p-4 lg:p-8 hide-scrollbar flex flex-col w-full">
          {activeScreen === 'dashboard' && (
            <>
              {/* Saudação e Contexto */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-main">
                    Bom dia, {currentUser?.name?.split(' ')[0] || 'Usuário'}
                  </h1>
                  <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                    Acompanhe o desempenho, faturamento e fluxo de agendamentos em tempo real.
                  </p>
                </div>
              </div>

              {/* BARRA DE FILTROS TEMPORAIS (DIAS, SEMANA, MÊS, ANO, PERSONALIZADO) */}
              <DateFilterBar 
                filter={dateFilter}
                onChange={setDateFilter}
              />

              {/* Grid de Métricas Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                
                {/* Coluna 1: Total Faturado + Serviços Mais Populares */}
                <div className="flex flex-col gap-6">
                  {/* Total Faturado Card */}
                  <div className="bg-bg-surface rounded-3xl p-6 shadow-sm border border-border-main transition-colors duration-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-text-secondary text-sm font-medium">Total Faturado</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                            {stats.periodLabel}
                          </span>
                        </div>
                        <h2 className="text-4xl font-bold tracking-tight mb-3 text-text-main">
                          R$ {stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h2>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                            stats.revenueGrowth >= 0 
                              ? 'bg-success/15 text-success' 
                              : 'bg-danger/15 text-danger'
                          }`}>
                            <span className="material-icons-outlined text-[14px] mr-1">
                              {stats.revenueGrowth >= 0 ? 'arrow_upward' : 'arrow_downward'}
                            </span> 
                            {Math.abs(stats.revenueGrowth)}%
                          </span>
                          <span className="text-xs text-text-secondary">
                            {stats.periodSubLabel}
                          </span>
                        </div>
                      </div>
                      <div className="p-2.5 bg-bg-elevated rounded-xl text-primary shadow-sm">
                        <span className="material-icons-outlined text-xl">
                          {dateFilter.period === 'day' ? 'calendar_today' : 
                           dateFilter.period === 'week' ? 'date_range' : 
                           dateFilter.period === 'month' ? 'calendar_view_month' : 'account_balance_wallet'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Serviços Mais Populares */}
                  <div className="bg-bg-surface rounded-3xl p-6 shadow-sm border border-border-main transition-colors duration-200 flex-1 flex flex-col min-h-[300px]">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className="font-bold text-text-main text-base">Serviços Mais Populares</h3>
                        <p className="text-xs text-text-secondary">Participação no período</p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-bg-elevated text-text-secondary">
                        {stats.popularServices.length} serviços
                      </span>
                    </div>

                    <div className="flex-1 min-h-[220px] w-full relative">
                      {stats.popularServices.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary text-xs">
                          <span className="material-icons-outlined text-3xl mb-1 opacity-40">donut_large</span>
                          Sem agendamentos no período
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.popularServices}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {stats.popularServices.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'var(--color-bg-surface)', 
                                borderColor: 'var(--color-border-main)', 
                                borderRadius: '12px',
                                fontSize: '12px',
                                color: 'var(--color-text-main)'
                              }}
                              itemStyle={{ color: 'var(--color-text-main)' }}
                            />
                            <Legend 
                              verticalAlign="bottom" 
                              align="center"
                              iconType="circle"
                              formatter={(value) => (
                                <span className="text-text-main ml-1.5 text-xs font-medium">{value}</span>
                              )}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}

                      {/* Center Text */}
                      {stats.popularServices.length > 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                          <span className="text-3xl font-bold text-text-main">{stats.appointmentsCount}</span>
                          <span className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">Atendimentos</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Coluna 2: Cards de Agendamentos, Cancelamentos e Ticket Médio */}
                <div className="grid grid-cols-1 gap-4 xl:gap-6 content-start">
                  <StatCard 
                    title="Agendamentos" 
                    amount={stats.appointmentsCount.toString()} 
                    percentage={`${Math.abs(stats.appointmentsGrowth)}%`}
                    trend={stats.appointmentsGrowth >= 0 ? 'up' : 'down'}
                    icon="calendar_today" 
                    isPrimary={true} 
                    periodLabel={stats.periodLabel}
                    subText={stats.periodSubLabel}
                    details={[
                      { label: 'Concluídos', count: stats.completedCount, colorClass: 'bg-emerald-400' },
                      { label: 'Confirmados', count: stats.confirmedCount, colorClass: 'bg-blue-300' },
                      { label: 'Pendentes', count: stats.pendingCount, colorClass: 'bg-amber-300' },
                    ]}
                  />

                  <StatCard 
                    title="Cancelamentos" 
                    amount={stats.cancelledCount.toString()} 
                    icon="event_busy" 
                    periodLabel={stats.periodLabel}
                    subText={`${stats.cancellationRate}% de taxa de cancelamento`}
                    trend={stats.cancelledCount === 0 ? 'neutral' : 'down'}
                  />

                  <StatCard 
                    title="Ticket Médio" 
                    amount={`R$ ${stats.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    icon="payments" 
                    periodLabel={stats.periodLabel}
                    subText="média por atendimento ativo"
                    trend="up"
                  />
                </div>

                {/* Coluna 3: Gráfico Dinâmico de Movimento */}
                <IncomeChart 
                  chartData={stats.chartData}
                  title={stats.chartTitle}
                  subtitle={stats.chartSubtitle}
                />
              </div>

              {/* Tabela / Kanban de Atividades e Agendamentos */}
              <div className="mt-8">
                <ActivityTable 
                  appointments={appointments} 
                  filteredAppointments={stats.filteredAppointments}
                  periodLabel={stats.periodLabel}
                  updateStatus={updateStatus} 
                />
              </div>
            </>
          )}

          <React.Suspense fallback={<div className="flex-1 flex items-center justify-center text-primary"><span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></span></div>}>
            {activeScreen === 'chat' && <LazyChatScreen />}
            {activeScreen === 'finance' && <LazyFinanceScreen appointments={appointments} />}
            {activeScreen === 'appointments' && <LazyAppointmentsScreen appointments={appointments} updateStatus={updateStatus} addAppointment={addAppointment} />}
            {activeScreen === 'notes' && <LazyNotesScreen />}
            {activeScreen === 'inventory' && <LazyInventoryScreen />}
            {activeScreen === 'employees' && <LazyEmployeesScreen />}
            {activeScreen === 'settings' && (
              <LazySettingsScreen 
                accounts={accounts}
                currentUser={currentUser}
                onSwitchAccount={handleSwitchAccount}
                onAddAccount={() => setIsAddAccountModalOpen(true)}
                handleLogoutProp={handleLogout}
              />
            )}
            {activeScreen === 'clients' && <LazyClientsScreen appointments={appointments} updateStatus={updateStatus} />}
            {activeScreen === 'forecast' && <LazyForecastScreen appointments={appointments} />}
          </React.Suspense>
        </main>
      </div>

      {/* Modals */}
      <PromoModal 
        isOpen={isPromoOpen} 
        onClose={handleClosePromo} 
      />
      <React.Suspense fallback={null}>
        <LazyReportsModal 
          isOpen={isReportsModalOpen} 
          onClose={() => setIsReportsModalOpen(false)} 
          appointments={appointments}
        />
        <LazyAddAccountModal
          isOpen={isAddAccountModalOpen}
          onClose={() => setIsAddAccountModalOpen(false)}
          onAdd={handleAddAccount}
        />
      </React.Suspense>
    </div>
  );
}
