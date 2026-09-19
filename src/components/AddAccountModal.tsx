import React, { useState } from 'react';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (account: { name: string; email: string; phone: string; password?: string }) => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && phone && password) {
      onAdd({ name, email, phone, password });
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-bg-surface w-full max-w-md rounded-3xl shadow-xl border border-border-main p-5 sm:p-6 max-h-[90vh] overflow-y-auto hide-scrollbar animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text-main">Adicionar Novo Funcionário / Usuário</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg-elevated transition-colors"
          >
            <span className="material-icons-outlined text-sm">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Nome</label>
            <input 
              type="text" 
              required
              placeholder="Ex: João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Email</label>
            <input 
              type="email" 
              required
              placeholder="Ex: joao.silva@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Número</label>
            <input 
              type="tel" 
              required
              placeholder="Ex: (11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-main mb-1">Senha (Mínimo 6 caracteres)</label>
            <input 
              type="password" 
              required
              placeholder="Digite a senha inicial"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main"
            />
          </div>

          <div className="flex gap-3 mt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border-main text-text-main hover:bg-bg-elevated transition-colors font-medium"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 bg-primary hover:bg-primary-hover text-primary-text rounded-xl font-bold transition-colors shadow-sm shadow-primary/20"
            >
              Cadastrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
