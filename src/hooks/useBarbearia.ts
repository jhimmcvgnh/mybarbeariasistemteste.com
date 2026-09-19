import { useState, useEffect, useCallback } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import type { Profile, Barbearia } from '../types/database.types';

// Cache compartilhado globalmente entre todos os hooks e instâncias
let cachedSession: {
  userId: string;
  barbeariaId: string;
  profile: Profile | null;
  barbearia: Barbearia | null;
} | null = null;

let subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach(cb => cb());
}

export function clearBarbeariaCache() {
  cachedSession = null;
  notifySubscribers();
}

export async function getBarbeariaAtual(sessionUser?: any): Promise<{
  userId: string | null;
  barbeariaId: string | null;
  profile: Profile | null;
  barbearia: Barbearia | null;
}> {
  if (cachedSession) {
    return cachedSession;
  }

  if (!supabaseConfigured) {
    return { userId: null, barbeariaId: null, profile: null, barbearia: null };
  }

  try {
    let user = sessionUser;
    
    if (!user) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      user = authUser;
    }

    if (!user) {
      cachedSession = null;
      return { userId: null, barbeariaId: null, profile: null, barbearia: null };
    }

    // Busca perfil com barbearia_id
    const { data: perfil, error: perfilError } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (perfilError) {
      console.error('Erro ao buscar perfil do usuário:', perfilError);
    }

    let barbearia: Barbearia | null = null;
    let barbeariaId = perfil?.barbearia_id || null;

    // Se o perfil não tem barbearia_id, tenta buscar direto por dono_id
    if (!barbeariaId) {
      const { data: barbByDono } = await supabase
        .from('barbearias')
        .select('*')
        .eq('dono_id', user.id)
        .eq('ativo', true)
        .limit(1)
        .maybeSingle();

      if (barbByDono?.id) {
        barbeariaId = barbByDono.id;
        barbearia = barbByDono as Barbearia;
        // Atualiza o perfil no banco para não precisar buscar da próxima vez
        supabase.from('perfis').update({ barbearia_id: barbeariaId }).eq('id', user.id).then(() => {});
      }
    }

    if (!barbeariaId) {
      return { userId: user.id, barbeariaId: null, profile: null, barbearia: null };
    }

    if (!barbearia) {
      const { data: barbData, error: barbError } = await supabase
        .from('barbearias')
        .select('*')
        .eq('id', barbeariaId)
        .maybeSingle();

      if (!barbError && barbData) {
        barbearia = barbData as Barbearia;
      }
    }

    if (barbeariaId) {
      const normalizedProfile: Profile = {
        id: user.id,
        barbearia_id: barbeariaId,
        nome: perfil?.nome || user.email?.split('@')[0] || 'Usuário',
        name: perfil?.nome || user.email?.split('@')[0] || 'Usuário',
        email: perfil?.email || user.email || '',
        telefone: perfil?.telefone || null,
        phone: perfil?.telefone || null,
        papel: perfil?.papel || perfil?.cargo || 'dono',
        role: (perfil?.papel || perfil?.cargo) === 'dono' ? 'admin' : (perfil?.papel || perfil?.cargo || 'barbeiro'),
        avatar_url: perfil?.avatar_url || null,
        ativo: perfil?.ativo ?? true,
        criado_em: perfil?.criado_em || new Date().toISOString(),
        created_at: perfil?.criado_em || new Date().toISOString(),
      };

      cachedSession = {
        userId: user.id,
        barbeariaId,
        profile: normalizedProfile,
        barbearia,
      };

      notifySubscribers();
      return cachedSession;
    }

    return { userId: user.id, barbeariaId: null, profile: null, barbearia: null };
  } catch (err) {
    console.error('Falha ao resolver barbearia atual:', err);
    return { userId: null, barbeariaId: null, profile: null, barbearia: null };
  }
}

export function useBarbearia() {
  const [barbeariaId, setBarbeariaId] = useState<string | null>(cachedSession?.barbeariaId || null);
  const [userId, setUserId] = useState<string | null>(cachedSession?.userId || null);
  const [profile, setProfile] = useState<Profile | null>(cachedSession?.profile || null);
  const [barbearia, setBarbearia] = useState<Barbearia | null>(cachedSession?.barbearia || null);
  const [loading, setLoading] = useState<boolean>(!cachedSession);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      cachedSession = null;
      const res = await getBarbeariaAtual();
      setBarbeariaId(res.barbeariaId);
      setUserId(res.userId);
      setProfile(res.profile);
      setBarbearia(res.barbearia);
      if (res.userId && !res.barbeariaId) {
        setError('Nenhuma barbearia vinculada a esta conta.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const updateFromCache = () => {
      if (!isMounted) return;
      setBarbeariaId(cachedSession?.barbeariaId || null);
      setUserId(cachedSession?.userId || null);
      setProfile(cachedSession?.profile || null);
      setBarbearia(cachedSession?.barbearia || null);
      setLoading(false);
    };

    subscribers.add(updateFromCache);

    if (!cachedSession) {
      refresh();
    } else {
      setLoading(false);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        clearBarbeariaCache();
        if (isMounted) {
          setBarbeariaId(null);
          setUserId(null);
          setProfile(null);
          setBarbearia(null);
          setLoading(false);
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        refresh();
      }
    });

    return () => {
      isMounted = false;
      subscribers.delete(updateFromCache);
      authListener?.subscription?.unsubscribe();
    };
  }, [refresh]);

  return {
    barbeariaId,
    userId,
    profile,
    barbearia,
    loading,
    error,
    refresh,
  };
}
