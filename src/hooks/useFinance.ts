import { useState, useEffect, useCallback } from 'react';
import { supabase, type FinanceiroTransacao, type TipoTransacao } from '../lib/supabase';
import { useBarbearia } from './useBarbearia';

export interface FinanceTransaction extends FinanceiroTransacao {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
}

export function useFinance() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { barbeariaId, loading: barbLoading } = useBarbearia();

  const fetchTransactions = useCallback(async () => {
    if (!barbeariaId) {
      if (!barbLoading) {
        setTransactions([]);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('financeiro_transacoes')
        .select('*')
        .eq('barbearia_id', barbeariaId)
        .order('criado_em', { ascending: false });

      if (err) throw err;

      const normalized: FinanceTransaction[] = (data || []).map((t: any) => ({
        ...t,
        type: t.tipo === 'entrada' ? 'income' : 'expense',
        category: t.categoria || 'Geral',
        description: t.descricao || (t.tipo === 'entrada' ? 'Entrada de Serviço' : 'Despesa'),
        amount: Number(t.valor || 0),
        date: (t.criado_em || new Date().toISOString()).split('T')[0],
      }));

      setTransactions(normalized);
    } catch (e: any) {
      console.error('Erro ao buscar transações financeiras:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [barbeariaId, barbLoading]);

  useEffect(() => {
    fetchTransactions();

    if (!barbeariaId) return;

    const channelId = `financeiro-${barbeariaId}-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'financeiro_transacoes',
          filter: `barbearia_id=eq.${barbeariaId}`
        },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbeariaId, fetchTransactions]);

  const addTransaction = async (params: {
    type: 'income' | 'expense';
    category: string;
    description: string;
    amount: number;
  }) => {
    if (!barbeariaId) throw new Error('Barbearia não autenticada.');

    const payload = {
      barbearia_id: barbeariaId,
      tipo: params.type === 'income' ? 'entrada' : 'saida',
      categoria: params.category,
      descricao: params.description || null,
      valor: Number(params.amount),
    };

    const { error: err } = await supabase
      .from('financeiro_transacoes')
      .insert([payload]);

    if (err) {
      console.error('Erro ao inserir transação financeira:', err);
      throw new Error(err.message);
    }

    await fetchTransactions();
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  return {
    transactions,
    loading,
    error,
    totalIncome,
    totalExpense,
    balance,
    addTransaction,
    refetch: fetchTransactions
  };
}
