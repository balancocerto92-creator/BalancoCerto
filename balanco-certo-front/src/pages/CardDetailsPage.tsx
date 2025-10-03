// src/pages/CardDetailsPage.tsx
// VERSÃO 100% COMPLETA com seletor de mês NATIVO DO HTML

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import './CardDetailsPage.css';
import { CreditCardIcon } from '../components/Icons/CreditCardIcon';
import AddCardPurchaseModal from '../components/AddCardPurchaseModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type CardDetails = {
  id: string;
  name: string;
  card_color: string;
};
type Purchase = {
  id: number;
  description: string;
  amount: number;
  purchase_date: string;
  category_id?: string;
  categories: { name: string; color: string; } | null;
  total_installments?: number;
  current_installment?: number;
};
type Category = { 
  id: string; 
  name: string; 
};

const CardDetailsPage = () => {
    const { cardId } = useParams<{ cardId: string }>();
    const navigate = useNavigate();
    
    const [cardDetails, setCardDetails] = useState<CardDetails | null>(null);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Estado simplificado para o input nativo (formato "YYYY-MM")
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  
    const [isPurchaseModalOpen, setPurchaseModalOpen] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  
    const fetchData = async () => {
      if (!cardId) { setError("ID do cartão não encontrado."); setLoading(false); return; }
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Usuário não autenticado.");
        const token = session.access_token;
        const headers = { Authorization: `Bearer ${token}` };
  
        const [cardRes, purchasesRes, categoriesRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/credit-cards/${cardId}`, { headers }),
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/credit-card-purchases?card_id=${cardId}`, { headers }),
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/categories`, { headers })
        ]);
  
        setCardDetails(cardRes.data);
        setPurchases(purchasesRes.data);
        setCategories(categoriesRes.data);
      } catch (err) {
        setError("Não foi possível carregar os dados do cartão.");
      } finally {
        setLoading(false);
      }
    };
  
    useEffect(() => {
      fetchData();
    }, [cardId]);
    
    // Lógica de filtro ajustada para o formato "YYYY-MM"
    const filteredPurchases = useMemo(() => {
      if (!selectedMonth) return purchases;
      return purchases.filter(p => p.purchase_date.substring(0, 7) === selectedMonth);
    }, [purchases, selectedMonth]);
  
    const handlePurchaseAdded = async () => { fetchData(); };
    const handleOpenEditModal = (purchase: Purchase) => { setEditingPurchase(purchase); setPurchaseModalOpen(true); };
    const handleDeletePurchase = async (purchaseId: number) => {
      if (!window.confirm("Tem certeza que deseja apagar esta compra?")) return;
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("Usuário não autenticado.");
          const token = session.access_token;
          await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/credit-card-purchases/${purchaseId}`, { headers: { Authorization: `Bearer ${token}` } });
          handlePurchaseAdded();
      } catch(err) {
          alert("Erro ao apagar a compra.");
      }
    };
  
    if (loading) return <div>Carregando...</div>;
    if (error) return <div className="form-error-message">{error}</div>;
  
    const formatInvoiceTitle = (monthString: string) => {
      if (!monthString) return "Histórico de Compras";
      const [year, month] = monthString.split('-');
      const date = new Date(Number(year), Number(month) - 1);
      const title = format(date, "MMMM 'de' yyyy", { locale: ptBR });
      return title.charAt(0).toUpperCase() + title.slice(1);
    };
  
    return (
      <>
        <div className="card-details-container">
          <header className="page-header">
            <div className="card-title-header">
                <button onClick={() => navigate('/dashboard/credit-cards')} className="back-button-details" title="Voltar"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
                <div className="card-icon-large" style={{ backgroundColor: cardDetails?.card_color }}><CreditCardIcon /></div>
                <h1>{cardDetails?.name || 'Detalhes do Cartão'}</h1>
            </div>
            <div className="header-actions">
                <input type="month" className="month-input" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                <button className="cta-button" onClick={() => { setEditingPurchase(null); setPurchaseModalOpen(true); }}>+ Adicionar Compra</button>
            </div>
          </header>
          
          <div className="content-card">
              <h3>Fatura de {formatInvoiceTitle(selectedMonth)}</h3>
              <table>
                  <thead>
                      <tr>
                          <th>Data</th>
                          <th>Descrição</th>
                          <th>Categoria</th>
                          <th>Parcela</th>
                          <th>Valor</th>
                          <th>Ações</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filteredPurchases.length > 0 ? filteredPurchases.map(p => (
                          <tr key={p.id}>
                              <td>{new Date(p.purchase_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
                              <td>{p.description}</td>
                              <td>{p.categories ? (<span className="category-tag" style={{ backgroundColor: p.categories.color }}>{p.categories.name}</span>) : <span className="no-category-tag">N/A</span>}</td>
                              <td>{p.total_installments ? (<span className="installment-tag">{`${p.current_installment}/${p.total_installments}`}</span>) : ('—')}</td>
                              <td>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.amount)}</td>
                              <td><div className="action-icons"><span onClick={() => handleOpenEditModal(p)} title="Editar" style={{cursor: 'pointer'}}>✏️</span><span onClick={() => handleDeletePurchase(p.id)} title="Apagar" style={{cursor: 'pointer'}}>🗑️</span></div></td>
                          </tr>
                      )) : (
                          <tr><td colSpan={6}>Nenhuma compra encontrada para este mês.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
        </div>
  
        <AddCardPurchaseModal
          isOpen={isPurchaseModalOpen}
          onClose={() => { setPurchaseModalOpen(false); setEditingPurchase(null); }}
          onPurchaseAdded={handlePurchaseAdded}
          cardId={cardId!}
          categories={categories}
          purchaseToEdit={editingPurchase}
        />
      </>
    );
};
  
export default CardDetailsPage;