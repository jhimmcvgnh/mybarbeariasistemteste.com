import { useState, useEffect, useCallback } from 'react';
import { supabase, type Cliente } from '../lib/supabase';
import { useBarbearia } from './useBarbearia';

export interface ClientDisplayData {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalSpent: number;
  appointmentCount: number;
  criado_em: string;
}

export function useClients() {
  const [clients, setClients] = useState<ClientDisplayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { barbeariaId, loading: barbLoading } = useBarbearia();

  const fetchClients = useCallback(async () => {
    if (!barbeariaId) {
      if (!barbLoading) {
        setClients([]);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Busca os clientes reais gravados na tabela clientes
      const { data: dbClients, error: clientErr } = await supabase
        .from('clientes')
        .select('*')
        .eq('barbearia_id', barbeariaId)
        .order('nome', { ascending: true });

      if (clientErr) throw clientErr;

      // 2. Busca os agendamentos para consolidar gastos e contagens por cliente
      const { data: appts, error: apptsErr } = await supabase
        .from('agendamentos')
        .select('cliente_id, cliente_telefone, cliente_nome, valor_total, status')
        .eq('barbearia_id', barbeariaId);

      if (apptsErr) throw apptsErr;

      // Monta mapa de histórico de agendamentos
      const metricsMap = new Map<string, { totalSpent: number; count: number }>();

      (appts || []).forEach(a => {
        const keyId = a.cliente_id;
        const keyTel = a.cliente_telefone;
        const valor = Number(a.valor_total || 0);

        if (keyId) {
          const current = metricsMap.get(keyId) || { totalSpent: 0, count: 0 };
          current.count += 1;
          if (a.status === 'concluido' || a.status === 'confirmado') {
            current.totalSpent += valor;
          }
          metricsMap.set(keyId, current);
        }

        if (keyTel) {
          const current = metricsMap.get(`tel_${keyTel}`) || { totalSpent: 0, count: 0 };
          current.count += 1;
          if (a.status === 'concluido' || a.status === 'confirmado') {
            current.totalSpent += valor;
          }
          metricsMap.set(`tel_${keyTel}`, current);
        }
      });

      const formatted: ClientDisplayData[] = (dbClients || []).map(c => {
        const byId = metricsMap.get(c.id);
        const byTel = c.telefone ? metricsMap.get(`tel_${c.telefone}`) : null;
        const totalSpent = byId?.totalSpent ?? byTel?.totalSpent ?? 0;
        const appointmentCount = byId?.count ?? byTel?.count ?? 0;

        return {
          id: c.id,
          name: c.nome || 'Cliente',
          email: c.email || 'N/A',
          phone: c.telefone || 'N/A',
          totalSpent,
          appointmentCount,
          criado_em: c.criado_em,
        };
      });

      setClients(formatted);
    } catch (e: any) {
      console.error('Erro ao buscar clientes:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [barbeariaId, barbLoading]);

  useEffect(() => {
    fetchClients();

    if (!barbeariaId) return;

    const channelId = `clientes-${barbeariaId}-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'clientes',
          filter: `barbearia_id=eq.${barbeariaId}`
        },
        () => fetchClients()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbeariaId, fetchClients]);

  return { clients, loading, error, refetch: fetchClients };
}
