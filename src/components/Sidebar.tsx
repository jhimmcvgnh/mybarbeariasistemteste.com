import React from 'react';

interface SidebarProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
  isMobileOpen?: boolean;
  closeMobileSidebar?: () => void;
  handleLogoutProp: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  darkMode, 
  toggleDarkMode, 
  activeScreen, 
  setActiveScreen, 
  isMobileOpen, 
  closeMobileSidebar, 
  handleLogoutProp 
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 lg:z-10
        w-64 lg:w-20 flex flex-col items-center py-4 px-3 lg:px-0 border-r border-border-main bg-bg-surface backdrop-blur-xl shrink-0 transition-transform duration-300 ease-in-out overflow-y-auto hide-scrollbar
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Header Close */}
        <div className="w-full flex lg:hidden items-center justify-between px-2 mb-4">
          <span className="font-bold text-lg text-text-main">Menu Navegação</span>
          <button onClick={closeMobileSidebar} className="p-2 text-text-secondary hover:bg-bg-elevated rounded-full">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <div className="flex lg:flex-col gap-2 w-full items-center justify-around lg:justify-center bg-bg-elevated/50 lg:bg-transparent p-2 lg:p-0 rounded-xl">
          <button 
            onClick={() => darkMode && toggleDarkMode()}
            className={`p-2.5 rounded-xl transition-colors flex items-center justify-center ${!darkMode ? 'bg-bg-elevated text-text-main shadow-sm' : 'text-text-secondary hover:bg-bg-elevated'}`}
            title="Tema Claro"
          >
            <span className="material-icons-outlined">light_mode</span>
          </button>
          <button 
            onClick={() => !darkMode && toggleDarkMode()}
            className={`p-2.5 rounded-xl transition-colors flex items-center justify-center ${darkMode ? 'bg-bg-elevated text-text-main shadow-sm' : 'text-text-secondary hover:bg-bg-elevated'}`}
            title="Tema Escuro"
          >
            <span className="material-icons-outlined">dark_mode</span>
          </button>
        </div>

        <div className="flex-1 w-full flex flex-col items-start lg:items-center justify-start lg:justify-center gap-1.5 mt-4 lg:mt-6">
          {[
            { id: 'dashboard', icon: 'grid_view', label: 'Dashboard' },
            { id: 'appointments', icon: 'calendar_month', label: 'Agendamentos' },
            { id: 'chat', icon: 'chat', label: 'Chat IA' },
            { id: 'finance', icon: 'account_balance_wallet', label: 'Financeiro' },
            { id: 'forecast', icon: 'auto_graph', label: 'Previsões (IA)' },
            { id: 'clients', icon: 'people', label: 'Clientes' },
            { id: 'inventory', icon: 'inventory_2', label: 'Estoque' },
            { id: 'employees', icon: 'badge', label: 'Equipe' },
            { id: 'notes', icon: 'edit_note', label: 'Anotações' },
            { id: 'settings', icon: 'settings', label: 'Configurações' },
          ].map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button 
                key={item.id}
                title={item.label} 
                onClick={() => setActiveScreen(item.id)}
                className={`w-full lg:w-12 h-11 lg:h-12 rounded-2xl flex items-center justify-start lg:justify-center px-4 lg:px-0 transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-text shadow-sm shadow-primary/20 font-semibold' 
                    : 'text-text-secondary hover:bg-primary-subtle hover:text-primary dark:hover:bg-bg-elevated dark:hover:text-primary-text'
                }`}
              >
                <span className="material-icons-outlined shrink-0">{item.icon}</span>
                <span className="lg:hidden ml-3 text-sm truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-2 w-full items-start lg:items-center mb-2 pt-4 border-t border-border-main lg:border-none">
          <button 
            onClick={handleLogoutProp}
            className="w-full lg:w-auto p-3 text-danger hover:bg-danger/10 rounded-xl transition-colors flex items-center justify-start lg:justify-center px-4 lg:px-3"
          >
            <span className="material-icons-outlined shrink-0">logout</span>
            <span className="lg:hidden ml-3 text-sm font-medium">Sair da conta</span>
          </button>
        </div>
      </aside>
    </>
  );
};
