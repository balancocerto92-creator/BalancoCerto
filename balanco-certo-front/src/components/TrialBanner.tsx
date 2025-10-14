// src/components/TrialBanner.tsx
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './TrialBanner.css';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { getTrialStatus } from '../utils/trial';

const TrialBanner: React.FC = () => {
  const { session } = useAuth();
  const [trialExpired, setTrialExpired] = useState(false);
  const [remainingDays, setRemainingDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrialStatus = async () => {
      setLoading(true);
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profileData?.organization_id) {
          console.error('Erro ao buscar organization_id do perfil:', profileError);
          setLoading(false);
          return;
        }

        const organizationId = profileData.organization_id;

        const { data: organizationData, error: organizationError } = await supabase
          .from('organizations')
          .select('created_at, trial_ends_at')
          .eq('id', organizationId)
          .single();

        if (organizationError || !organizationData) {
          console.error('Erro ao buscar dados da organização:', organizationError);
          setLoading(false);
          return;
        }

        const createdAtStr = organizationData.created_at;
        const trialEndsAtStr = organizationData.trial_ends_at;

        if (createdAtStr) {
          const { expired, remainingDays } = getTrialStatus(createdAtStr, trialEndsAtStr);
          setTrialExpired(expired);
          setRemainingDays(remainingDays);
        }
      } catch (error) {
        console.error('Erro ao buscar status do trial:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrialStatus();
  }, [session]);

  if (loading || remainingDays === null) {
    return null; // Ou um spinner de carregamento
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className={trialExpired ? 'trial-banner expired' : 'trial-banner active'}>
      <div className="trial-content">
        {trialExpired ? (
          <>
            <span className="trial-title">Seu teste gratuito terminou.</span>
            <span className="trial-subtitle">Você pode continuar consultando seus dados, mas a criação de novas ações está bloqueada.</span>
            <Link to="/dashboard/finance?action=subscribe" className="trial-cta">Regularizar pagamento</Link>
          </>
        ) : (
          <>
            <span className="trial-title">Teste gratuito ativo</span>
            <span className="trial-subtitle">Faltam {remainingDays} {remainingDays === 1 ? 'dia' : 'dias'} do seu teste de 7 dias.</span>
            <Link to="/dashboard/finance" className="trial-cta">Assinar agora</Link>
          </>
        )}
      </div>
    </div>
  );
};

export default TrialBanner;