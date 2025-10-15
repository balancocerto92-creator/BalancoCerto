// src/contexts/AuthContext.tsx

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';

interface OrganizationData {
  created_at: string;
  trial_ends_at: string | null;
}

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  organizationData: OrganizationData | null;
  reloadOrganizationData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  session: null, 
  loading: true, 
  organizationData: null, 
  reloadOrganizationData: async () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  console.log('AuthContext.tsx: AuthProvider component rendering...');
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);

  const fetchOrganizationData = useCallback(async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (profileError || !profileData?.organization_id) {
        console.error('Erro ao buscar organization_id do perfil:', profileError);
        setOrganizationData(null);
        return;
      }

      const organizationId = profileData.organization_id;

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('created_at, trial_ends_at')
        .eq('id', organizationId)
        .single();

      if (orgError || !orgData) {
        console.error('Erro ao buscar dados da organização:', orgError);
        setOrganizationData(null);
        return;
      }
      setOrganizationData(orgData);
    } catch (error) {
      console.error('Erro geral ao buscar dados da organização:', error);
      setOrganizationData(null);
    }
  }, []);

  const reloadOrganizationData = useCallback(async () => {
    if (session?.user?.id) {
      await fetchOrganizationData(session.user.id);
    }
  }, [session?.user?.id, fetchOrganizationData]);

  useEffect(() => {
    console.log('AuthContext.tsx: AuthProvider useEffect for auth state change.');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      console.log('AuthContext.tsx: Auth state changed. Event:', _event, 'Session:', currentSession);
      setSession(currentSession);
      if (currentSession?.user?.id) {
        console.log('AuthContext.tsx: User ID found, fetching organization data.');
        await fetchOrganizationData(currentSession.user.id);
      } else {
        console.log('AuthContext.tsx: No user ID, clearing organization data.');
        setOrganizationData(null);
      }
      setLoading(false);
      console.log('AuthContext.tsx: Loading set to false.');
    });

    return () => {
      subscription.unsubscribe();
      console.log('AuthContext.tsx: Auth state change subscription unsubscribed.');
    };
  }, [fetchOrganizationData]);

  const value = {
    session,
    loading,
    organizationData,
    reloadOrganizationData,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};