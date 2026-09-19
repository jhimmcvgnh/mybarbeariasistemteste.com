import React, { useState } from 'react';
import { Appointment, AppointmentStatus, Urgencia, FormPagamento } from '../lib/supabase';
import { BARBER_SERVICES } from '../constants/services';

type UrgencyLevel = 'low' | 'medium' | 'high';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (appointment: Partial<Appointment>) => void;
}

export const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [clientName, setClientName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [service, setService] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('pendente');
  const [urgency, setUrgency] = useState<UrgencyLevel>('medium');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clientName && date && time && service) {
      const selectedService = BARBER_SERVICES.find(s => s.name === service);
      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      const duracaoMinutos = 45; // Duração padrão do serviço
      const endsAt = new Date(new Date(`${date}T${time}`).getTime() + duracaoMinutos * 60 * 1000).toISOString();
      
      const mappedUrgencia: Urgencia = urgency === 'low' ? 'baixa' : urgency === 'high' ? 'alta' : 'media';
      const formaPagamento: FormPagamento = 'presencial';

      onAdd({
        cliente_nome: clientName,
        cliente_email: email || null,
        cliente_telefone: phone || 'N/A',
        data_hora_inicio: scheduledAt,
        data_hora_fim: endsAt,
        servico_nome: selectedService ? selectedService.name : service,
        valor_total: selectedService ? selectedService.price : 0,
        valor_cobrado: selectedService ? selectedService.price : 0,
        duracao_minutos: duracaoMinutos,
        status: status as AppointmentStatus,
        forma_pagamento: formaPagamento,
        metodo_pagamento: formaPagamento,
        urgencia: mappedUrgencia,
        origem: 'painel',
      });
      
      // Reset form
      setClientName('');
      setEmail('');
      setPhone('');
      setDate('');
      setTime('');
      setService('');
      setStatus('pendente');
      setUrgency('medium');
      
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-bg-surface w-full max-w-md rounded-3xl shadow-xl border border-border-main p-5 sm:p-6 max-h-[90vh] overflow-y-auto hide-scrollbar animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text-main">Novo Agendamento</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-main transition-colors">
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Nome do Cliente *</label>
            <input 
              type="text" 
              required
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main"
              placeholder="Ex: João Silva"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">E-mail</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main"
                placeholder="joao@gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Telefone</label>
              <input 
                type="tel" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Data *</label>
              <input 
                type="date" 
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Horário *</label>
              <input 
                type="time" 
                required
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Serviço *</label>
            <select 
              required
              value={service}
              onChange={e => setService(e.target.value)}
              className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main"
            >
              <option value="" disabled>Selecione um serviço</option>
              {BARBER_SERVICES.map(s => (
                <option key={s.name} value={s.name}>{s.name} - R$ {s.price.toFixed(2)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
              <select 
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main"
              >
                <option value="pendente">Pendente</option>
                <option value="confirmado">Confirmado</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Urgência</label>
              <select 
                value={urgency}
                onChange={e => setUrgency(e.target.value as any)}
                className="w-full p-3 bg-bg-base border border-border-main rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-text-main"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full mt-4 bg-primary hover:bg-primary-hover text-primary-text font-bold py-3 px-4 rounded-xl transition-colors shadow-sm shadow-primary/20"
          >
            Adicionar Agendamento
          </button>
        </form>
      </div>
    </div>
  );
};
