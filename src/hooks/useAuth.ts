import { useState, useEffect, useCallback } from 'react';
import { supabase, supabaseConfigured, type Profile } from '../lib/supabase';
import { clearBarbeariaCache, getBarbeariaAtual } from './useBarbearia';
import type { User } from '@supabase/supabase-js';

export interface AuthUser extends Partial<User> {
  id: string;
  email?: string;
  profile?: Profile;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const syncUser = useCallback(async (authUser: User | null) => {
    if (!authUser) {
      setUser(null);
      clearBarbeariaCache();
      return;
    }

    // Atualização otimista imediata para destravar a tela
    setUser(prev => prev || {
      id: authUser.id,
      email: authUser.email,
    });

    try {
      const barbeariaData = await getBarbeariaAtual(authUser);
      setUser({
        ...authUser,
        id: authUser.id,
        email: authUser.email,
        profile: barbeariaData.profile || {
          id: authUser.id,
          barbearia_id: barbeariaData.barbeariaId || '',
          nome: authUser.user_metadata?.nome || authUser.email?.split('@')[0] || 'Usuário',
          name: authUser.user_metadata?.nome || authUser.email?.split('@')[0] || 'Usuário',
          email: authUser.email || '',
          papel: 'dono',
          role: 'admin',
          ativo: true,
          criado_em: new Date().toISOString(),
        }
      });
    } catch (err) {
      console.error('Erro ao sincronizar usuário no useAuth:', err);
      setUser({
        ...authUser,
        id: authUser.id,
        email: authUser.email,
      });
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!supabaseConfigured) {
      setLoading(false);
      setUser(null);
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            syncUser(session.user);
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro no initAuth:', err);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        if (session?.user) {
          syncUser(session.user);
        } else {
          setUser(null);
          clearBarbeariaCache();
        }
        setLoading(false);
      }
    });

    const safetyTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 4000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [syncUser]);

  // ─── LOGIN ────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    if (!supabaseConfigured) {
      throw new Error('Supabase não configurado. Por favor, preencha o arquivo .env com suas credenciais.');
    }
    if (!email || !password) {
      throw new Error('Preencha e-mail e senha.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) throw error;
    if (data.user) {
      syncUser(data.user);
    }
    return data;
  }, [syncUser]);

  // ─── CADASTRO (SIGNUP) ────────────────────────────────────
  const register = useCallback(async (
    email: string, 
    password: string, 
    nome: string, 
    telefone?: string,
    nomeBarbearia?: string
  ) => {
    if (!supabaseConfigured) {
      throw new Error('Supabase não configurado. Configure as chaves no arquivo .env.');
    }
    if (!email || !password) {
      throw new Error('Preencha e-mail e senha.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNome = nome.trim() || cleanEmail.split('@')[0];
    const cleanBarbearia = (nomeBarbearia && nomeBarbearia.trim()) || `Barbearia de ${cleanNome}`;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          nome: cleanNome,
          telefone: telefone || '',
          nome_barbearia: cleanBarbearia,
        }
      }
    });

    if (error) throw error;
    if (data.user) {
      syncUser(data.user);
    }
    return data;
  }, [syncUser]);

  // ─── LOGOUT ───────────────────────────────────────────────
  const logout = useCallback(async () => {
    clearBarbeariaCache();
    setUser(null);
    if (supabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Erro ao deslogar do Supabase:', err);
      }
    }
  }, []);

  // ─── ATUALIZAR AVATAR ─────────────────────────────────────
  const updateAvatar = useCallback(async (avatarUrl: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('perfis')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (error) {
        console.error('Erro ao salvar avatar:', error);
      } else {
        setUser(prev => {
          if (!prev) return null;
          return {
            ...prev,
            profile: prev.profile ? { ...prev.profile, avatar_url: avatarUrl } : undefined
          };
        });
        clearBarbeariaCache();
      }
    } catch (e) {
      console.error('Erro inesperado no updateAvatar:', e);
    }
  }, [user?.id]);

  const isAuthenticated = !!user;

  return {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    updateAvatar,
  };
}
