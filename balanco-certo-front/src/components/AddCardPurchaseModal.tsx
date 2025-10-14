// src/components/modals/AddCardPurchaseModal.tsx
// VERSÃO FINAL E DEFINITIVA usando input de data nativo do navegador

import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import { getTrialStatus } from '../utils/trial';
import { NumericFormat } from 'react-number-format';
import { useAuth } from '../contexts/AuthContext';
import './AddCardPurchaseModal.css';

// Removemos tudo do 'react-datepicker'

// ... (definições de type e interface continuam as mesmas) ...
type Purchase = {
  id: number;
  description: string;
  amount: number;
  purchase_date: string;
  category_id?: string;
  total_installments?: number;
  current_installment?: number;
};
type Category = { id: string; name: string; };
interface AddPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseAdded: () => void;
  cardId: string;
  categories: Category[];
  purchaseToEdit: Purchase | null;
}

// Função para formatar a data para o input (ex: 2025-10-02)
const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const addMonthsToDateString = (dateStr: string, months: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCMonth(dt.getUTCMonth() + months);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const AddCardPurchaseModal: React.FC<AddPurchaseModalProps> = ({ isOpen, onClose, onPurchaseAdded, cardId, categories, purchaseToEdit }) => {
  const { session, organizationData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | undefined>(undefined);
  
  // O estado da data agora armazena a string no formato YYYY-MM-DD
  const [purchaseDate, setPurchaseDate] = useState<string>(formatDateForInput(new Date()));

  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [isInstallment, setIsInstallment] = useState(false);
  const [totalInstallments, setTotalInstallments] = useState('');
  const [currentInstallment, setCurrentInstallment] = useState('');

  useEffect(() => {
    if (purchaseToEdit && isOpen) {
      setDescription(purchaseToEdit.description);
      setAmount(purchaseToEdit.amount);
      // Ajusta a data que vem do banco (YYYY-MM-DD) para o input
      setPurchaseDate(purchaseToEdit.purchase_date); 
      setCategoryId(purchaseToEdit.category_id);
      if (purchaseToEdit.total_installments) {
        setIsInstallment(true);
        setTotalInstallments(String(purchaseToEdit.total_installments));
        setCurrentInstallment(String(purchaseToEdit.current_installment || ''));
      } else {
        setIsInstallment(false);
      }
    } else {
      clearForm();
    }
  }, [purchaseToEdit, isOpen]);

  const clearForm = () => {
    setDescription('');
    setAmount(undefined);
    setPurchaseDate(formatDateForInput(new Date()));
    setCategoryId(undefined);
    setIsInstallment(false);
    setTotalInstallments('');
    setCurrentInstallment('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseDate || !amount) { setError("Todos os campos são obrigatórios."); return; }
    setLoading(true);
    setError('');
    try {
      if (!session) throw new Error("Usuário não autenticado.");
      if (!organizationData) throw new Error("Dados da organização não disponíveis.");

      const createdAtStr = organizationData.created_at;
      const trialEndsAtStr = organizationData.trial_ends_at;

      if (createdAtStr) {
        const { expired } = getTrialStatus(createdAtStr, trialEndsAtStr);
        if (expired && !purchaseToEdit) {
          setError('Seu teste gratuito de 7 dias terminou. Para continuar criando novas compras, acesse Configurações Financeiras para regularizar seu plano.');
          setLoading(false);
          return;
        }
      }
      const token = session.access_token;
      const purchaseData = {
        description,
        amount,
        purchase_date: purchaseDate, // O valor já está no formato correto
        category_id: categoryId || null,
        credit_card_id: cardId,
        total_installments: isInstallment && totalInstallments ? parseInt(totalInstallments) : null,
        current_installment: isInstallment && currentInstallments ? parseInt(currentInstallments) : null,
      };
      if (purchaseToEdit) {
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/credit-card-purchases/${purchaseToEdit.id}`, purchaseData, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        const total = isInstallment && totalInstallments ? parseInt(totalInstallments) : 0;
        if (isInstallment && total > 1) {
          const baseDate = purchaseDate;
          const requests = Array.from({ length: total }).map((_, idx) => {
            const body = {
              ...purchaseData,
              purchase_date: addMonthsToDateString(baseDate, idx),
              total_installments: total,
              current_installment: idx + 1,
            };
            return axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/credit-card-purchases`, body, { headers: { Authorization: `Bearer ${token}` } });
          });
          await Promise.all(requests);
        } else {
          await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/credit-card-purchases`, purchaseData, { headers: { Authorization: `Bearer ${token}` } });
        }
      }
      onPurchaseAdded();
      onClose();
    } catch (err) {
      setError("Erro ao salvar a compra. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content improved-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header-custom">
          <h3>{purchaseToEdit ? 'Editar Compra' : 'Adicionar Nova Compra'}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="transaction-form">
          <div className="form-group">
            <label htmlFor="purchase-description">Descrição</label>
            <input id="purchase-description" type="text" placeholder="Ex: Jantar no restaurante" value={description} onChange={e => setDescription(e.target.value)} required />
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label htmlFor="purchase-amount">Valor</label>
              <NumericFormat id="purchase-amount" className="form-input" thousandSeparator="." decimalSeparator="," prefix="R$ " placeholder="R$ 0,00" value={amount} onValueChange={(values) => setAmount(values.floatValue)} required />
            </div>
            <div className="form-group">
              <label htmlFor="purchase-date">Data da Compra</label>
              {/* SUBSTITUIÇÃO DO DATEPICKER PELO INPUT NATIVO */}
              <input 
                type="date" 
                id="purchase-date"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                className="form-input"
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="purchase-category">Categoria</label>
            <div className="custom-select-wrapper">
              <select id="purchase-category" value={categoryId || ''} onChange={e => setCategoryId(e.target.value)} className="filter-select">
                <option value="">Sem categoria</option>
                {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
              </select>
            </div>
          </div>

          <div className="form-divider"></div>
          
          <div className="form-toggle">
            <input type="checkbox" id="is-installment-check" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} />
            <label htmlFor="is-installment-check">É uma compra parcelada?</label>
          </div>

          {isInstallment && (
            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="current-installment">Parcela Atual</label>
                <input id="current-installment" className="form-input" type="number" min="1" placeholder="Ex: 3" value={currentInstallment} onChange={e => setCurrentInstallment(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="total-installments">Total de Parcelas</label>
                <input id="total-installments" className="form-input" type="number" min="1" placeholder="Ex: 10" value={totalInstallments} onChange={e => setTotalInstallments(e.target.value)} />
              </div>
            </div>
          )}

          {error && <p className="form-error-message">{error}</p>}
          
          <div className="modal-actions">
            <button type="button" className="cancel-button" onClick={onClose}>Cancelar</button>
            <button type="submit" className="cta-button" disabled={loading}>
              {loading ? 'Salvando...' : (purchaseToEdit ? 'Salvar Alterações' : 'Salvar Compra')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCardPurchaseModal;