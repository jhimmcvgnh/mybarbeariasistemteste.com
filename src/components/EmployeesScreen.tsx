import React, { useState, useMemo } from 'react';
import { AddEmployeeModal } from './AddEmployeeModal';
import { useStaff } from '../hooks/useStaff';
import { useAppointments } from '../hooks/useAppointments';

export const EmployeesScreen: React.FC = () => {
  const { staff, loading, addStaff } = useStaff();
  const { appointments } = useAppointments();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const employees = useMemo(() => {
    return staff.map(member => {
      const memberAppointments = appointments.filter(a => a.profissional_id === member.id && (a.status === 'concluido' || a.status === 'confirmado'));
      
      const revenue = memberAppointments.reduce((acc, a) => acc + (Number(a.valor_total ?? a.valor_cobrado) || 0), 0);
      const servicesCount = memberAppointments.length;
      
      const serviceCounts: Record<string, number> = {};
      memberAppointments.forEach(a => {
        const sName = a.servico?.nome || a.servico_nome || 'Outro';
        serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
      });
      const topService = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Geral';

      const nomeProfissional = member.nome || member.name || 'Profissional';
      const cargoProfissional = member.cargo || member.especialidade || 'Barbeiro';
      const avatarUrl = member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(nomeProfissional)}&background=FF622B&color=fff`;

      return {
        id: member.id,
        name: nomeProfissional,
        role: cargoProfissional === 'admin' ? 'Administrador' : cargoProfissional,
        avatar: avatarUrl,
        status: (member.ativo ?? member.active ?? true) ? 'active' : 'inactive',
        servicesCount,
        revenue,
        rating: Number(member.avaliacao_media ?? member.nota_avaliacao ?? 5.0),
        topService
      };
    });
  }, [staff, appointments]);

  const handleAddEmployee = async (newEmployeeData: any) => {
    try {
      await addStaff({
        name: newEmployeeData.name,
        cargo: newEmployeeData.role || newEmployeeData.topService || 'Barbeiro',
        avatar_url: newEmployeeData.avatar,
        active: newEmployeeData.status === 'active'
      });
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao adicionar funcionário:', err);
      alert(`Erro ao adicionar funcionário: ${err.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border border-success/20';
      case 'vacation': return 'bg-info/10 text-info border border-info/20';
      case 'inactive': return 'bg-neutral/10 text-neutral border border-neutral/20';
      default: return 'bg-bg-base text-text-secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'vacation': return 'Férias';
      case 'inactive': return 'Inativo';
      default: return status;
    }
  };

  const topPerformerId = employees.length > 0 ? employees.reduce((prev, current) => (prev.revenue > current.revenue) ? prev : current).id : null;

  if (loading) {
    return <div className="p-8 text-center text-text-secondary">Carregando equipe...</div>;
  }

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-text-main">Equipe</h2>
          <p className="text-text-secondary">Gerencie seus funcionários e acompanhe o desempenho</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary hover:bg-primary-hover text-primary-text px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm shadow-primary/20"
        >
          <span className="material-icons-outlined">person_add</span> Novo Funcionário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {employees.map((employee) => (
          <div key={employee.id} className="bg-bg-surface rounded-3xl p-6 shadow-sm border border-border-main relative overflow-hidden group transition-all hover:shadow-md">
            {employee.id === topPerformerId && employee.revenue > 0 && (
              <div className="absolute top-0 right-0 bg-primary text-primary-text text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                <span className="material-icons-outlined text-sm">emoji_events</span> Destaque do Mês
              </div>
            )}

            <div className="flex items-start gap-4 mb-6">
              <div className="relative">
                <img 
                  src={employee.avatar} 
                  alt={employee.name} 
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-border-main shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-bg-surface ${employee.status === 'active' ? 'bg-success' : employee.status === 'vacation' ? 'bg-info' : 'bg-neutral'}`}></div>
              </div>
              <div>
                <h3 className="font-bold text-lg text-text-main">{employee.name}</h3>
                <p className="text-sm text-text-secondary mb-2">{employee.role}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getStatusColor(employee.status)}`}>
                  {getStatusLabel(employee.status)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-primary p-3 rounded-xl shadow-sm shadow-primary/20">
                <p className="text-xs text-primary-subtle mb-1">Faturamento</p>
                <p className="font-bold text-primary-text">R$ {employee.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-primary p-3 rounded-xl shadow-sm shadow-primary/20">
                <p className="text-xs text-primary-subtle mb-1">Atendimentos</p>
                <p className="font-bold text-primary-text">{employee.servicesCount}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-secondary">Avaliação Média</span>
                  <span className="font-bold text-text-main flex items-center gap-1">
                    {employee.rating.toFixed(1)} <span className="material-icons-outlined text-primary text-sm">star</span>
                  </span>
                </div>
                <div className="h-2 w-full bg-bg-base rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${(employee.rating / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t border-border-main flex justify-between items-center">
                <div>
                   <p className="text-[10px] text-text-secondary uppercase tracking-wider">Serviço Principal</p>
                   <p className="text-sm font-medium text-text-main">{employee.topService}</p>
                </div>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:bg-bg-elevated transition-colors">
                  <span className="material-icons-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AddEmployeeModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onAdd={handleAddEmployee} 
      />
    </div>
  );
};
