// src/components/AddTransactionModal.tsx
// VERSÃO 100% COMPLETA E CORRIGIDA

import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import { getTrialStatus } from '../utils/trial';
import './AddTransactionModal.css';

// Helper seguro para converter qualquer valor de data em formato de input (YYYY-MM-DD)
const toInputDate = (raw?: string): string => {
  if (!raw) return '';
  const str = String(raw);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str; // já está no formato correto
  let d = new Date(str);
  if (isNaN(d.getTime())) {
    // tenta tratar como data somente (YYYY-MM-DD) sem timezone
    d = new Date(`${str.substring(0, 10)}T00:00:00Z`);
  }
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

// Soma meses em uma data string (YYYY-MM-DD) com segurança em UTC
const addMonthsToDateString = (dateStr: string, months: number): string => {
  const [y, m, d] = (dateStr || '').split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCMonth(dt.getUTCMonth() + months);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

// Identifica faturas de cartão de crédito pelo padrão de descrição
const isCreditCardInvoiceDescription = (description?: string): boolean => {
  if (!description) return false;
  return /^Fatura\s.+\s-\s.+$/.test(description.trim());
};

type Transaction = { 
  id: number; 
  created_at: string; 
  description: string; 
  amount: number; 
  type: 'receita' | 'despesa'; 
  organization_id: string; 
  category_id?: string;
  status?: 'pago' | 'pendente';
  due_date?: string;
  transaction_date: string;
  payment_date?: string;
  entry_date?: string;
};
type Category = { id: string; name: string; };

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionAdded: () => void;
  transactionToEdit: Transaction | null;
  categories: Category[];
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onTransactionAdded, transactionToEdit, categories }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'receita' | 'despesa'>('despesa');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [status, setStatus] = useState<'pago' | 'pendente'>('pago');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [createdAt, setCreatedAt] = useState(new Date().toISOString().split('T')[0]);

  // Parcelamento de boletos/lançamentos
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState('');

  // Flag: é fatura de cartão?
  const isInvoice = !!(transactionToEdit && isCreditCardInvoiceDescription(transactionToEdit.description));

  useEffect(() => {
    if (transactionToEdit && isOpen) {
      setDescription(transactionToEdit.description);
      setAmount(String(transactionToEdit.amount));
      setType(transactionToEdit.type);
      setCategoryId(transactionToEdit.category_id);
      setStatus(transactionToEdit.status || 'pago');
      setTransactionDate(
        toInputDate(
          (transactionToEdit as any).payment_date ||
          transactionToEdit.transaction_date ||
          (transactionToEdit as any).entry_date ||
          transactionToEdit.created_at
        ) || new Date().toISOString().split('T')[0]
      );
      setDueDate(toInputDate(transactionToEdit.due_date) || '');
      setCreatedAt(
        toInputDate((transactionToEdit as any).entry_date || transactionToEdit.created_at) ||
        new Date().toISOString().split('T')[0]
      );
    } else {
      clearForm();
    }
  }, [transactionToEdit, isOpen]);

  const clearForm = () => {
    setDescription('');
    setAmount('');
    setType('despesa');
    setCategoryId(undefined);
    setStatus('pago');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setCreatedAt(new Date().toISOString().split('T')[0]);
    setError('');
    setIsInstallment(false);
    setTotalInstallments('');
  };

  const handleCloseModal = () => {
    clearForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado.");

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profileData?.organization_id) {
        console.error('Erro ao buscar organization_id do perfil:', profileError);
        throw new Error("Não foi possível obter o ID da organização.");
      }

      const organizationId = profileData.organization_id;

      const { data: organizationData, error: organizationError } = await supabase
        .from('organizations')
        .select('created_at, trial_ends_at')
        .eq('id', organizationId)
        .single();

      if (organizationError || !organizationData) {
        console.error('Erro ao buscar dados da organização:', organizationError);
        throw new Error("Não foi possível obter os dados da organização.");
      }

      const createdAtStr = organizationData.created_at;
      const trialEndsAtStr = organizationData.trial_ends_at;

      if (createdAtStr) {
        const { expired } = getTrialStatus(createdAtStr, trialEndsAtStr);
        if (expired && !transactionToEdit) {
          setError('Seu teste gratuito de 7 dias terminou. Para continuar criando novos lançamentos, acesse Configurações Financeiras para regularizar seu plano.');
          setLoading(false);
          return;
        }
      }
      
      const token = session.access_token;
      
      const transactionData = { 
        description, 
        amount: isInvoice && transactionToEdit ? transactionToEdit.amount : parseFloat(amount), 
        type,
        category_id: categoryId || null,
        status,
        transaction_date: status === 'pago' ? transactionDate : dueDate,
        due_date: status === 'pendente' ? dueDate : null,
        created_at: createdAt,
        entry_date: createdAt
      };

      if (!transactionData.transaction_date) {
        setError('Por favor, informe uma data válida.');
        setLoading(false);
        return;
      }

      if (transactionToEdit) {
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/transactions/${transactionToEdit.id}`;
        await axios.put(apiUrl, transactionData, { headers: { 'Authorization': `Bearer ${token}` } });
      } else {
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/transactions`;
        const total = isInstallment ? parseInt(totalInstallments || '0', 10) : 0;
        if (isInstallment && total > 1) {
          const baseDate = status === 'pendente' ? dueDate : transactionDate;
          if (!baseDate) {
            setError('Informe a data base (vencimento ou pagamento) para gerar as parcelas.');
            setLoading(false);
            return;
          }
          const requests = Array.from({ length: total }).map((_, idx) => {
            const dt = addMonthsToDateString(baseDate, idx);
            const body = {
              ...transactionData,
              description: `${description} - Parcela ${idx + 1}/${total}`,
              transaction_date: dt,
              due_date: status === 'pendente' ? dt : null,
              created_at: dt,
              entry_date: dt,
            };
            return axios.post(apiUrl, body, { headers: { 'Authorization': `Bearer ${token}` } });
          });
          await Promise.all(requests);
        } else {
          await axios.post(apiUrl, transactionData, { headers: { 'Authorization': `Bearer ${token}` } });
        }
      }

      onTransactionAdded();
      
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || "Não foi possível salvar.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro inesperado.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={handleCloseModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-custom">
          <h3>{transactionToEdit ? 'Editar Lançamento' : 'Adicionar Novo Lançamento'}</h3>
          <button className="close-button" onClick={handleCloseModal}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="transaction-form">
          <div className="form-group">
            <label>Status</label>
            <div className="type-selector">
              <label className={status === 'pago' ? 'selected' : ''}>
                <input type="radio" value="pago" checked={status === 'pago'} onChange={() => setStatus('pago')} /> Pago
              </label>
              <label className={status === 'pendente' ? 'selected' : ''}>
                <input type="radio" value="pendente" checked={status === 'pendente'} onChange={() => setStatus('pendente')} /> Pendente
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Descrição</label>
            <input id="description" type="text" placeholder="Ex: Pagamento de fornecedor" value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          
          <div className="form-group-row">
            {/* Coluna da Esquerda */}
            <div className="form-column">
              <div className="form-group">
                  <label htmlFor="amount">Valor (R$)</label>
                  <input id="amount" type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required disabled={isInvoice} title={isInvoice ? 'Valor bloqueado para faturas de cartão' : undefined} />
              </div>
              <div className="form-group">
                  <label>Tipo</label>
                  <div className="type-selector">
                      <label className={type === 'receita' ? 'selected' : ''}><input type="radio" value="receita" checked={type === 'receita'} onChange={() => setType('receita')} /> Receita</label>
                      <label className={type === 'despesa' ? 'selected' : ''}><input type="radio" value="despesa" checked={type === 'despesa'} onChange={() => setType('despesa')} /> Despesa</label>
                  </div>
              </div>
            </div>
            {/* Coluna da Direita */}
            <div className="form-column">
              <div className="form-group">
                  <label htmlFor="category">Categoria</label>
                  <div className="custom-select-wrapper">
                      <select id="category" value={categoryId || ''} onChange={e => setCategoryId(e.target.value)} className="filter-select">
                          <option value="">Sem categoria</option>
                          {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                      </select>
                  </div>
              </div>
              <div className="form-group">
                  <label htmlFor="createdAt">Data de Cadastro</label>
                  <input id="createdAt" type="date" value={createdAt} onChange={e => setCreatedAt(e.target.value)} required />
              </div>
            </div>
          </div>
          
          <div className="form-group-row">
            <div className="form-column">
              {status === 'pendente' && (
                <div className="form-group">
                    <label htmlFor="dueDate">Data de Vencimento</label>
                    <input id="dueDate" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              )}
            </div>
            <div className="form-column">
              {status === 'pago' && (
                <div className="form-group">
                    <label htmlFor="transactionDate">Data de Pagamento</label>
                    <input id="transactionDate" type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} />
                </div>
              )}
            </div>
          </div>

          {/* Parcelamento de lançamentos (boletos) */}
          <div className="form-divider"></div>
          <div className="form-group-row">
            <div className="form-column">
              <div className="form-toggle">
                <input
                  type="checkbox"
                  id="is-installment-tx"
                  checked={isInstallment}
                  onChange={e => setIsInstallment(e.target.checked)}
                />
                <label htmlFor="is-installment-tx">É um lançamento parcelado?</label>
              </div>
            </div>
            {isInstallment && (
              <div className="form-column">
                <div className="form-group">
                  <label htmlFor="total-installments-tx">Total de Parcelas</label>
                  <input
                    id="total-installments-tx"
                    className="form-input"
                    type="number"
                    min="2"
                    placeholder="Ex: 6"
                    value={totalInstallments}
                    onChange={e => setTotalInstallments(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          
          {error && <p className="form-error-message">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="cancel-button" onClick={handleCloseModal}>
              Cancelar
            </button>
            <button type="submit" className="cta-button" disabled={loading}>
              {loading ? 'Salvando...' : (transactionToEdit ? 'Salvar Alterações' : 'Salvar Lançamento')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;