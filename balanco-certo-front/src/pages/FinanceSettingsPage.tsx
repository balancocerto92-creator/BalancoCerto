// src/pages/FinanceSettingsPage.tsx
import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom'; // Importar useLocation
import axios from 'axios';
import { supabase } from '../supabaseClient';
import { getTrialStatus } from '../utils/trial';
import './FinanceSettingsPage.css';

type Transaction = {
  id: number;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  status?: 'pago' | 'pendente';
  due_date?: string;
  transaction_date: string;
};

const isInvoiceDescription = (description?: string): boolean => {
  if (!description) return false;
  return /^Fatura\s.+\s-\s.+$/.test(description.trim());
};

const FinanceSettingsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trialExpired, setTrialExpired] = useState(false);
  const [remainingDays, setRemainingDays] = useState<number | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const location = useLocation(); // Hook para acessar a URL

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profileData?.organization_id) {
          console.error('Erro ao buscar organization_id do perfil:', profileError);
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
          return;
        }

        const createdAtStr = organizationData.created_at;
        const trialEndsAtStr = organizationData.trial_ends_at;

        if (createdAtStr) {
          const { expired, remainingDays } = getTrialStatus(createdAtStr, trialEndsAtStr);
          setTrialExpired(expired);
          setRemainingDays(remainingDays);
        }
        setLoading(true);
        const token = session.access_token;
        const resp = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/transactions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setTransactions(resp.data || []);
      } catch (err) {
        setError('Não foi possível carregar suas faturas.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleSubscribe = useCallback(async () => {
    try {
      setSubscribing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Você precisa estar autenticado para assinar.');
        setSubscribing(false);
        return;
      }

      const { data: { url }, error: checkoutError } = await supabase.functions.invoke('create-mercadopago-checkout', {
        body: { userId: session.user.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (checkoutError) {
        console.error('Erro ao criar checkout do Mercado Pago:', checkoutError);
        setError('Erro ao iniciar assinatura. Tente novamente.');
        setSubscribing(false);
        return;
      }

      if (url) {
        window.location.href = url;
      } else {
        setError('URL de checkout não recebida.');
        setSubscribing(false);
      }
    } catch (err) {
      console.error('Erro inesperado ao assinar:', err);
      setError('Erro inesperado. Tente novamente.');
      setSubscribing(false);
    }
  }, [setError, setSubscribing]);

  const invoices = transactions.filter(t => isInvoiceDescription(t.description));

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('action') === 'subscribe') {
      handleSubscribe();
    }
  }, [location.search]);

  return (
    <div className="finance-settings">
      <header className="finance-header">
        <h2>Configurações Financeiras</h2>
        {trialExpired ? (
          <p className="trial-warning">
            Seu teste gratuito terminou. Para continuar criando novas informações, regularize seu pagamento.
          </p>
        ) : (
          remainingDays !== null && (
            <p className="trial-info">Teste ativo: restam {remainingDays} {remainingDays === 1 ? 'dia' : 'dias'}.</p>
          )
        )}
        <div className="finance-actions">
          <button className="cta-button" onClick={handleSubscribe} disabled={subscribing}>
            {subscribing ? 'Redirecionando...' : 'Assinar agora'}
          </button>
        </div>
      </header>

      <section className="invoices-section">
        <h3>Faturas</h3>
        {loading && <p>Carregando faturas...</p>}
        {error && <p className="form-error-message">{error}</p>}
        {!loading && invoices.length === 0 && (
          <p className="empty-list-message">Nenhuma fatura encontrada.</p>
        )}
        {!loading && invoices.length > 0 && (
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.description}</td>
                  <td>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.amount)}</td>
                  <td>{inv.status === 'pendente' ? 'Pendente' : 'Pago'}</td>
                  <td>{(inv.status === 'pendente' ? inv.due_date : inv.transaction_date)?.split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default FinanceSettingsPage;