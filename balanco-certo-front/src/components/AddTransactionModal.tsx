// src/components/AddTransactionModal.tsx
// VERSÃO 100% COMPLETA E CORRIGIDA

import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import './AddTransactionModal.css';

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

  useEffect(() => {
    if (transactionToEdit && isOpen) {
      setDescription(transactionToEdit.description);
      setAmount(String(transactionToEdit.amount));
      setType(transactionToEdit.type);
      setCategoryId(transactionToEdit.category_id);
      setStatus(transactionToEdit.status || 'pago');
      setTransactionDate(new Date(transactionToEdit.transaction_date || transactionToEdit.created_at).toISOString().split('T')[0]);
      setDueDate(transactionToEdit.due_date ? new Date(transactionToEdit.due_date).toISOString().split('T')[0] : '');
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
    setError('');
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
      
      const token = session.access_token;
      
      const transactionData = { 
        description, 
        amount: parseFloat(amount), 
        type,
        category_id: categoryId || null,
        status,
        transaction_date: status === 'pago' ? transactionDate : dueDate,
        due_date: status === 'pendente' ? dueDate : null,
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
        await axios.post(apiUrl, transactionData, { headers: { 'Authorization': `Bearer ${token}` } });
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
                  <input id="amount" type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
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
                  {status === 'pago' ? (
                      <>
                          <label htmlFor="transactionDate">Data do Pagamento</label>
                          <input id="transactionDate" type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} required />
                      </>
                  ) : (
                      <>
                          <label htmlFor="dueDate">Data de Vencimento</label>
                          <input id="dueDate" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                      </>
                  )}
              </div>
            </div>
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