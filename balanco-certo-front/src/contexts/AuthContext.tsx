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
    console.log('AuthContext.tsx: Starting fetchOrganizationData for userId:', userId);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();

      if (profileError || !profileData?.organization_id) {
        console.error('AuthContext.tsx: Erro ao buscar organization_id do perfil:', profileError);
        setOrganizationData(null);
        return;
      }

      const organizationId = profileData.organization_id;
      console.log('AuthContext.tsx: organizationId found:', organizationId);

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('created_at, trial_ends_at')
        .eq('id', organizationId)
        .single();

      if (orgError || !orgData) {
        console.error('AuthContext.tsx: Erro ao buscar dados da organização:', orgError);
        setOrganizationData(null);
        return;
      }
      setOrganizationData(orgData);
      console.log('AuthContext.tsx: Organization data fetched successfully:', orgData);
    } catch (error) {
      console.error('AuthContext.tsx: Erro geral ao buscar dados da organização:', error);
      setOrganizationData(null);
    } finally {
      console.log('AuthContext.tsx: fetchOrganizationData finished. Setting loading to false.');
      setLoading(false);
    }
  }, []);

  const reloadOrganizationData = useCallback(async () => {
    if (session?.user?.id) {
      console.log('AuthContext.tsx: Reloading organization data.');
      await fetchOrganizationData(session.user.id);
    }
  }, [session?.user?.id, fetchOrganizationData]);

  useEffect(() => {
    console.log('AuthContext.tsx: AuthProvider useEffect for auth state change.');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      console.log('AuthContext.tsx: Auth state changed. Event:', _event, 'Session:', currentSession);
      setSession(currentSession);
      if (currentSession?.user?.id) {
        console.log('AuthContext.tsx: User ID found, initiating fetchOrganizationData.');
        // fetchOrganizationData will set loading to false in its finally block
        await fetchOrganizationData(currentSession.user.id);
      } else {
        console.log('AuthContext.tsx: No user ID, clearing organization data and setting loading to false.');
        setOrganizationData(null);
        setLoading(false); // Ensure loading is set to false when no user ID
      }
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