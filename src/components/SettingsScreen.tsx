import React, { useState } from 'react';
import { Account } from './Header';

interface SettingsScreenProps {
  accounts: Account[];
  currentUser: Account;
  onSwitchAccount: (account: Account) => void;
  onAddAccount: () => void;
  handleLogoutProp: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ accounts, currentUser, onSwitchAccount, onAddAccount, handleLogoutProp }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'accounts' | 'security' | 'notifications'>('accounts');

  const handleSwitchAccount = (id: string) => {
    const account = accounts.find(acc => acc.id === id);
    if (account) {
      onSwitchAccount(account);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Meu Perfil', icon: 'person' },
    { id: 'accounts', label: 'Contas', icon: 'manage_accounts' },
    { id: 'security', label: 'Segurança', icon: 'lock' },
    { id: 'notifications', label: 'Notificações', icon: 'notifications' },
  ];

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold text-text-main">Configurações</h2>
        <p className="text-text-secondary">Gerencie suas preferências e contas</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
        {/* Sidebar Navigation */}
        <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-primary text-primary-text shadow-md shadow-primary/20' 
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-main hover:shadow-sm'
              }`}
            >
              <span className="material-icons-outlined">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-bg-surface rounded-3xl p-6 lg:p-8 shadow-sm border border-border-main overflow-y-auto hide-scrollbar">
          
          {/* Accounts Tab */}
          {activeTab === 'accounts' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-text-main">Gerenciar Contas</h3>
                  <p className="text-sm text-text-secondary">Alterne entre contas ou adicione novas</p>
                </div>
                <button 
                  onClick={onAddAccount}
                  className="bg-primary hover:bg-primary-hover text-primary-text px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm shadow-primary/20"
                >
                  <span className="material-icons-outlined text-sm">add</span> Adicionar Conta
                </button>
              </div>

              <div className="space-y-4">
                {accounts.map(account => (
                  <div 
                    key={account.id} 
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      currentUser.id === account.id 
                        ? 'border-primary bg-primary-subtle ring-1 ring-primary' 
                        : 'border-border-main hover:border-text-secondary/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img src={account.avatar} alt={account.name} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                        {currentUser.id === account.id && (
                          <div className="absolute -bottom-1 -right-1 bg-success border-2 border-bg-surface w-4 h-4 rounded-full"></div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-text-main">{account.name}</h4>
                        <p className="text-sm text-text-secondary">{account.email}</p>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-bg-base px-2 py-0.5 rounded text-text-secondary mt-1 inline-block">
                          Administrador
                        </span>
                      </div>
                    </div>
                    
                    {currentUser.id === account.id ? (
                      <span className="text-sm font-bold text-primary flex items-center gap-1">
                        <span className="material-icons-outlined text-sm">check_circle</span> Atual
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleSwitchAccount(account.id)}
                        className="text-sm font-medium text-text-secondary hover:text-text-main px-3 py-1.5 rounded-lg hover:bg-bg-elevated transition-colors"
                      >
                        Alternar
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-border-main">
                <button 
                  onClick={handleLogoutProp}
                  className="text-danger hover:text-danger/80 font-medium flex items-center gap-2 text-sm px-4 py-2 rounded-xl hover:bg-danger/10 transition-colors w-full sm:w-auto justify-center sm:justify-start"
                >
                  <span className="material-icons-outlined">logout</span> Sair de todas as contas
                </button>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-text-main">Informações Pessoais</h3>
              
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
                <div className="relative group cursor-pointer">
                  <img src={currentUser.avatar} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-bg-base" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-icons-outlined text-white">camera_alt</span>
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <h4 className="text-lg font-bold text-text-main">{currentUser.name}</h4>
                  <p className="text-text-secondary">Administrador</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Nome Completo</label>
                  <input type="text" defaultValue={currentUser.name} className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">E-mail</label>
                  <input type="email" defaultValue={currentUser.email} className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Telefone</label>
                  <input type="tel" defaultValue={currentUser.phone || ''} className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Cargo</label>
                  <input type="text" defaultValue="Administrador" disabled className="w-full p-3 bg-bg-base/50 border border-border-main rounded-xl text-text-secondary cursor-not-allowed" />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button className="bg-primary hover:bg-primary-hover text-primary-text px-6 py-2 rounded-xl font-medium transition-colors shadow-sm shadow-primary/20">
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-text-main">Segurança</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Senha Atual</label>
                  <input type="password" placeholder="••••••••" className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Nova Senha</label>
                  <input type="password" placeholder="••••••••" className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Confirmar Nova Senha</label>
                  <input type="password" placeholder="••••••••" className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main shadow-sm" />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button className="bg-primary hover:bg-primary-hover text-primary-text px-6 py-2 rounded-xl font-medium transition-colors shadow-sm shadow-primary/20">
                  Alterar Senha
                </button>
              </div>
            </div>
          )}

           {/* Notifications Tab */}
           {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-text-main">Preferências de Notificação</h3>
              
              <div className="space-y-4">
                {['Novos Agendamentos', 'Cancelamentos', 'Mensagens de Chat', 'Relatórios Semanais', 'Promoções e Dicas'].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-bg-base rounded-xl border border-border-main/50">
                    <span className="font-medium text-text-main">{item}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={index < 3} />
                      <div className="w-11 h-6 bg-text-secondary/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-primary-text after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-main after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
