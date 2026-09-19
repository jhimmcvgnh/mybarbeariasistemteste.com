import { useState, useEffect, useCallback } from 'react';
import { supabase, type Anotacao, type CorAnotacao } from '../lib/supabase';
import { useBarbearia } from './useBarbearia';

export interface Note extends Anotacao {
  content?: string;
  color?: string;
  created_at?: string;
  user_id?: string;
}

const colorToClassMap: Record<CorAnotacao, string> = {
  amarelo: 'bg-yellow-200 text-yellow-900',
  azul: 'bg-blue-200 text-blue-900',
  verde: 'bg-green-200 text-green-900',
  rosa: 'bg-pink-200 text-pink-900',
  roxo: 'bg-purple-200 text-purple-900',
  laranja: 'bg-orange-200 text-orange-900',
};

const classToColorMap: Record<string, CorAnotacao> = {
  'bg-yellow-200 text-yellow-900': 'amarelo',
  'bg-blue-200 text-blue-900': 'azul',
  'bg-green-200 text-green-900': 'verde',
  'bg-pink-200 text-pink-900': 'rosa',
  'bg-purple-200 text-purple-900': 'roxo',
  'bg-orange-200 text-orange-900': 'laranja',
};

function normalizeSemanticColor(input: string): CorAnotacao {
  if (classToColorMap[input]) {
    return classToColorMap[input];
  }
  if (['amarelo', 'azul', 'verde', 'rosa', 'roxo', 'laranja'].includes(input.toLowerCase())) {
    return input.toLowerCase() as CorAnotacao;
  }
  return 'amarelo';
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { barbeariaId, userId, loading: barbLoading } = useBarbearia();

  const fetchNotes = useCallback(async () => {
    if (!barbeariaId) {
      if (!barbLoading) {
        setNotes([]);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('anotacoes')
        .select('*')
        .eq('barbearia_id', barbeariaId)
        .order('criado_em', { ascending: false });

      if (err) {
        setError(err.message);
      } else {
        const normalized: Note[] = (data || []).map((n: any) => {
          const corSemantica = normalizeSemanticColor(n.cor || 'amarelo');
          const cssClass = colorToClassMap[corSemantica] || 'bg-yellow-200 text-yellow-900';
          return {
            ...n,
            cor: corSemantica,
            user_id: n.perfil_id || n.id,
            content: n.conteudo,
            color: cssClass,
            created_at: n.criado_em,
          };
        });
        setNotes(normalized);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [barbeariaId, barbLoading]);

  useEffect(() => {
    fetchNotes();

    if (!barbeariaId) return;

    const channelId = `anotacoes-${barbeariaId}-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'anotacoes',
          filter: `barbearia_id=eq.${barbeariaId}`
        },
        () => fetchNotes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbeariaId, fetchNotes]);

  const addNote = async (content: string, colorClassOrName: string) => {
    if (!barbeariaId) throw new Error('Barbearia não autenticada');

    const corSemantica = normalizeSemanticColor(colorClassOrName);

    const payload = {
      barbearia_id: barbeariaId,
      perfil_id: userId || null,
      conteudo: content,
      cor: corSemantica,
    };

    const { error: err } = await supabase
      .from('anotacoes')
      .insert([payload]);

    if (err) throw err;
    await fetchNotes();
  };

  const deleteNote = async (id: string) => {
    const { error: err } = await supabase
      .from('anotacoes')
      .delete()
      .eq('id', id);
    if (err) throw err;
    await fetchNotes();
  };

  return { notes, loading, error, addNote, deleteNote, refetch: fetchNotes };
}
