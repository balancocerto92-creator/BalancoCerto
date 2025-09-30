// src/components/CategoriesModal.tsx
// VERSÃO DEFINITIVA - 100% COMPLETA E CORRIGIDA

import { useState, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import './CategoriesModal.css';

type Category = {
  id: string; // UUID
  sequential_id: number;
  name: string;
  color: string;
};

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChange: () => void; // Para avisar a página pai que algo mudou
}

const CategoriesModal: React.FC<CategoriesModalProps> = ({ isOpen, onClose, onCategoriesChange }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#475569');

  const fetchCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado.");
      const token = session.access_token;

      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (err) {
      setError("Não foi possível carregar as categorias.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado.");
      const token = session.access_token;
      
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/categories`, 
        { name: newCategoryName, color: newCategoryColor },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setNewCategoryName(''); // Limpa o campo
      onCategoriesChange(); // Avisa a página de transações para recarregar
      fetchCategories(); // Recarrega a lista no modal
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError("Uma categoria com este nome já existe.");
      } else {
        setError("Erro ao criar a categoria.");
      }
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Tem certeza? Lançamentos que usam esta categoria ficarão sem categoria, mas não serão apagados.")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado.");
      const token = session.access_token;
      
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/categories/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      onCategoriesChange();
      fetchCategories();
    } catch (err) {
      setError("Erro ao deletar a categoria.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content category-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header-custom">
          <h3>Gerenciar Categorias</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body-custom">
          <form onSubmit={handleCreateCategory} className="category-form-stacked">
            <div className="form-group">
              <label htmlFor="category-name">Nome da Categoria</label>
              <input 
                id="category-name"
                type="text" 
                placeholder="Ex: Contas de Casa"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                required
                autoComplete="off" 
              />
            </div>

            <div className="form-group">
              <label htmlFor="category-color">Cor de Destaque</label>
              <div className="color-picker-wrapper">
                <input 
                  id="category-color"
                  type="color"
                  className="color-picker-input"
                  value={newCategoryColor}
                  onChange={e => setNewCategoryColor(e.target.value)}
                />
                <input
                  type="text"
                  className="color-hex-value"
                  value={newCategoryColor.toUpperCase()}
                  onChange={e => setNewCategoryColor(e.target.value)}
                  maxLength={7}
                />
              </div>
            </div>

            <button type="submit" className="cta-button full-width">
              Adicionar Nova Categoria
            </button>
          </form>

          {error && <p className="form-error-message">{error}</p>}
          
          <hr className="divider" />

          <ul className="categories-list">
            {loading ? <p>Carregando...</p> : categories.map(cat => (
              <li key={cat.id}>
                <div className="category-info">
                  <div className="info-item id-item">
                    <span className="info-label">ID</span>
                    <span className="category-id">#{String(cat.sequential_id).padStart(4, '0')}</span>
                  </div>
                  <div className="info-item name-item">
                    <span className="info-label">Nome</span>
                    <span className="category-tag" style={{ backgroundColor: cat.color }}>{cat.name}</span>
                  </div>
                </div>
                <button className="delete-button" onClick={() => handleDeleteCategory(cat.id)}>🗑️</button>
              </li>
            ))}
             {!loading && categories.length === 0 && (
                <p className="empty-list-message">Nenhuma categoria criada ainda.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CategoriesModal;