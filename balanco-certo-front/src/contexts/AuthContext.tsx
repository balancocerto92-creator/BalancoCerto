// src/contexts/AuthContext.tsx

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';

// Define o tipo do valor que o contexto irá fornecer
interface AuthContextType {
  session: Session | null;
  loading: boolean;
}

// Cria o contexto com um valor padrão inicial
const AuthContext = createContext<AuthContextType>({ session: null, loading: true });

// Cria o Provedor do Contexto
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChange é disparado imediatamente com a sessão inicial (se houver)
    // e depois para cada mudança (login/logout). É a única fonte de verdade que precisamos.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // Limpa a inscrição quando o componente é desmontado
    return () => subscription.unsubscribe();
  }, []); // O array vazio garante que isso rode apenas uma vez

  const value = {
    session,
    loading,
  };

  // Não renderiza nada até que o carregamento inicial da sessão seja concluído
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Cria um hook customizado para usar o contexto facilmente
export const useAuth = () => {
  return useContext(AuthContext);
};