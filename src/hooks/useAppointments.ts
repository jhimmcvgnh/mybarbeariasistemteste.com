import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, type Appointment, type AppointmentStatus } from '../lib/supabase';
import { useBarbearia } from './useBarbearia';

// ============================================================
// Hook: useAppointments - Sincronizado com Schema Definitivo
// ============================================================
export function useAppointments(date?: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { barbeariaId, userId, loading: barbLoading } = useBarbearia();
  const isFetchingRef = useRef(false);
  const hasPendingFetchRef = useRef(false);

  const fetchAppointments = useCallback(async (silent = false) => {
    if (!barbeariaId) {
      if (!barbLoading) {
        setAppointments([]);
        setLoading(false);
      }
      return;
    }

    if (isFetchingRef.current) {
      hasPendingFetchRef.current = true;
      return;
    }

    isFetchingRef.current = true;
    if (!silent && appointments.length === 0) {
      setLoading(true);
    }

    try {
      // Busca por barbearia_id OU por dono_id (agendamentos do site público)
      let query = supabase
        .from('agendamentos')
        .select('*')
        .eq('barbearia_id', barbeariaId)
        .order('data_hora_inicio', { ascending: true });

      if (date) {
        query = query
          .gte('data_hora_inicio', `${date}T00:00:00`)
          .lte('data_hora_inicio', `${date}T23:59:59.999Z`);
      }

      const { data, error: err } = await query;
      if (err) {
        console.error('Erro ao buscar agendamentos:', err);
        setError(err.message);
      } else {
        const formatted: Appointment[] = (data || []).map((item: any) => ({
          ...item,
          valor_total: Number(item.valor_total ?? 0),
          valor_cobrado: Number(item.valor_total ?? 0),
          duracao_minutos: Number(item.duracao_minutos ?? 40),
          duracao_total_minutos: Number(item.duracao_minutos ?? 40),
          servico_nome: item.servico_nome || 'Serviço Agendado',
          cliente_nome: item.cliente_nome || 'Cliente',
          cliente_telefone: item.cliente_telefone || '',
          cliente_email: item.cliente_email || null,
          status: item.status || 'pendente',
          forma_pagamento: item.forma_pagamento || 'presencial',
          urgencia: item.urgencia || null,
          origem: item.origem || 'site',
          created_at: item.criado_em,
        }));
        setAppointments(formatted);
        setError(null);
      }
    } catch (e: any) {
      console.error('Falha inesperada no fetchAppointments:', e);
      setError(e.message);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;

      if (hasPendingFetchRef.current) {
        hasPendingFetchRef.current = false;
        fetchAppointments(true);
      }
    }
  }, [barbeariaId, barbLoading, date, appointments.length]);

  useEffect(() => {
    fetchAppointments();

    if (!barbeariaId) return;

    const uniqueChannelName = `agendamentos-${barbeariaId}-${date ?? 'all'}-${Date.now()}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'agendamentos',
          filter: `barbearia_id=eq.${barbeariaId}`
        },
        () => {
          fetchAppointments(true);
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          fetchAppointments(true);
        }
      });

    // Polling removido para evitar sobrecarga e lag. Dependendo apenas de Realtime e Focus.

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchAppointments(true);
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn('Erro ao remover canal:', e);
      }
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [barbeariaId, date, fetchAppointments]);

  const updateStatus = useCallback(
    async (id: string, status: AppointmentStatus) => {
      setAppointments(prev =>
        prev.map(apt => (apt.id === id ? { ...apt, status } : apt))
      );

      const { error: err } = await supabase
        .from('agendamentos')
        .update({ status, atualizado_em: new Date().toISOString() })
        .eq('id', id);

      if (err) {
        await fetchAppointments(true);
        throw new Error(err.message);
      }
      await fetchAppointments(true);
    },
    [fetchAppointments]
  );

  const addAppointment = useCallback(
    async (newAppointment: Partial<Appointment>) => {
      if (!barbeariaId) {
        throw new Error('Barbearia não identificada. Verifique se está autenticado.');
      }

      const dataHoraInicio = newAppointment.data_hora_inicio || new Date().toISOString();
      const dateObj = new Date(dataHoraInicio);
      const duracaoMinutos = Number(newAppointment.duracao_minutos || 40);
      const dataHoraFim = newAppointment.data_hora_fim || new Date(dateObj.getTime() + duracaoMinutos * 60000).toISOString();
      const valorTotal = Number(newAppointment.valor_total ?? newAppointment.valor_cobrado ?? 0);

      const insertPayload: any = {
        barbearia_id: barbeariaId,
        cliente_nome: newAppointment.cliente_nome || 'Cliente',
        cliente_email: newAppointment.cliente_email || null,
        cliente_telefone: newAppointment.cliente_telefone || 'N/A',
        profissional_id: newAppointment.profissional_id || null,
        servico_nome: newAppointment.servico_nome || 'Corte Masculino',
        duracao_minutos: duracaoMinutos,
        valor_total: valorTotal,
        data_hora_inicio: dataHoraInicio,
        data_hora_fim: dataHoraFim,
        status: newAppointment.status || 'pendente',
        forma_pagamento: newAppointment.forma_pagamento === 'pix' ? 'pix' : 'presencial',
        canal_confirmacao: newAppointment.canal_confirmacao || 'painel',
        urgencia: newAppointment.urgencia || 'media',
        observacoes: newAppointment.observacoes || null,
        origem: 'painel'
      };

      const { error: err } = await supabase
        .from('agendamentos')
        .insert([insertPayload]);

      if (err) {
        console.error('Erro ao inserir agendamento no painel:', err);
        throw new Error(err.message);
      }

      await fetchAppointments(true);
    },
    [barbeariaId, fetchAppointments]
  );

  return { appointments, loading, error, refetch: () => fetchAppointments(false), updateStatus, addAppointment };
}
