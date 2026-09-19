import { useState, useEffect, useCallback } from 'react';
import { supabase, type StaffMember } from '../lib/supabase';
import { useBarbearia } from './useBarbearia';

export function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { barbeariaId, loading: barbLoading } = useBarbearia();

  const fetchStaff = useCallback(async () => {
    if (!barbeariaId) {
      if (!barbLoading) {
        setStaff([]);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('profissionais')
        .select('id, nome, especialidade, avatar_url, avaliacao_media, ativo, perfil_id, criado_em, barbearia_id')
        .eq('barbearia_id', barbeariaId)
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (err) {
        setError(err.message);
      } else {
        const normalized: StaffMember[] = (data || []).map((p: any) => ({
          ...p,
          name: p.nome,
          cargo: p.especialidade || 'Barbeiro',
          active: p.ativo,
          nota_avaliacao: Number(p.avaliacao_media ?? 5.0),
          avatar_url: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nome || 'Barbeiro')}&background=FF622B&color=fff`,
          profile: {
            id: p.perfil_id || p.id,
            barbearia_id: p.barbearia_id,
            nome: p.nome,
            name: p.nome,
            email: null,
            papel: 'barbeiro',
            role: 'barbeiro',
            avatar_url: p.avatar_url,
            ativo: p.ativo,
            criado_em: p.criado_em,
          }
        }));
        setStaff(normalized);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [barbeariaId, barbLoading]);

  useEffect(() => {
    fetchStaff();

    if (!barbeariaId) return;

    const channelId = `profissionais-${barbeariaId}-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'profissionais',
          filter: `barbearia_id=eq.${barbeariaId}`
        },
        () => fetchStaff()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbeariaId, fetchStaff]);

  const addStaff = async (staffData: {
    nome?: string;
    name?: string;
    cargo?: string;
    especialidade?: string;
    avatar_url?: string;
    ativo?: boolean;
    active?: boolean;
  }) => {
    if (!barbeariaId) throw new Error('Barbearia não identificada.');

    const nome = staffData.nome || staffData.name || 'Profissional';
    const especialidade = staffData.especialidade || staffData.cargo || 'Geral';
    const avatar_url = staffData.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=FF622B&color=fff`;

    const payload = {
      barbearia_id: barbeariaId,
      nome,
      especialidade,
      avatar_url,
      avaliacao_media: 5.0,
      ativo: staffData.ativo !== undefined ? staffData.ativo : (staffData.active !== undefined ? staffData.active : true),
    };

    const { error: err } = await supabase.from('profissionais').insert(payload);
    if (err) {
      console.error('Erro ao adicionar profissional:', err);
      throw new Error(err.message);
    }
    await fetchStaff();
  };

  const updateStaff = async (id: string, updates: Partial<StaffMember>) => {
    const mapped: any = {};
    if (updates.nome || updates.name) mapped.nome = updates.nome || updates.name;
    if (updates.especialidade || updates.cargo) mapped.especialidade = updates.especialidade || updates.cargo;
    if (updates.avatar_url) mapped.avatar_url = updates.avatar_url;
    if (updates.ativo !== undefined) mapped.ativo = updates.ativo;
    if (updates.active !== undefined) mapped.ativo = updates.active;

    const { error: err } = await supabase.from('profissionais').update(mapped).eq('id', id);
    if (err) throw err;
    await fetchStaff();
  };

  return { staff, loading, error, refetch: fetchStaff, addStaff, updateStaff };
}
