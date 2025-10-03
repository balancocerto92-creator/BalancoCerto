// src/components/AddCardModal.tsx

import { useState } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import './AddCardModal.css';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardAdded: () => void;
}

const AddCardModal: React.FC<AddCardModalProps> = ({ isOpen, onClose, onCardAdded }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados do formulário
  const [name, setName] = useState('');
  const [cardBrand, setCardBrand] = useState('');
  const [cardColor, setCardColor] = useState('#4B5563'); // Cinza escuro como padrão
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');

  const clearForm = () => {
    setName(''); setCardBrand(''); setCardColor('#4B5563');
    setClosingDay(''); setDueDay(''); setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado.");
      const token = session.access_token;

      const cardData = {
        name,
        card_brand: cardBrand,
        card_color: cardColor,
        closing_day: parseInt(closingDay),
        due_day: parseInt(dueDay)
      };

      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/credit-cards`, cardData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      clearForm();
      onCardAdded(); // Avisa o componente pai para recarregar a lista
      onClose(); // Fecha o modal
    } catch (err) {
      setError("Erro ao salvar o cartão. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header-custom">
          <h3>Adicionar Novo Cartão</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="transaction-form">
          <div className="form-group">
            <label htmlFor="card-name">Nome do Cartão</label>
            <input id="card-name" type="text" placeholder="Ex: Nubank Roxinho" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label htmlFor="card-brand">Bandeira (Opcional)</label>
              <input id="card-brand" type="text" placeholder="Ex: Mastercard" value={cardBrand} onChange={e => setCardBrand(e.target.value)} />
            </div>
             <div className="form-group">
              <label htmlFor="card-color">Cor</label>
              <div className="color-picker-wrapper">
                <input id="card-color" type="color" className="color-picker-input" value={cardColor} onChange={e => setCardColor(e.target.value)} />
                <span className="color-hex-value">{cardColor.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label htmlFor="card-closing">Dia do Fechamento</label>
              <input id="card-closing" type="number" min="1" max="31" placeholder="Ex: 25" value={closingDay} onChange={e => setClosingDay(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="card-due">Dia do Vencimento</label>
              <input id="card-due" type="number" min="1" max="31" placeholder="Ex: 04" value={dueDay} onChange={e => setDueDay(e.target.value)} required />
            </div>
          </div>

          {error && <p className="form-error-message">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="cancel-button" onClick={onClose}>Cancelar</button>
            <button type="submit" className="cta-button" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Cartão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCardModal;