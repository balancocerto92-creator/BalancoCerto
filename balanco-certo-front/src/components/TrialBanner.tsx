// src/components/TrialBanner.tsx
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './TrialBanner.css';
import { getTrialStatus } from '../utils/trial';

const TrialBanner: React.FC = () => {
  const { session, organizationData, loading: authLoading } = useAuth();

  if (authLoading || !session?.user || !organizationData) {
    return null; // Ou um spinner de carregamento
  }

  const { created_at: createdAtStr, trial_ends_at: trialEndsAtStr } = organizationData;

  if (!createdAtStr) return null;

  const { expired, remainingDays } = getTrialStatus(createdAtStr, trialEndsAtStr);

  return (
    <div className={expired ? 'trial-banner expired' : 'trial-banner active'}>
      <div className="trial-content">
        {expired ? (
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