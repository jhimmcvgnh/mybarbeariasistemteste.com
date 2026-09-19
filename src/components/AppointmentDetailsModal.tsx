import React, { useEffect, useState } from 'react';
import { Appointment, AppointmentStatus, supabase } from '../lib/supabase';

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onUpdateStatus?: (id: string, status: AppointmentStatus) => Promise<void>;
}

export const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onUpdateStatus
}) => {
  const [referencias, setReferencias] = useState<{ id: string; url: string }[]>([]);
  const [subServicos, setSubServicos] = useState<{ id: string; nome_servico: string; preco: number; duracao_minutos: number }[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!appointment || !isOpen) {
      setReferencias([]);
      setSubServicos([]);
      return;
    }

    // Buscar imagens de referência do corte
    const fetchDetails = async () => {
      try {
        const { data: refs } = await supabase
          .from('agendamento_referencias')
          .select('*')
          .eq('agendamento_id', appointment.id);

        if (refs && refs.length > 0) {
          setReferencias(refs);
        }

        const { data: servs } = await supabase
          .from('agendamento_servicos')
          .select('*')
          .eq('agendamento_id', appointment.id);

        if (servs && servs.length > 0) {
          setSubServicos(servs);
        }
      } catch (err) {
        console.error('Erro ao buscar detalhes extras do agendamento:', err);
      }
    };

    fetchDetails();
  }, [appointment, isOpen]);

  if (!isOpen || !appointment) return null;

  const handleStatusChange = async (status: AppointmentStatus) => {
    if (!onUpdateStatus) return;
    try {
      setIsUpdating(true);
      await onUpdateStatus(appointment.id, status);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanPhone = appointment.cliente_telefone ? appointment.cliente_telefone.replace(/\D/g, '') : '';
  const valorTotal = Number(appointment.valor_cobrado ?? appointment.valor_total ?? 0);
  const servicoNome = appointment.servico?.nome || appointment.servico_nome || 'Serviço de Barbearia';

  const dataFormatada = appointment.data_hora_inicio 
    ? new Date(appointment.data_hora_inicio).toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      }) 
    : 'Data não informada';

  const horaInicioFormatada = appointment.data_hora_inicio 
    ? new Date(appointment.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
    : '--:--';

  const horaFimFormatada = appointment.data_hora_fim 
    ? new Date(appointment.data_hora_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
    : null;

  const statusBadge = {
    pendente: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    confirmado: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    concluido: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    cancelado: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    nao_compareceu: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  }[appointment.status as string] || 'bg-primary/10 text-primary border-primary/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-bg-surface w-full max-w-2xl rounded-3xl shadow-2xl border border-border-main p-6 sm:p-8 max-h-[92vh] overflow-y-auto hide-scrollbar animate-in zoom-in-95 duration-200 flex flex-col gap-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b border-border-main pb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-text-main">{appointment.cliente_nome}</h2>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border uppercase tracking-wider ${statusBadge}`}>
                {appointment.status}
              </span>
            </div>
            <p className="text-sm text-text-secondary">Detalhes completos e histórico do agendamento</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-text-secondary hover:text-text-main hover:bg-bg-elevated transition-colors"
          >
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        {/* Informações Principais do Agendamento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card: Horário & Data */}
          <div className="bg-bg-base/70 p-4 rounded-2xl border border-border-main flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <span className="material-icons-outlined text-base">event</span>
              <span>Data & Horário</span>
            </div>
            <div>
              <p className="text-base font-semibold text-text-main capitalize">{dataFormatada}</p>
              <p className="text-sm text-text-secondary mt-0.5">
                Início às <strong className="text-text-main">{horaInicioFormatada}</strong>
                {horaFimFormatada && <> até às <strong className="text-text-main">{horaFimFormatada}</strong></>}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary mt-1">
              <span className="material-icons-outlined text-xs">schedule</span>
              <span>Duração: {appointment.duracao_minutos || 40} minutos</span>
            </div>
          </div>

          {/* Card: Serviço & Valores */}
          <div className="bg-bg-base/70 p-4 rounded-2xl border border-border-main flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <span className="material-icons-outlined text-base">content_cut</span>
              <span>Serviço & Faturamento</span>
            </div>
            <div>
              <p className="text-base font-semibold text-text-main">{servicoNome}</p>
              <p className="text-2xl font-bold text-primary mt-1">
                R$ {valorTotal.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span className="material-icons-outlined text-xs">payments</span>
              <span>Pagamento: {appointment.forma_pagamento || 'Presencial / Local'}</span>
            </div>
          </div>
        </div>

        {/* Sub-serviços detalhados (se selecionou múltiplos) */}
        {subServicos.length > 0 && (
          <div className="bg-bg-base/50 p-4 rounded-2xl border border-border-main">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3 flex items-center gap-1.5">
              <span className="material-icons-outlined text-sm">list_alt</span>
              Serviços Inclusos no Pacote ({subServicos.length})
            </h3>
            <div className="flex flex-col divide-y divide-border-main">
              {subServicos.map(sub => (
                <div key={sub.id} className="py-2 flex justify-between items-center text-sm">
                  <span className="font-medium text-text-main">{sub.nome_servico}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary">{sub.duracao_minutos} min</span>
                    <span className="font-bold text-primary">R$ {Number(sub.preco).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contato do Cliente */}
        <div className="bg-bg-base/50 p-4 rounded-2xl border border-border-main flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
            <span className="material-icons-outlined text-sm">person</span>
            Dados de Contato do Cliente
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Telefone & WhatsApp */}
            <div className="flex items-center justify-between p-3 bg-bg-surface rounded-xl border border-border-main">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="material-icons-outlined text-text-secondary text-sm">phone</span>
                <span className="text-sm font-medium text-text-main truncate">
                  {appointment.cliente_telefone || 'Sem telefone'}
                </span>
              </div>
              {cleanPhone && (
                <a
                  href={`https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(appointment.cliente_nome)}%2C%20tudo%20bem%3F%20Confirmando%20seu%20agendamento%20de%20${encodeURIComponent(servicoNome)}%20na%20Barbearia!`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
                >
                  <span className="material-icons-outlined text-xs">chat</span> WhatsApp
                </a>
              )}
            </div>

            {/* E-mail */}
            <div className="flex items-center justify-between p-3 bg-bg-surface rounded-xl border border-border-main">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="material-icons-outlined text-text-secondary text-sm">email</span>
                <span className="text-sm font-medium text-text-main truncate">
                  {appointment.cliente_email || 'Sem e-mail'}
                </span>
              </div>
              {appointment.cliente_email && (
                <button
                  onClick={() => handleCopy(appointment.cliente_email!)}
                  className="px-2 py-1 rounded-lg bg-bg-elevated text-text-secondary hover:text-text-main text-xs font-medium transition-colors shrink-0"
                >
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fotos de Referência do Corte (Quizz) */}
        {referencias.length > 0 && (
          <div className="bg-bg-base/50 p-4 rounded-2xl border border-border-main">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3 flex items-center gap-1.5">
              <span className="material-icons-outlined text-sm">image</span>
              Fotos de Referência do Corte Escolhido no Quizz ({referencias.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {referencias.map((ref, idx) => (
                <a
                  key={ref.id || idx}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative rounded-xl overflow-hidden aspect-square border border-border-main bg-black/20 block"
                >
                  <img
                    src={ref.url}
                    alt={`Referência ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                    <span className="material-icons-outlined text-sm">open_in_new</span> Ver Foto
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Observações */}
        {appointment.observacoes && (
          <div className="bg-bg-base/50 p-4 rounded-2xl border border-border-main">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 flex items-center gap-1.5">
              <span className="material-icons-outlined text-sm">notes</span>
              Observações do Cliente
            </h3>
            <p className="text-sm text-text-main leading-relaxed italic bg-bg-surface p-3 rounded-xl border border-border-main">
              "{appointment.observacoes}"
            </p>
          </div>
        )}

        {/* Footer / Ações de Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border-main">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-secondary font-medium">Alterar Status:</span>
            {appointment.status !== 'confirmado' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange('confirmado')}
                className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 text-xs font-bold transition-all border border-blue-500/20"
              >
                Confirmar
              </button>
            )}
            {appointment.status !== 'concluido' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange('concluido')}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-xs font-bold transition-all border border-emerald-500/20"
              >
                Concluir
              </button>
            )}
            {appointment.status !== 'cancelado' && (
              <button
                disabled={isUpdating}
                onClick={() => handleStatusChange('cancelado')}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-bold transition-all border border-rose-500/20"
              >
                Cancelar
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-bg-elevated text-text-main hover:bg-border-main text-xs font-bold transition-colors ml-auto"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
