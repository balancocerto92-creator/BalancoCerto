// src/components/CategoriesModal.tsx
// VERSÃO ATUALIZADA com funcionalidade de EDITAR categorias

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
  onCategoriesChange: () => void;
}

const CategoriesModal: React.FC<CategoriesModalProps> = ({ isOpen, onClose, onCategoriesChange }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // --- ESTADOS DO FORMULÁRIO ---
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#475569');

  // NOVO: Estado para controlar qual categoria está em modo de edição
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

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
      // Garante que o formulário seja resetado ao abrir o modal
      handleCancelEdit(); 
    }
  }, [isOpen]);

  // Função unificada para lidar com submissão (Criação e Edição)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado.");
      const token = session.access_token;
      
      const categoryData = { name: formName, color: formColor };

      if (editingCategory) {
        // --- MODO DE EDIÇÃO (PUT) ---
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/categories/${editingCategory.id}`;
        await axios.put(apiUrl, categoryData, { headers: { 'Authorization': `Bearer ${token}` } });
      } else {
        // --- MODO DE CRIAÇÃO (POST) ---
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/categories`;
        await axios.post(apiUrl, categoryData, { headers: { 'Authorization': `Bearer ${token}` } });
      }

      handleCancelEdit(); // Limpa o formulário e sai do modo de edição
      onCategoriesChange(); 
      fetchCategories(); 
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError("Uma categoria com este nome já existe.");
      } else {
        setError("Ocorreu um erro ao salvar a categoria.");
      }
    }
  };

  const handleDeleteCategory = async (id: string) => { /* ... (código existente, sem alterações) ... */ };

  // NOVO: Função para iniciar a edição
  const handleStartEdit = (category: Category) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormColor(category.color);
  };

  // NOVO: Função para cancelar a edição
  const handleCancelEdit = () => {
    setEditingCategory(null);
    setFormName('');
    setFormColor('#475569');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content category-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header-custom">
          <h3>{editingCategory ? 'Editar Categoria' : 'Gerenciar Categorias'}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body-custom">
          <form onSubmit={handleFormSubmit} className="category-form-stacked">
            <div className="form-group">
              <label htmlFor="category-name">Nome da Categoria</label>
              <input 
                id="category-name"
                type="text" 
                placeholder="Ex: Contas de Casa"
                value={formName}
                onChange={e => setFormName(e.target.value)}
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
                  value={formColor}
                  onChange={e => setFormColor(e.target.value)}
                />
                <input
                  type="text"
                  className="color-hex-value"
                  value={formColor.toUpperCase()}
                  onChange={e => setFormColor(e.target.value)}
                  maxLength={7}
                />
              </div>
            </div>

            {/* --- BOTÕES CONDICIONAIS --- */}
            <div className="form-actions">
              {editingCategory && (
                <button type="button" className="cancel-edit-button" onClick={handleCancelEdit}>
                  Cancelar
                </button>
              )}
              <button type="submit" className="cta-button full-width">
                {editingCategory ? 'Salvar Alterações' : 'Adicionar Nova Categoria'}
              </button>
            </div>
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
                <div className="category-actions">
                    <button className="icon-button" onClick={() => handleStartEdit(cat)} title="Editar">✏️</button>
                    <button className="icon-button delete-button" onClick={() => handleDeleteCategory(cat.id)} title="Excluir">🗑️</button>
                </div>
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