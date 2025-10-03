// src/pages/CreditCardsPage.tsx
// VERSÃO 100% COMPLETA para listar e adicionar cartões

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import './CreditCardsPage.css';
import AddCardModal from '../components/AddCardModal';
import { CreditCardIcon } from '../components/Icons/Index';

type Card = {
  id: string;
  sequential_id: number;
  name: string;
  card_brand?: string;
  card_color: string;
  closing_day: number;
  due_day: number;
};

const CreditCardsPage = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchCards = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado.");
      const token = session.access_token;
      
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/credit-cards`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCards(response.data);
    } catch (err) {
      setError("Não foi possível carregar seus cartões.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  return (
    <>
      <div className="credit-cards-container">
        <header className="page-header">
          <h1>Meus Cartões de Crédito</h1>
          <div className="header-actions">
            <button className="cta-button" onClick={() => setModalOpen(true)}>
              + Adicionar Cartão
            </button>
          </div>
        </header>

        {loading && <p>Carregando cartões...</p>}
        {error && <p className="form-error-message">{error}</p>}
        
        {!loading && !error && (
          <div className="cards-grid">
            {cards.length > 0 ? cards.map(card => (
              <div 
                key={card.id} 
                className="credit-card-item" 
                style={{ borderLeftColor: card.card_color }}
                onClick={() => navigate(`/dashboard/credit-cards/${card.id}`)}
              >
                <div className="card-header">
                    <div className="card-icon"><CreditCardIcon /></div>
                    <span className="card-name">{card.name}</span>
                </div>
                <div className="card-details">
                    <span>Fecha dia: <strong>{card.closing_day}</strong></span>
                    <span>Vence dia: <strong>{card.due_day}</strong></span>
                </div>
              </div>
            )) : (
              <div className="content-placeholder">
                <p>Nenhum cartão de crédito cadastrado ainda.</p>
                <button className="cta-button" onClick={() => setModalOpen(true)}>
                    Cadastrar Primeiro Cartão
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AddCardModal 
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onCardAdded={fetchCards}
      />
    </>
  );
};

export default CreditCardsPage;