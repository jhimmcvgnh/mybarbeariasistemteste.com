import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Account {
  id: string;
  name: string;
  email: string;
  avatar: string;
  phone?: string;
}

interface HeaderProps {
  toggleSidebar?: () => void;
  currentUser: Account;
  accounts: Account[];
  onSwitchAccount: (account: Account) => void;
  onAddAccount: () => void;
  onUpdateAvatar: (newAvatarUrl: string) => void;
  onOpenReports: () => void;
  handleLogoutProp: () => void;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'client' | 'appointment' | 'page';
}

const mockSearchResults: SearchResult[] = [
  { id: '1', title: 'João Silva', subtitle: 'Cliente - Última visita: 10/04', type: 'client' },
  { id: '2', title: 'Corte Fade & Barba', subtitle: 'Agendamento - Hoje 14:00', type: 'appointment' },
  { id: '3', title: 'Financeiro', subtitle: 'Ir para tela financeira', type: 'page' },
  { id: '4', title: 'Maria Oliveira', subtitle: 'Cliente - Novo cadastro', type: 'client' },
];

export const Header: React.FC<HeaderProps> = ({ 
  currentUser, 
  accounts, 
  onSwitchAccount, 
  onAddAccount, 
  onUpdateAvatar,
  onOpenReports,
  toggleSidebar,
  handleLogoutProp
}) => {
  // Account Dropdown State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { notifications, deleteNotification, clearAll, markAsRead, markAllAsRead } = useNotifications();
  const notificationRef = useRef<HTMLButtonElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Profile Dropdown
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      // Notification Dropdown
      if (
        notificationDropdownRef.current && 
        !notificationDropdownRef.current.contains(event.target as Node) &&
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
      // Search Dropdown
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search Handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 0) {
      setIsSearchOpen(true);
      const results = mockSearchResults.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) || 
        item.subtitle.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredResults(results);
    } else {
      setIsSearchOpen(false);
    }
  };

  // Notification Handlers
  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggleNotifications = () => {
    const willOpen = !isNotificationsOpen;
    setIsNotificationsOpen(willOpen);
    if (willOpen && unreadCount > 0) {
      markAllAsRead();
    }
  };

  // Account Handlers
  const handleSwitch = (account: Account) => {
    onSwitchAccount(account);
    setIsProfileOpen(false);
  };

  const handleAdd = () => {
    onAddAccount();
    setIsProfileOpen(false);
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Url = e.target?.result as string;
        if (base64Url) {
          onUpdateAvatar(base64Url);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-bg-surface backdrop-blur-xl border-b border-border-main px-4 lg:px-6 py-4 flex items-center justify-between transition-colors duration-200">
      <div className="flex items-center gap-2">
        <button 
          onClick={toggleSidebar}
          className="lg:hidden p-2 -ml-2 text-text-secondary hover:bg-bg-elevated rounded-full transition-colors"
        >
          <span className="material-icons-outlined">menu</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-text font-bold text-lg">
          <span className="material-icons-outlined text-sm">content_cut</span>
        </div>
        <span className="font-bold text-lg sm:text-xl tracking-tight text-text-main">Barbearia</span>
      </div>
      
      <nav className="hidden xl:flex items-center gap-1 bg-bg-elevated p-1 rounded-full transition-colors duration-200">
        <button className="px-4 py-2 rounded-full bg-primary text-primary-text text-sm font-medium transition-colors shadow-sm shadow-primary/20">Visão Geral</button>
        <button className="px-4 py-2 rounded-full text-text-secondary hover:bg-primary-subtle hover:text-primary dark:hover:bg-bg-elevated dark:hover:text-primary-text text-sm font-medium transition-colors">Conta</button>
        <button 
          onClick={onOpenReports}
          className="px-4 py-2 rounded-full text-text-secondary hover:text-text-main text-sm font-medium transition-colors flex items-center gap-1.5 group"
        >
          <span className="material-icons-outlined text-sm group-hover:text-primary transition-colors">auto_awesome</span>
          Relatórios
        </button>
      </nav>

      {/* Search Bar - Center */}
      <div className="hidden md:block w-64 mx-4 relative" ref={searchRef}>
        <div className={`flex items-center bg-bg-elevated rounded-full px-4 py-2 transition-all duration-200 ${isSearchOpen ? 'ring-2 ring-primary bg-bg-base shadow-lg' : 'hover:bg-bg-elevated'}`}>
          <span className="material-icons-outlined text-text-secondary mr-2">search</span>
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="bg-transparent border-none focus:outline-none text-sm w-full text-text-main placeholder-text-secondary"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchQuery.length > 0 && setIsSearchOpen(true)}
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
              className="text-text-secondary hover:text-text-main"
            >
              <span className="material-icons-outlined text-sm">close</span>
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && filteredResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-bg-surface rounded-2xl shadow-xl border border-border-main overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2">
              {filteredResults.map(result => (
                <button key={result.id} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-bg-elevated transition-colors text-left">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                    ${result.type === 'client' ? 'bg-info/10 text-info' : 
                      result.type === 'appointment' ? 'bg-primary-subtle text-primary' : 
                      'bg-bg-elevated text-text-secondary'}`}>
                    <span className="material-icons-outlined text-sm">
                      {result.type === 'client' ? 'person' : result.type === 'appointment' ? 'event' : 'description'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-main">{result.title}</p>
                    <p className="text-xs text-text-secondary">{result.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Mobile Search Icon (only visible on small screens) */}
        <button className="md:hidden p-2 text-text-secondary hover:bg-bg-elevated rounded-full transition-colors">
          <span className="material-icons-outlined">search</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            ref={notificationRef}
            onClick={handleToggleNotifications}
            className={`p-2 rounded-full transition-colors relative ${isNotificationsOpen ? 'bg-bg-elevated text-primary' : 'text-text-secondary hover:bg-bg-elevated'}`}
          >
            <span className="material-icons-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-danger border-2 border-bg-surface rounded-full"></span>
            )}
          </button>

          {isNotificationsOpen && (
            <div 
              ref={notificationDropdownRef}
              className="absolute top-full right-0 sm:right-0 mt-2 w-[85vw] max-w-[320px] sm:max-w-none sm:w-96 bg-bg-surface rounded-2xl shadow-xl border border-border-main overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-30"
            >
              <div className="p-4 border-b border-border-main flex justify-between items-center">
                <h3 className="font-bold text-text-main">Notificações</h3>
                {notifications.length > 0 && (
                  <button 
                    onClick={() => clearAll()}
                    className="text-xs text-primary hover:text-primary-hover font-medium"
                  >
                    Limpar tudo
                  </button>
                )}
              </div>
              
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-text-secondary">
                    <span className="material-icons-outlined text-4xl mb-2 opacity-50">notifications_off</span>
                    <p>Nenhuma notificação nova</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-main">
                    {notifications.map(notification => (
                      <div 
                        key={notification.id} 
                        onClick={() => handleNotificationClick(notification.id)}
                        className="p-4 hover:bg-bg-elevated transition-colors relative group cursor-pointer"
                      >
                        <div className="flex gap-3 pr-6">
                          <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${
                            notification.type === 'success' ? 'bg-success' : 
                            notification.type === 'warning' ? 'bg-warning' : 'bg-info'
                          }`}></div>
                          <div>
                            <p className="text-sm font-bold text-text-main mb-0.5">{notification.title}</p>
                            <p className="text-sm text-text-secondary mb-1">{notification.body}</p>
                            <p className="text-xs text-text-secondary opacity-70">
                              {formatDistanceToNow(new Date(notification.created_at || new Date()), { addSuffix: true, locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => handleDeleteNotification(e, notification.id)}
                          className="absolute top-3 right-3 text-text-secondary hover:text-danger opacity-0 group-hover:opacity-100 transition-all p-1 rounded-full hover:bg-bg-elevated"
                          title="Remover notificação"
                        >
                          <span className="material-icons-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Profile Dropdown */}
        <div className="relative" ref={profileDropdownRef}>
          <div 
            className="flex items-center gap-3 pl-4 border-l border-border-main cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <div className="relative group">
              <img 
                src={currentUser.avatar} 
                alt="User Avatar" 
                className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-primary transition-all"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <span className="material-icons-outlined text-white text-sm">edit</span>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold leading-none mb-1 text-text-main">{currentUser.name}</p>
              <p className="text-xs text-text-secondary leading-none truncate max-w-[120px]">{currentUser.email}</p>
            </div>
            <span className={`material-icons-outlined text-text-secondary transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}>expand_more</span>
          </div>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-2 w-[85vw] max-w-[288px] sm:max-w-none sm:w-72 bg-bg-surface rounded-2xl shadow-xl border border-border-main overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-30">
              <div className="p-4 border-b border-border-main">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Minhas Contas</p>
                <div className="space-y-2">
                  {accounts.map(account => (
                    <button 
                      key={account.id}
                      onClick={() => handleSwitch(account)}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${currentUser.id === account.id ? 'bg-primary-subtle text-primary' : 'hover:bg-bg-elevated text-text-main'}`}
                    >
                      <img src={account.avatar} alt={account.name} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{account.name}</p>
                        <p className="text-xs opacity-70 truncate">{account.email}</p>
                      </div>
                      {currentUser.id === account.id && (
                        <span className="material-icons-outlined text-primary text-sm">check_circle</span>
                      )}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={handleAdd}
                  className="w-full mt-3 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-primary text-primary hover:bg-primary/5 transition-all text-sm font-medium"
                >
                  <span className="material-icons-outlined text-lg">add</span> Adicionar outra conta
                </button>
              </div>
              <div className="p-2">
                <button 
                  onClick={(e) => handleAvatarClick(e as any)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-bg-elevated text-text-main transition-colors text-sm font-medium"
                >
                  <span className="material-icons-outlined">account_circle</span> Alterar Foto de Perfil
                </button>
                <button 
                  onClick={handleLogoutProp}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-danger/10 text-danger transition-colors text-sm font-medium"
                >
                  <span className="material-icons-outlined">logout</span> Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
