// src/components/TrialBanner.tsx
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './TrialBanner.css';

const daysBetween = (from: Date, to: Date) => {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.floor((to.getTime() - from.getTime()) / msPerDay);
  return diff;
};

const TrialBanner: React.FC = () => {
  const { session } = useAuth();
  const createdAtStr = session?.user?.created_at;

  if (!createdAtStr) return null;

  const createdAt = new Date(createdAtStr);
  const now = new Date();
  const elapsedDays = daysBetween(createdAt, now);
  const trialDays = 7;
  const remaining = Math.max(0, trialDays - elapsedDays);
  const expired = remaining === 0 && elapsedDays >= trialDays;

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
            <span className="trial-subtitle">Faltam {remaining} {remaining === 1 ? 'dia' : 'dias'} do seu teste de 7 dias.</span>
            <Link to="/dashboard/finance" className="trial-cta">Assinar agora</Link>
          </>
        )}
      </div>
    </div>
  );
};

export default TrialBanner;