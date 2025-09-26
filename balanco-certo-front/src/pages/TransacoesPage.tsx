// src/pages/TransacoesPage.tsx
// Versão final consolidada em: 26 de Setembro de 2025

import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import './TransacoesPage.css';
import AddTransactionModal from '../components/AddTransactionModal';

type Transaction = {
  id: number;
  created_at: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  organization_id: string;
};

const TransacoesPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const fetchTransactions = async () => {
    if (transactions.length === 0) setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada.');
      
      const token = session.access_token;
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/transactions`;

      const response = await axios.get(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      setTransactions(response.data || []);

    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || 'Não foi possível carregar as transações.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro inesperado.');
      }
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleDelete = async (transactionId: number) => {
    if (!window.confirm('Tem certeza que deseja apagar este lançamento? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada.');
      const token = session.access_token;

      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/transactions/${transactionId}`;
      await axios.delete(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      fetchTransactions();

    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        alert(err.response.data.error || 'Não foi possível deletar o lançamento.');
      } else if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Ocorreu um erro inesperado ao deletar.');
      }
    }
  };

  const handleExport = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada.');
      const token = session.access_token;

      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/transactions/export`;
      
      const response = await axios.get(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'lancamentos.csv';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length === 2)
          fileName = fileNameMatch[1];
      }
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (err) {
      alert('Não foi possível exportar os dados.');
      console.error(err);
    }
  };

  const handleOpenEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingTransaction(null);
    setModalOpen(true);
  };

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      });
  }, [transactions, searchTerm, filterType]);

  const totalReceitas = useMemo(() => 
    transactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0),
    [transactions]
  );
  
  const totalDespesas = useMemo(() =>
    transactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0),
    [transactions]
  );

  const saldoAtual = totalReceitas - totalDespesas;

  return (
    <>
      <div className="transacoes-container">
        <header className="page-header">
          <h1>Lançamentos Financeiros</h1>
          <div className="header-actions">
            <button className="button-secondary" onClick={handleExport}>Exportar</button>
            <button className="cta-button" onClick={handleOpenCreateModal}>+ Adicionar Lançamento</button>
          </div>
        </header>

        <div className="kpi-cards-container">
          <div className="kpi-card">
            <span className="card-title">Total de Receitas</span>
            <span className="card-value receita">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceitas)}
            </span>
          </div>
          <div className="kpi-card">
            <span className="card-title">Total de Despesas</span>
            <span className="card-value despesa">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDespesas)}
            </span>
          </div>
          <div className="kpi-card">
            <span className="card-title">Saldo Atual</span>
            <span className="card-value">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoAtual)}
            </span>
          </div>
        </div>

        <div className="filter-bar">
          <input 
            type="text" 
            placeholder="🔍 Buscar por descrição..." 
            className="search-input" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <select 
            className="filter-select"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">Todos os tipos</option>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
          <select className="filter-select">
            <option value="date-desc">Ordenar por data</option>
          </select>
        </div>
        
        <div className="content-card">
          {loading && <p>Carregando transações...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          
          {!loading && !error && (
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Tipo</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(t => (
                    <tr key={t.id}>
                      <td>{t.description}</td>
                      <td>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}</td>
                      <td>
                        <span className={`tag ${t.type === 'receita' ? 'receita' : 'despesa'}`}>{t.type}</span>
                      </td>
                      <td>{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div className="action-icons">
                          <span onClick={() => handleOpenEditModal(t)} style={{cursor: 'pointer'}}>✏️</span>
                          <span onClick={() => handleDelete(t.id)} style={{cursor: 'pointer'}}>🗑️</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>Nenhum lançamento encontrado para os filtros selecionados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddTransactionModal 
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        transactionToEdit={editingTransaction}
        onTransactionAdded={() => {
          setModalOpen(false);
          fetchTransactions(); 
        }}
      />
    </>
  );
};

export default TransacoesPage;