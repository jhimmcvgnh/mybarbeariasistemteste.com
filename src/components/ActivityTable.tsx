import React, { useState } from 'react';
import { type Appointment, type AppointmentStatus } from '../types/database.types';
import { AppointmentDetailsModal } from './AppointmentDetailsModal';
import { isToday, isYesterday, isTomorrow, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityTableProps {
  appointments: Appointment[];
  filteredAppointments?: Appointment[];
  updateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  periodLabel?: string;
}

export const ActivityTable: React.FC<ActivityTableProps> = ({ 
  appointments, 
  filteredAppointments, 
  updateStatus,
  periodLabel
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'todos'>('todos');
  const [usePeriodFilter, setUsePeriodFilter] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Base list depending on scope toggle
  const baseList = (usePeriodFilter && filteredAppointments) ? filteredAppointments : appointments;

  // Filter logic
  const displayedAppointments = baseList.filter(app => {
    // Status Filter
    if (statusFilter !== 'todos' && app.status !== statusFilter) {
      return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (app.cliente_nome || '').toLowerCase();
      const email = (app.cliente_email || '').toLowerCase();
      const phone = (app.cliente_telefone || '').toLowerCase();
      const service = (app.servico_nome || '').toLowerCase();
      
      return name.includes(q) || email.includes(q) || phone.includes(q) || service.includes(q);
    }

    return true;
  });

  // Sort logic (most recent / upcoming first)
  const sortedAppointments = [...displayedAppointments].sort((a, b) => {
    const timeA = a.data_hora_inicio ? new Date(a.data_hora_inicio).getTime() : 0;
    const timeB = b.data_hora_inicio ? new Date(b.data_hora_inicio).getTime() : 0;
    return timeA - timeB;
  });

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return 'Data N/A';
    try {
      const d = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      if (isNaN(d.getTime())) return 'Data N/A';

      if (isToday(d)) return `Hoje às ${format(d, 'HH:mm')}`;
      if (isYesterday(d)) return `Ontem às ${format(d, 'HH:mm')}`;
      if (isTomorrow(d)) return `Amanhã às ${format(d, 'HH:mm')}`;
      return format(d, "dd/MM 'às' HH:mm", { locale: ptBR });
    } catch {
      return 'Data N/A';
    }
  };

  const getUrgencyBadge = (price: number) => {
    if (price >= 60) return { label: 'ALTA', cls: 'bg-danger/10 text-danger border-danger/30' };
    if (price >= 40) return { label: 'MÉDIA', cls: 'bg-warning/10 text-warning border-warning/30' };
    return { label: 'PADRÃO', cls: 'bg-success/10 text-success border-success/30' };
  };

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    try {
      await updateStatus(id, status);
    } catch (err) {
      console.error(err);
    }
  };

  const statusCounts = {
    todos: baseList.length,
    pendente: baseList.filter(a => a.status === 'pendente').length,
    confirmado: baseList.filter(a => a.status === 'confirmado').length,
    concluido: baseList.filter(a => a.status === 'concluido').length,
    cancelado: baseList.filter(a => a.status === 'cancelado').length,
  };

  const columns: { id: AppointmentStatus; title: string; count: number }[] = [
    { id: 'pendente', title: 'Pendente', count: sortedAppointments.filter(a => a.status === 'pendente').length },
    { id: 'confirmado', title: 'Confirmado', count: sortedAppointments.filter(a => a.status === 'confirmado').length },
    { id: 'concluido', title: 'Concluído', count: sortedAppointments.filter(a => a.status === 'concluido').length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {/* Header da Tabela com Filtros de Escopo */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
              Agendamentos
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {sortedAppointments.length} exibidos
              </span>
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {usePeriodFilter && periodLabel 
                ? `Exibindo agendamentos para ${periodLabel}` 
                : 'Exibindo todos os agendamentos registrados no sistema'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Escopo do Período */}
            {filteredAppointments && (
              <div className="flex items-center bg-bg-base/80 border border-border-main p-1 rounded-xl">
                <button
                  onClick={() => setUsePeriodFilter(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    usePeriodFilter 
                      ? 'bg-primary text-primary-text shadow-sm' 
                      : 'text-text-secondary hover:text-text-main'
                  }`}
                >
                  Período Atual ({filteredAppointments.length})
                </button>
                <button
                  onClick={() => setUsePeriodFilter(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    !usePeriodFilter 
                      ? 'bg-primary text-primary-text shadow-sm' 
                      : 'text-text-secondary hover:text-text-main'
                  }`}
                >
                  Ver Todos ({appointments.length})
                </button>
              </div>
            )}

            {/* Alternador de visualização Kanban / Tabela */}
            <div className="flex items-center bg-bg-base/80 border border-border-main p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('board')} 
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'board' ? 'bg-primary text-primary-text' : 'text-text-secondary hover:text-text-main'}`}
                title="Visualização Kanban"
              >
                <span className="material-icons-outlined text-[18px]">dashboard</span>
              </button>
              <button 
                onClick={() => setViewMode('table')} 
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-primary text-primary-text' : 'text-text-secondary hover:text-text-main'}`}
                title="Visualização Tabela"
              >
                <span className="material-icons-outlined text-[18px]">view_list</span>
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Filtros Rápidos: Busca + Pills de Status */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">search</span>
            <input 
              type="text" 
              placeholder="Buscar por cliente, serviço ou telefone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-bg-surface border border-border-main rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-main transition-all shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-main text-xs"
              >
                <span className="material-icons-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar p-1 bg-bg-base/60 border border-border-main/50 rounded-xl">
            {(['todos', 'pendente', 'confirmado', 'concluido', 'cancelado'] as const).map(st => {
              const active = statusFilter === st;
              const count = statusCounts[st] || 0;
              const labels = {
                todos: 'Todos',
                pendente: 'Pendentes',
                confirmado: 'Confirmados',
                concluido: 'Concluídos',
                cancelado: 'Cancelados'
              };
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    active 
                      ? 'bg-primary text-primary-text shadow-sm' 
                      : 'text-text-secondary hover:text-text-main hover:bg-bg-elevated'
                  }`}
                >
                  <span>{labels[st]}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active ? 'bg-primary-text text-primary font-bold' : 'bg-bg-elevated text-text-secondary'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visualização KANBAN */}
        {viewMode === 'board' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto pb-4">
            {columns.map(col => {
              const colAppts = sortedAppointments.filter(app => app.status === col.id);
              return (
                <div key={col.id} className="flex flex-col gap-3 min-w-[280px]">
                  <div className="flex justify-between items-center bg-bg-surface border border-border-main px-4 py-3 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-sm text-text-main flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        col.id === 'pendente' ? 'bg-amber-500' :
                        col.id === 'confirmado' ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}></span>
                      {col.title}
                    </h3>
                    <span className="bg-bg-elevated text-text-main font-bold text-xs px-2 py-0.5 rounded-full">
                      {colAppts.length}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {colAppts.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed border-border-main/50 rounded-2xl text-text-secondary text-xs">
                        Nenhum agendamento {col.title.toLowerCase()} neste período
                      </div>
                    ) : (
                      colAppts.map(app => {
                        const val = Number(app.valor_total ?? app.valor_cobrado) || 0;
                        const urg = getUrgencyBadge(val);

                        return (
                          <div 
                            key={app.id} 
                            onClick={() => setSelectedAppointment(app)}
                            className="bg-bg-surface p-4 rounded-2xl shadow-sm border border-border-main hover:shadow-md hover:border-primary/50 transition-all group cursor-pointer"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${urg.cls}`}>
                                {urg.label}
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAppointment(app);
                                }}
                                className="p-1 text-text-secondary hover:text-primary rounded-lg hover:bg-bg-elevated transition-colors"
                                title="Ver detalhes completos"
                              >
                                <span className="material-icons-outlined text-sm">more_horiz</span>
                              </button>
                            </div>
                            
                            <div className="mb-3">
                              <h4 className="font-bold text-sm text-text-main group-hover:text-primary transition-colors">{app.cliente_nome}</h4>
                              <p className="text-xs text-text-secondary font-medium mb-2">{app.servico_nome || 'Serviço Personalizado'}</p>
                              
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-sm font-bold text-primary">R$ {val.toFixed(2)}</p>
                                <div className="flex items-center gap-1 text-text-secondary text-xs bg-bg-base px-2 py-1 rounded-lg border border-border-main">
                                  <span className="material-icons-outlined text-xs">event</span>
                                  <span className="font-medium">{formatDateDisplay(app.data_hora_inicio)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-3 pt-3 border-t border-border-main" onClick={e => e.stopPropagation()}>
                              {app.cliente_telefone && (
                                <a 
                                  href={`https://wa.me/${app.cliente_telefone.replace(/\D/g, '')}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="flex-1 py-1.5 rounded-xl bg-success/10 text-success hover:bg-success/20 text-xs font-bold transition-all flex items-center justify-center gap-1"
                                >
                                  <span className="material-icons-outlined text-sm">message</span> WhatsApp
                                </a>
                              )}
                              {app.status === 'pendente' && (
                                <button 
                                  onClick={() => handleStatusChange(app.id, 'confirmado')} 
                                  className="flex-1 py-1.5 rounded-xl bg-primary text-primary-text hover:bg-primary/90 text-xs font-bold transition-all"
                                >
                                  Confirmar
                                </button>
                              )}
                              {app.status === 'confirmado' && (
                                <button 
                                  onClick={() => handleStatusChange(app.id, 'concluido')} 
                                  className="flex-1 py-1.5 rounded-xl bg-emerald-600 text-primary-text hover:bg-emerald-700 text-xs font-bold transition-all"
                                >
                                  Concluir
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Visualização TABELA */}
        {viewMode === 'table' && (
          <div className="bg-bg-surface rounded-3xl shadow-sm border border-border-main overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead className="bg-bg-base">
                  <tr className="text-xs uppercase tracking-wider text-text-secondary border-b border-border-main">
                    <th className="py-3 pl-4 font-semibold">Cliente</th>
                    <th className="py-3 font-semibold">Contato</th>
                    <th className="py-3 font-semibold">Serviço</th>
                    <th className="py-3 font-semibold">Preço</th>
                    <th className="py-3 font-semibold">Data / Hora</th>
                    <th className="py-3 font-semibold">Status</th>
                    <th className="py-3 font-semibold text-right pr-4">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-border-main">
                  {sortedAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-text-secondary text-xs">
                        Nenhum agendamento encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    sortedAppointments.map((app) => {
                      const val = Number(app.valor_total ?? app.valor_cobrado) || 0;
                      return (
                        <tr 
                          key={app.id} 
                          onClick={() => setSelectedAppointment(app)}
                          className="hover:bg-bg-elevated transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 pl-4 font-semibold text-text-main">{app.cliente_nome}</td>
                          <td className="py-3.5">
                            <div className="flex flex-col">
                              <span className="text-text-main">{app.cliente_telefone || '-'}</span>
                              {app.cliente_email && <span className="text-[11px] text-text-secondary">{app.cliente_email}</span>}
                            </div>
                          </td>
                          <td className="py-3.5 font-medium text-text-main">{app.servico_nome || 'Personalizado'}</td>
                          <td className="py-3.5 text-primary font-bold">R$ {val.toFixed(2)}</td>
                          <td className="py-3.5 text-text-secondary font-medium">{formatDateDisplay(app.data_hora_inicio)}</td>
                          <td className="py-3.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
                              app.status === 'concluido' ? 'bg-success/15 text-success border-success/30' :
                              app.status === 'confirmado' ? 'bg-info/15 text-info border-info/30' :
                              app.status === 'pendente' ? 'bg-warning/15 text-warning border-warning/30' :
                              'bg-danger/15 text-danger border-danger/30'
                            }`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right pr-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {app.cliente_telefone && (
                                <a 
                                  href={`https://wa.me/${app.cliente_telefone.replace(/\D/g, '')}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg text-success hover:bg-bg-elevated transition-colors"
                                  title="WhatsApp"
                                >
                                  <span className="material-icons-outlined text-sm">message</span>
                                </a>
                              )}
                              <button 
                                onClick={() => setSelectedAppointment(app)}
                                className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-bg-elevated transition-colors"
                                title="Ver detalhes"
                              >
                                <span className="material-icons-outlined text-sm">visibility</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AppointmentDetailsModal
        isOpen={!!selectedAppointment}
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onUpdateStatus={updateStatus}
      />
    </div>
  );
};
