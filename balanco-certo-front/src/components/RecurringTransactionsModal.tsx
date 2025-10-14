// src/components/RecurringTransactionsModal.tsx
// VERSÃO 100% COMPLETA E CORRIGIDA para usar o input de data nativo do HTMLimport { useState, useEffect } from 'react';
import axios from 'axios';
import { getTrialStatus } from '../utils/trial';
import { NumericFormat } from 'react-number-format';
import { useAuth } from '../contexts/AuthContext';
import './RecurringTransactionsModal.css';// Removemos todas as dependências do react-datepicker

type Category = { id: string; name: string; };

type RecurringTransaction = {
  id: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  category_id?: string;
  frequency: 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  next_run_date: string;
};

interface RecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecurrenceChange: () => void;
  categories: Category[];
}

// Função auxiliar para formatar a data para o input (ex: 2025-10-03)
const getTodayString = () => new Date().toISOString().split('T')[0];

const RecurringTransactionsModal: React.FC<RecurringModalProps> = ({ isOpen, onClose, onRecurrenceChange, categories }) => {
    const { session, organizationData } = useAuth();
    const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'receita' | 'despesa'>('despesa');
    const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
    const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
    const [startDate, setStartDate] = useState<string>(getTodayString());
    const [editingRecurrence, setEditingRecurrence] = useState<RecurringTransaction | null>(null);
  
    const fetchRecurring = async () => {
      setLoading(true);
      setError('');
      try {
        if (!session) throw new Error("Usuário não autenticado.");
        const token = session.access_token;
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/recurring-transactions`, { headers: { 'Authorization': `Bearer ${token}` } });
        setRecurringTransactions(response.data);
      } catch (err) {
        setError("Não foi possível carregar as recorrências.");
      } finally {
        setLoading(false);
      }
    };
  
    useEffect(() => { if (isOpen) { fetchRecurring(); handleCancelEdit(); } }, [isOpen]);
  
    const clearForm = () => {
      setDescription(''); setAmount(''); setType('despesa'); setCategoryId(undefined);
      setFrequency('monthly'); setStartDate(getTodayString());
    };
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!startDate) { setError("A data de início é obrigatória."); return; }
      setLoading(true);
      setError('');
      try {
        if (!session) throw new Error("Usuário não autenticado.");
        if (!organizationData) throw new Error("Dados da organização não disponíveis.");

        const createdAtStr = organizationData.created_at;
        const trialEndsAtStr = organizationData.trial_ends_at;

        if (createdAtStr) {
          const { expired } = getTrialStatus(createdAtStr, trialEndsAtStr);
          if (expired && !editingRecurrence) {
            setError('Seu teste gratuito de 7 dias terminou. Para continuar criando novas recorrências, acesse Configurações Financeiras para regularizar seu plano.');
            setLoading(false);
            return;
          }
        }
        const token = session.access_token;
        const recurrenceData = {
          description, amount: parseFloat(amount), type,
          category_id: categoryId || null, frequency, start_date: startDate,
        };
        if (editingRecurrence) {
          const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/recurring-transactions/${editingRecurrence.id}`;
          await axios.put(apiUrl, recurrenceData, { headers: { 'Authorization': `Bearer ${token}` } });
        } else {
          const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/recurring-transactions`;
          await axios.post(apiUrl, recurrenceData, { headers: { 'Authorization': `Bearer ${token}` } });
        }
        handleCancelEdit();
        onRecurrenceChange();
        fetchRecurring();
      } catch (err) {
        setError("Erro ao salvar recorrência.");
      } finally {
        setLoading(false);
      }
    };
  
    const handleDelete = async (id: string) => {
      if (!window.confirm("Tem certeza que deseja apagar esta regra de recorrência?")) return;
      try {
        if (!session) throw new Error("Usuário não autenticado.");
        const token = session.access_token;
        await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/recurring-transactions/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        fetchRecurring();
      } catch (err) {
        setError("Erro ao apagar recorrência.");
      }
    };
  
    const handleStartEdit = (recurrence: RecurringTransaction) => {
      setEditingRecurrence(recurrence);
      setDescription(recurrence.description);
      setAmount(String(recurrence.amount));
      setType(recurrence.type);
      setCategoryId(recurrence.category_id);
      setFrequency(recurrence.frequency);
      setStartDate(recurrence.start_date.split('T')[0]);
    };
  
    const handleCancelEdit = () => {
      setEditingRecurrence(null);
      clearForm();
      setError('');
    };
  
    if (!isOpen) return null;
  
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content recurring-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header-custom">
            <h3>{editingRecurrence ? 'Editar Recorrência' : 'Lançamentos Recorrentes'}</h3>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="modal-body-custom">
            <h4>{editingRecurrence ? 'Alterar Dados da Recorrência' : 'Adicionar Nova Recorrência'}</h4>
            <form onSubmit={handleSubmit} className="category-form-stacked">
              <div className="form-group">
                <label htmlFor="rec-description">Descrição</label>
                <input id="rec-description" type="text" placeholder="Ex: Assinatura Netflix" value={description} onChange={e => setDescription(e.target.value)} required />
              </div>
              <div className="form-group-row">
                <div className="form-group"><label htmlFor="rec-amount">Valor (R$)</label><input id="rec-amount" type="number" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required /></div>
                <div className="form-group"><label htmlFor="rec-category">Categoria</label><div className="custom-select-wrapper"><select id="rec-category" value={categoryId || ''} onChange={e => setCategoryId(e.target.value)} className="filter-select"><option value="">Sem categoria</option>{categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}</select></div></div>
              </div>
              <div className="form-group-row">
                <div className="form-group"><label>Tipo</label><div className="type-selector"><label className={type === 'receita' ? 'selected' : ''}><input type="radio" value="receita" checked={type === 'receita'} onChange={() => setType('receita')} /> Receita</label><label className={type === 'despesa' ? 'selected' : ''}><input type="radio" value="despesa" checked={type === 'despesa'} onChange={() => setType('despesa')} /> Despesa</label></div></div>
                <div className="form-group"><label htmlFor="rec-frequency">Frequência</label><div className="custom-select-wrapper"><select id="rec-frequency" value={frequency} onChange={e => setFrequency(e.target.value as any)} className="filter-select"><option value="monthly">Mensal</option><option value="weekly">Semanal</option><option value="yearly">Anual</option></select></div></div>
              </div>
              <div className="form-group">
                <label htmlFor="rec-start-date">Data de Início</label>
                <input id="rec-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="date-picker-input" autoComplete="off" required />
              </div>
              <div className="form-actions">
                {editingRecurrence && (<button type="button" className="cancel-edit-button" onClick={handleCancelEdit}>Cancelar</button>)}
                <button type="submit" className="cta-button full-width" disabled={loading}>{loading ? 'Salvando...' : (editingRecurrence ? 'Salvar Alterações' : 'Criar Recorrência')}</button>
              </div>
            </form>
            {error && <p className="form-error-message">{error}</p>}
            <hr className="divider" />
            <h4>Recorrências Ativas</h4>
            <ul className="categories-list">
              {loading ? <p>Carregando...</p> : recurringTransactions.map(rec => (
                <li key={rec.id}><div className="category-info"><div className="info-item name-item"><span className="info-label">Descrição</span><span>{rec.description}</span></div><div className="info-item"><span className="info-label">Valor</span><span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.amount)}</span></div><div className="info-item"><span className="info-label">Próxima Execução</span><span>{new Date(rec.next_run_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span></div></div><div className="category-actions"><button type="button" className="icon-button" onClick={() => handleStartEdit(rec)} title="Editar">✏️</button><button type="button" className="icon-button delete-button" onClick={() => handleDelete(rec.id)} title="Excluir">🗑️</button></div></li>
              ))}
              {!loading && recurringTransactions.length === 0 && (<p className="empty-list-message">Nenhuma recorrência criada ainda.</p>)}
            </ul>
          </div>
        </div>
      </div>
    );
};

export default RecurringTransactionsModal;