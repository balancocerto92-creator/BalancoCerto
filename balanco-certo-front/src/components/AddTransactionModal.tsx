// src/components/AddTransactionModal.tsx

import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import './AddTransactionModal.css';

// Reutilizamos o tipo 'Transaction'
type Transaction = { id: number; created_at: string; description: string; amount: number; type: 'receita' | 'despesa'; organization_id: string; };

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionAdded: () => void;
  transactionToEdit: Transaction | null;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onTransactionAdded, transactionToEdit }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'receita' | 'despesa'>('despesa');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Efeito para pré-preencher o formulário no modo de edição
  useEffect(() => {
    if (transactionToEdit && isOpen) {
      setDescription(transactionToEdit.description);
      setAmount(String(transactionToEdit.amount));
      setType(transactionToEdit.type);
    } else {
      // Limpa o formulário se não estiver em modo de edição
      clearForm();
    }
  }, [transactionToEdit, isOpen]);

  const clearForm = () => {
    setDescription('');
    setAmount('');
    setType('despesa');
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
      const transactionData = { description, amount: parseFloat(amount), type };

      if (transactionToEdit) {
        // MODO DE EDIÇÃO (PUT)
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/transactions/${transactionToEdit.id}`;
        await axios.put(apiUrl, transactionData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        // MODO DE CRIAÇÃO (POST)
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/transactions`;
        await axios.post(apiUrl, transactionData, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      onTransactionAdded(); // Avisa o componente pai para recarregar a lista e fechar o modal
      
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
            <label htmlFor="description">Descrição</label>
            <input 
              id="description"
              type="text" 
              placeholder="Ex: Pagamento de fornecedor"
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="amount">Valor (R$)</label>
            <input 
              id="amount"
              type="number" 
              step="0.01"
              placeholder="0.00"
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Tipo</label>
            <div className="type-selector">
              <label className={type === 'receita' ? 'selected' : ''}>
                <input type="radio" value="receita" checked={type === 'receita'} onChange={() => setType('receita')} /> Receita
              </label>
              <label className={type === 'despesa' ? 'selected' : ''}>
                <input type="radio" value="despesa" checked={type === 'despesa'} onChange={() => setType('despesa')} /> Despesa
              </label>
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