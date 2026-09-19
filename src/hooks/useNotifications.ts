import { useState, useEffect, useCallback } from 'react';
import { supabase, type Notificacao } from '../lib/supabase';
import { useBarbearia } from './useBarbearia';

export interface Notification extends Notificacao {
  title?: string;
  content?: string;
  body?: string;
  read?: boolean;
  created_at?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { barbeariaId, loading: barbLoading } = useBarbearia();

  const fetchNotifications = useCallback(async () => {
    if (!barbeariaId) {
      if (!barbLoading) {
        setNotifications([]);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('barbearia_id', barbeariaId)
        .order('criado_em', { ascending: false })
        .limit(30);

      if (err) {
        setError(err.message);
      } else {
        const normalized: Notification[] = (data || []).map((n: any) => ({
          ...n,
          title: n.titulo,
          content: n.mensagem,
          body: n.mensagem,
          type: n.tipo === 'sucesso' ? 'success' : n.tipo === 'alerta' ? 'warning' : 'info',
          read: n.lida,
          created_at: n.criado_em,
        }));
        setNotifications(normalized);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [barbeariaId, barbLoading]);

  useEffect(() => {
    fetchNotifications();

    if (!barbeariaId) return;

    const channelName = `notificacoes-${barbeariaId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'notificacoes',
          filter: `barbearia_id=eq.${barbeariaId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const n = payload.new as any;
            const normalized: Notification = {
              ...n,
              title: n.titulo,
              content: n.mensagem,
              body: n.mensagem,
              type: n.tipo === 'sucesso' ? 'success' : n.tipo === 'alerta' ? 'warning' : 'info',
              read: n.lida,
              created_at: n.criado_em,
            };
            setNotifications(prev => [normalized, ...prev.filter(item => item.id !== n.id)].slice(0, 30));
          } else if (payload.eventType === 'UPDATE') {
            const u = payload.new as any;
            setNotifications(prev => prev.map(n => {
              if (n.id === u.id) {
                return { 
                  ...u, 
                  title: u.titulo, 
                  content: u.mensagem, 
                  body: u.mensagem, 
                  type: u.tipo === 'sucesso' ? 'success' : u.tipo === 'alerta' ? 'warning' : 'info',
                  read: u.lida, 
                  created_at: u.criado_em 
                };
              }
              return n;
            }));
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbeariaId, fetchNotifications]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: true, read: true } : n));
    const { error: err } = await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
    if (err) console.error('Erro ao marcar notificação como lida:', err);
  };

  const markAllAsRead = async () => {
    if (!barbeariaId) return;
    setNotifications(prev => prev.map(n => ({ ...n, lida: true, read: true })));
    const { error: err } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('barbearia_id', barbeariaId)
      .eq('lida', false);
    if (err) console.error('Erro ao marcar todas notificações como lidas:', err);
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    const { error: err } = await supabase.from('notificacoes').delete().eq('id', id);
    if (err) console.error('Erro ao deletar notificação:', err);
  };

  const clearAll = async () => {
    if (!barbeariaId) return;
    setNotifications([]);
    const { error: err } = await supabase.from('notificacoes').delete().eq('barbearia_id', barbeariaId);
    if (err) console.error('Erro ao limpar notificações:', err);
  };

  return { notifications, loading, error, markAsRead, markAllAsRead, deleteNotification, clearAll, refetch: fetchNotifications };
}
