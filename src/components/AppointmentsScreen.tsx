import React, { useState, useRef, useMemo } from 'react';
import { AddAppointmentModal } from './AddAppointmentModal';
import { AppointmentDetailsModal } from './AppointmentDetailsModal';
import * as XLSX from 'xlsx';
import { 
  isToday, 
  isSameWeek, 
  isSameMonth, 
  isSameDay, 
  parseISO 
} from 'date-fns';

import { type Appointment, type AppointmentStatus } from '../types/database.types';

// Types
export type ViewType = 'kanban' | 'calendar' | 'list';

interface AppointmentsScreenProps {
  appointments: Appointment[];
  updateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  addAppointment?: (apt: Partial<Appointment>) => Promise<void>;
}

export const AppointmentsScreen: React.FC<AppointmentsScreenProps> = ({ appointments, updateStatus, addAppointment }) => {
  const [view, setView] = useState<ViewType>('kanban');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [selectedCustomDate, setSelectedCustomDate] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtragem dos agendamentos
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    return appointments.filter(apt => {
      // Busca por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (apt.cliente_nome || '').toLowerCase();
        const service = (apt.servico_nome || '').toLowerCase();
        const phone = (apt.cliente_telefone || '').toLowerCase();
        if (!name.includes(q) && !service.includes(q) && !phone.includes(q)) {
          return false;
        }
      }

      // Filtro de Data
      if (dateFilterMode === 'all') return true;
      if (!apt.data_hora_inicio) return false;

      try {
        const d = typeof apt.data_hora_inicio === 'string' ? parseISO(apt.data_hora_inicio) : new Date(apt.data_hora_inicio);
        if (isNaN(d.getTime())) return false;

        if (dateFilterMode === 'today') return isToday(d);
        if (dateFilterMode === 'week') return isSameWeek(d, now, { weekStartsOn: 1 });
        if (dateFilterMode === 'month') return isSameMonth(d, now);
        if (dateFilterMode === 'custom' && selectedCustomDate) {
          const target = new Date(`${selectedCustomDate}T12:00:00`);
          return isSameDay(d, target);
        }
      } catch {
        return false;
      }

      return true;
    });
  }, [appointments, searchQuery, dateFilterMode, selectedCustomDate]);

  const handleAddAppointment = async (newAppointmentData: any) => {
    if (addAppointment) {
      try {
        await addAppointment(newAppointmentData);
      } catch (err: any) {
        alert(`Erro ao criar agendamento: ${err.message}`);
      }
    }
    setIsAddModalOpen(false);
  };

  const handleExport = () => {
    const exportData = filteredAppointments.map(apt => ({
      'ID': apt.id,
      'Cliente': apt.cliente_nome,
      'E-mail': apt.cliente_email,
      'Telefone': apt.cliente_telefone,
      'Data e Hora': apt.data_hora_inicio,
      'Serviço': apt.servico_nome || 'Personalizado',
      'Status': apt.status === 'pendente' ? 'Pendente' : 
                apt.status === 'confirmado' ? 'Confirmado' : 
                apt.status === 'concluido' ? 'Concluído' : 'Cancelado',
      'Valor': Number(apt.valor_cobrado ?? apt.valor_total ?? 0).toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Agendamentos");
    XLSX.writeFile(workbook, `agendamentos-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getUrgencyColor = (price: number) => {
    if (price >= 60) return 'bg-danger/10 text-danger border border-danger/20';
    if (price >= 40) return 'bg-warning/10 text-warning border border-warning/20';
    return 'bg-success/10 text-success border border-success/20';
  };

  const getUrgencyLabel = (price: number) => {
    if (price >= 60) return 'Alta';
    if (price >= 40) return 'Média';
    return 'Baixa';
  };

  const handleContact = (phone: string) => {
    window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank');
  };

  // KanbanView Component
  const KanbanView = () => {
    const columns: { id: AppointmentStatus; title: string; color: string }[] = [
      { id: 'pendente', title: 'Pendente', color: 'bg-amber-500' },
      { id: 'confirmado', title: 'Confirmado', color: 'bg-blue-500' },
      { id: 'concluido', title: 'Concluído', color: 'bg-emerald-500' },
    ];

    return (
      <div className="flex gap-6 overflow-x-auto pb-4 h-full">
        {columns.map(col => {
          const colAppts = filteredAppointments.filter(a => a.status === col.id);
          return (
            <div key={col.id} className="flex-1 min-w-[300px] bg-bg-base rounded-2xl p-4 flex flex-col">
              <h3 className="font-bold text-text-main mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.color}`}></span>
                  {col.title}
                </span>
                <span className="bg-bg-surface px-2.5 py-0.5 rounded-full text-xs font-semibold text-text-main">
                  {colAppts.length}
                </span>
              </h3>
              <div className="flex flex-col gap-3 overflow-y-auto flex-1 hide-scrollbar">
                {colAppts.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-border-main/50 rounded-2xl text-text-secondary text-xs">
                    Nenhum agendamento {col.title.toLowerCase()}
                  </div>
                ) : (
                  colAppts.map(apt => (
                    <div 
                      key={apt.id} 
                      onClick={() => setSelectedAppointment(apt)}
                      className="bg-bg-surface p-4 rounded-xl shadow-sm border border-border-main hover:shadow-md hover:border-primary/50 transition-all group cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${getUrgencyColor(Number(apt.valor_cobrado ?? apt.valor_total) || 0)}`}>
                          {getUrgencyLabel(Number(apt.valor_cobrado ?? apt.valor_total) || 0)}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppointment(apt);
                          }}
                          className="p-1 text-text-secondary hover:text-primary rounded-lg hover:bg-bg-elevated transition-colors"
                          title="Ver detalhes completos"
                        >
                          <span className="material-icons-outlined text-sm">more_horiz</span>
                        </button>
                      </div>
                      <h4 className="font-bold text-text-main group-hover:text-primary transition-colors">{apt.cliente_nome}</h4>
                      <p className="text-sm text-text-secondary mb-3">{apt.servico_nome || 'Personalizado'}</p>
                      
                      <div className="flex items-center gap-2 text-xs text-text-secondary mb-3">
                        <span className="material-icons-outlined text-sm">event</span>
                        {apt.data_hora_inicio ? new Date(apt.data_hora_inicio).toLocaleString('pt-BR') : 'Data N/A'}
                      </div>

                      <div className="flex gap-2 mt-2 pt-3 border-t border-border-main" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => handleContact(apt.cliente_telefone || '')}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors"
                        >
                          <span className="material-icons-outlined text-sm">whatsapp</span> Contato
                        </button>
                        {apt.status === 'pendente' && (
                          <button 
                            onClick={() => updateStatus(apt.id, 'confirmado')}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary text-primary-text text-xs font-bold hover:bg-primary-hover transition-colors"
                          >
                            Confirmar
                          </button>
                        )}
                        {apt.status === 'confirmado' && (
                          <button 
                            onClick={() => updateStatus(apt.id, 'concluido')}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600 text-primary-text text-xs font-bold hover:bg-emerald-700 transition-colors"
                          >
                            Concluir
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // List View Component
  const ListView = () => (
    <div className="bg-bg-surface rounded-3xl shadow-sm border border-border-main overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-bg-base">
            <tr className="text-xs uppercase tracking-wider text-text-secondary">
              <th className="p-4 font-semibold">Cliente</th>
              <th className="p-4 font-semibold">Contato</th>
              <th className="p-4 font-semibold">Serviço</th>
              <th className="p-4 font-semibold">Data e Hora</th>
              <th className="p-4 font-semibold">Urgência</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-border-main">
            {filteredAppointments.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-text-secondary text-xs">
                  Nenhum agendamento encontrado para os filtros ativos.
                </td>
              </tr>
            ) : (
              filteredAppointments.map((apt) => (
                <tr 
                  key={apt.id} 
                  onClick={() => setSelectedAppointment(apt)}
                  className="hover:bg-bg-elevated transition-colors cursor-pointer"
                >
                  <td className="p-4">
                    <div className="font-semibold text-text-main">{apt.cliente_nome}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-text-main">{apt.cliente_telefone || '-'}</div>
                    {apt.cliente_email && <div className="text-[11px] text-text-secondary">{apt.cliente_email}</div>}
                  </td>
                  <td className="p-4 text-text-main font-medium">{apt.servico_nome || 'Personalizado'}</td>
                  <td className="p-4 text-text-secondary font-medium">
                    {apt.data_hora_inicio ? new Date(apt.data_hora_inicio).toLocaleString('pt-BR') : '-'}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${getUrgencyColor(Number(apt.valor_cobrado ?? apt.valor_total) || 0)}`}>
                      {getUrgencyLabel(Number(apt.valor_cobrado ?? apt.valor_total) || 0)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize 
                      ${apt.status === 'confirmado' ? 'bg-info/10 text-info border-info/20' : 
                        apt.status === 'concluido' ? 'bg-success/10 text-success border-success/20' : 
                        'bg-warning/10 text-warning border-warning/20'}`}>
                      {apt.status}
                    </span>
                  </td>
                  <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleContact(apt.cliente_telefone || '')}
                        className="p-1.5 hover:bg-bg-elevated rounded-lg text-success transition-colors" 
                        title="Entrar em contato via WhatsApp"
                      >
                        <span className="material-icons-outlined text-base">whatsapp</span>
                      </button>
                      <button 
                        onClick={() => setSelectedAppointment(apt)}
                        className="p-1.5 hover:bg-bg-elevated rounded-lg text-text-secondary hover:text-primary transition-colors" 
                        title="Ver detalhes"
                      >
                        <span className="material-icons-outlined text-base">visibility</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Calendar View Component Dinâmico
  const CalendarView = () => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const appointmentsByDay = appointments.reduce((acc, apt) => {
      if (!apt.data_hora_inicio) return acc;
      const d = new Date(apt.data_hora_inicio);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        acc[day] = acc[day] || [];
        acc[day].push(apt);
      }
      return acc;
    }, {} as Record<number, typeof appointments>);

    return (
      <div className="bg-bg-surface rounded-3xl shadow-sm border border-border-main p-6 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-text-main capitalize">
            {monthNames[month]} de {year}
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={prevMonth}
              className="p-2 rounded-xl border border-border-main text-text-secondary hover:text-text-main hover:bg-bg-base transition-colors"
              title="Mês anterior"
            >
              <span className="material-icons-outlined text-sm">chevron_left</span>
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-border-main text-text-secondary hover:text-text-main hover:bg-bg-base transition-colors"
            >
              Hoje
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 rounded-xl border border-border-main text-text-secondary hover:text-text-main hover:bg-bg-base transition-colors"
              title="Próximo mês"
            >
              <span className="material-icons-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center font-semibold text-xs text-text-secondary py-1">
              {d}
            </div>
          ))}

          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2 rounded-xl bg-bg-base/30 opacity-40 min-h-[70px]" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dayApts = appointmentsByDay[day] || [];
            const isTodayDay = 
              new Date().getFullYear() === year && 
              new Date().getMonth() === month && 
              new Date().getDate() === day;

            return (
              <div 
                key={day} 
                className={`p-2 rounded-xl border flex flex-col justify-between min-h-[70px] transition-colors ${
                  isTodayDay 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border-main bg-bg-base/60 hover:bg-bg-base'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                    isTodayDay ? 'bg-primary text-primary-text' : 'text-text-main'
                  }`}>
                    {day}
                  </span>
                  {dayApts.length > 0 && (
                    <span className="text-[10px] font-semibold text-primary">
                      {dayApts.length} {dayApts.length === 1 ? 'agend.' : 'agends.'}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1 overflow-y-auto max-h-[60px] hide-scrollbar">
                  {dayApts.slice(0, 2).map(apt => (
                    <div 
                      key={apt.id} 
                      onClick={() => setSelectedAppointment(apt)}
                      className="text-[10px] p-1 rounded bg-bg-surface border border-border-main text-text-main truncate font-medium hover:border-primary cursor-pointer transition-colors"
                      title={`${apt.cliente_nome} - ${apt.servico_nome}`}
                    >
                      {new Date(apt.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} {apt.cliente_nome.split(' ')[0]}
                    </div>
                  ))}
                  {dayApts.length > 2 && (
                    <span className="text-[9px] text-text-secondary text-center">
                      +{dayApts.length - 2} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-main">Agendamentos</h2>
          <p className="text-xs text-text-secondary mt-0.5">Gerencie seus horários, clientes e atendimentos</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-bg-elevated p-1 rounded-xl">
            {(['kanban', 'calendar', 'list'] as ViewType[]).map(v => (
              <button 
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${view === v ? 'bg-bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-primary hover:bg-bg-surface'}`}
              >
                <span className="material-icons-outlined text-sm">{v === 'kanban' ? 'view_kanban' : v === 'calendar' ? 'calendar_month' : 'table_rows'}</span> 
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="border border-border-main hover:bg-bg-elevated text-text-main px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors font-semibold text-xs"
            title="Exportar para Excel"
          >
            <span className="material-icons-outlined text-sm">download</span> Exportar
          </button>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary hover:bg-primary-hover text-primary-text px-4 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors font-bold text-xs shadow-sm shadow-primary/20"
          >
            <span className="material-icons-outlined text-sm">add</span> Novo
          </button>
        </div>
      </div>

      {/* Toolbar de Filtros (visível em Kanban e Lista) */}
      {view !== 'calendar' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-bg-surface p-3 rounded-2xl border border-border-main shadow-sm">
          {/* Campo de Busca */}
          <div className="relative flex-1 max-w-md">
            <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">search</span>
            <input 
              type="text" 
              placeholder="Buscar cliente, serviço ou telefone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-bg-base border border-border-main rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-main transition-all"
            />
          </div>

          {/* Filtros de Data */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'Tudo' },
              { id: 'today', label: 'Hoje' },
              { id: 'week', label: 'Esta Semana' },
              { id: 'month', label: 'Este Mês' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setDateFilterMode(f.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  dateFilterMode === f.id
                    ? 'bg-primary text-primary-text shadow-sm'
                    : 'text-text-secondary hover:text-text-main hover:bg-bg-elevated'
                }`}
              >
                {f.label}
              </button>
            ))}

            <input 
              type="date"
              value={selectedCustomDate}
              onChange={(e) => {
                setSelectedCustomDate(e.target.value);
                if (e.target.value) setDateFilterMode('custom');
              }}
              className="bg-bg-base border border-border-main rounded-lg px-2 py-1 text-xs text-text-main focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              title="Escolher data específica"
            />
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        {view === 'kanban' && <KanbanView />}
        {view === 'calendar' && <CalendarView />}
        {view === 'list' && <ListView />}
      </div>

      <AddAppointmentModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddAppointment} 
      />

      <AppointmentDetailsModal
        isOpen={!!selectedAppointment}
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onUpdateStatus={updateStatus}
      />
    </div>
  );
};
