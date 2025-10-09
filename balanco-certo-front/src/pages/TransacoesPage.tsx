// src/pages/TransacoesPage.tsx
// VERSÃO 100% COMPLETA com colunas de data separadas

import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale/pt-BR';
import 'react-datepicker/dist/react-datepicker.css';
import './TransacoesPage.css';

import AddTransactionModal from '../components/AddTransactionModal';
import CategoriesModal from '../components/CategoriesModal';
import RecurringTransactionsModal from '../components/RecurringTransactionsModal';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../contexts/ToastContext';

registerLocale('pt-BR', ptBR);

// Normaliza qualquer valor de data para o formato "YYYY-MM-DD"
const normalizeDateStr = (raw: any): string | null => {
  if (!raw) return null;
  const str = String(raw);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  let d = new Date(str);
  if (isNaN(d.getTime())) {
    // tenta extrair os 10 primeiros caracteres como YYYY-MM-DD
    const maybe = str.substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(maybe)) return maybe;
    d = new Date(`${maybe}T00:00:00Z`);
  }
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
};

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
  payment_date?: string;
  entry_date?: string;
};

type Category = {
  id: string;
  name: string;
  color: string;
};

const ITEMS_PER_PAGE = 10;

const formatTransactionId = (id: number) => `#${String(id).padStart(4, '0')}`;

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const TransacoesPage = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [helpVisible, setHelpVisible] = useState(false);

  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);
  const [isCategoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [isRecurringModalOpen, setRecurringModalOpen] = useState(false);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const { showToast } = useToast();

  // Estados de filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState('thisMonth');
  const [customMonth, setCustomMonth] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async () => {
    if (!loading) setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada.');
      const token = session.access_token;
      const [transRes, catRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/transactions`, { headers: { 'Authorization': `Bearer ${token}` } }),
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/categories`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      setTransactions(transRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      setError('Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openDeleteConfirm = (transactionId: number) => {
    setConfirmDeleteId(transactionId);
  };

  const performDelete = async () => {
    if (confirmDeleteId == null) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada.');
      const token = session.access_token;
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/transactions/${confirmDeleteId}`;
      await axios.delete(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      showToast({ type: 'error', message: 'Ocorreu um erro ao deletar o lançamento.' });
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleExport = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada.');
      const token = session.access_token;
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/transactions/export`;
      const response = await axios.get(apiUrl, { headers: { 'Authorization': `Bearer ${token}` }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'lancamentos.csv';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length === 2) fileName = fileNameMatch[1];
      }
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      showToast({ type: 'error', message: 'Não foi possível exportar os dados.' });
      console.error(err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) return;
    setConfirmBulkOpen(true);
  };

  const performBulkDelete = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada.');
      const token = session.access_token;
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/transactions/bulk-delete`;
      await axios.post(apiUrl, { transactionIds: selectedTransactions }, { headers: { 'Authorization': `Bearer ${token}` } });
      setSelectedTransactions([]);
      fetchData();
    } catch (err) {
      showToast({ type: 'error', message: 'Ocorreu um erro ao tentar apagar os lançamentos.' });
    } finally {
      setConfirmBulkOpen(false);
    }
  };

  const handleMarkAsPaid = async (transaction: Transaction) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado.");
      const token = session.access_token;
      const transactionData = {
        ...transaction,
        status: 'pago',
        transaction_date: new Date().toISOString().split('T')[0]
      };
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/transactions/${transaction.id}`;
      await axios.put(apiUrl, transactionData, { headers: { 'Authorization': `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      showToast({ type: 'error', message: 'Não foi possível atualizar o lançamento.' });
    }
  };

  const handleOpenEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingTransaction(null);
    setTransactionModalOpen(true);
  };

  const pageTitle = useMemo(() => {
    const now = new Date();
    const formatOptions: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric', timeZone: 'UTC' };
    switch (dateFilter) {
      case 'all': return 'Todos os Lançamentos';
      case 'today': return 'Lançamentos de Hoje';
      case 'yesterday': return 'Lançamentos de Ontem';
      case 'last7days': return 'Lançamentos dos Últimos 7 Dias';
      case 'thisMonth': return `Lançamentos de ${now.toLocaleDateString('pt-BR', formatOptions)}`;
      case 'custom':
        if (customMonth) { return `Lançamentos de ${customMonth.toLocaleDateString('pt-BR', formatOptions)}`; }
        return 'Selecione um Mês';
      default: return 'Lançamentos Financeiros';
    }
  }, [dateFilter, customMonth]);

  const filteredTransactions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD em horário local
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');
    const todayYearMonth = todayStr.substring(0, 7);
    return transactions.filter(t => {
      if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        if (!t.description.toLowerCase().includes(lowerCaseSearchTerm) && !formatTransactionId(t.id).includes(lowerCaseSearchTerm)) return false;
      }
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterCategory !== 'all' && t.category_id !== filterCategory) return false;
      if (filterStatus !== 'all') {
        if (filterStatus === 'vencido') { if (t.status !== 'pendente' || !t.due_date || t.due_date >= todayStr) return false; }
        else if (filterStatus === 'pendente') { if (t.status !== 'pendente' || (t.due_date && t.due_date < todayStr)) return false; }
        else { if (t.status !== filterStatus) return false; }
      }
      // NOVA REGRA: o período SEMPRE é determinado pela Data de cadastro
      const entry = normalizeDateStr((t as any).entry_date);
      const created = normalizeDateStr(t.created_at);
      const effectiveDateStr = entry || created || null;
      if (!effectiveDateStr) return dateFilter === 'all'; // sem data: só aparece no filtro "Todo o período"
      // Construímos uma Date local sem UTC para evitar deslocamentos de timezone
      const transactionDate = new Date(`${effectiveDateStr}T00:00`);
      const effectiveYearMonth = effectiveDateStr.substring(0, 7);
      switch (dateFilter) {
        case 'today': return effectiveDateStr === todayStr;
        case 'yesterday': return effectiveDateStr === yesterdayStr;
        case 'last7days': {
          const diffMs = new Date(`${todayStr}T00:00`).getTime() - transactionDate.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 6;
        }
        case 'thisMonth': return effectiveYearMonth === todayYearMonth;
        case 'custom': { if (!customMonth) return true; const customYearMonth = new Date(customMonth).toLocaleDateString('en-CA').substring(0, 7); return effectiveYearMonth === customYearMonth; }
        default: return true;
      }
    });
  }, [transactions, searchTerm, filterType, filterCategory, dateFilter, customMonth, filterStatus]);

  const totalReceitas = useMemo(() =>
    filteredTransactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + t.amount, 0),
    [filteredTransactions]
  );

  const totalDespesas = useMemo(() =>
    filteredTransactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + t.amount, 0),
    [filteredTransactions]
  );

  const saldoAtual = totalReceitas - totalDespesas;

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedTransactions([]);
  }, [searchTerm, filterType, filterCategory, dateFilter, customMonth, filterStatus]);

  const handleSelectTransaction = (id: number) => {
    setSelectedTransactions(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    const currentPageIds = paginatedTransactions.map(t => t.id);
    const allSelectedOnPage = currentPageIds.length > 0 && currentPageIds.every(id => selectedTransactions.includes(id));
    if (allSelectedOnPage) {
      setSelectedTransactions(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedTransactions(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const renderStatusTag = (transaction: Transaction) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (transaction.status === 'pago') {
      return <span className="status-tag pago">Pago</span>;
    }
    if (transaction.status === 'pendente') {
      if (transaction.due_date && transaction.due_date < todayStr) {
        return <span className="status-tag vencido">Vencido</span>;
      }
      return <span className="status-tag pendente">Pendente</span>;
    }
    return null;
  };

  return (
    <>
      <div className="transacoes-container">
        <header className="page-header">
          <div className="page-title">
            <h1>{pageTitle}</h1>
            <div className={helpVisible ? 'help-hint open' : 'help-hint'} aria-live="polite">
              <button
                className="info-icon"
                title="Ajuda"
                aria-expanded={helpVisible}
                aria-controls="tx-help"
                onClick={() => setHelpVisible(v => !v)}
              >?
              </button>
              <div id="tx-help" className="info-bubble" role="dialog" aria-label="Ajuda – Lançamentos">
                <strong>Ajuda – Lançamentos</strong>
                <ul>
                  <li><b>Busca:</b> Filtra por descrição ou código do lançamento.</li>
                  <li><b>Tipo:</b> Receita ou Despesa.</li>
                  <li><b>Categoria:</b> Selecione para segmentar os resultados.</li>
                  <li><b>Status:</b> Pendente, Pago ou Vencido (com base no vencimento).</li>
                  <li><b>Período:</b> Usa a data de cadastro/entrada para compor o mês.</li>
                </ul>
                <p>Dica: combine filtros para análises mais precisas e use Exportar.</p>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button className="button-secondary" onClick={() => setRecurringModalOpen(true)}>Recorrências</button>
            <button className="button-secondary" onClick={() => setCategoriesModalOpen(true)}>Gerenciar Categorias</button>
            <button className="button-secondary" onClick={handleExport}>Exportar</button>
            <button className="cta-button" onClick={handleOpenCreateModal}>+ Adicionar Lançamento</button>
          </div>
        </header>

        <div className="kpi-cards-container">
          <div className="kpi-card"><span className="card-title">Total de Receitas</span><span className="card-value receita">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceitas)}</span></div>
          <div className="kpi-card"><span className="card-title">Total de Despesas</span><span className="card-value despesa">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDespesas)}</span></div>
          <div className="kpi-card"><span className="card-title">Saldo Atual</span><span className="card-value">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoAtual)}</span></div>
        </div>

        <div className="filter-bar">
          <div className="search-wrapper"><SearchIcon /><input type="text" placeholder="Buscar por descrição ou ID..." className="search-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
          <div className="custom-select-wrapper"><select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}><option value="all">Todos os tipos</option><option value="receita">Receita</option><option value="despesa">Despesa</option></select></div>
          <div className="custom-select-wrapper"><select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}><option value="all">Todas as categorias</option>{categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}</select></div>
          <div className="custom-select-wrapper"><select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="all">Todos os status</option><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="vencido">Vencido</option></select></div>
          <div className="custom-select-wrapper"><select className="filter-select" value={dateFilter} onChange={e => setDateFilter(e.target.value)}><option value="all">Todo o período</option><option value="today">Hoje</option><option value="yesterday">Ontem</option><option value="last7days">Últimos 7 dias</option><option value="thisMonth">Este Mês</option><option value="custom">Escolher mês...</option></select></div>
          {dateFilter === 'custom' && (<DatePicker selected={customMonth} onChange={(date: Date | null) => setCustomMonth(date)} dateFormat="MMMM 'de' yyyy" showMonthYearPicker locale="pt-BR" className="month-input" placeholderText="Selecione o mês" />)}
          {selectedTransactions.length > 0 && (<button className="button-danger" onClick={handleBulkDelete}>Excluir Selecionados ({selectedTransactions.length})</button>)}
        </div>
        
        <div className="content-card">
          {loading ? <p>Carregando...</p> : error ? <p style={{ color: 'red' }}>{error}</p> : (
            <>
              <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th><label className="custom-checkbox"><input type="checkbox" onChange={handleSelectAll} checked={paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedTransactions.includes(t.id))} /><span></span></label></th>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Categoria</th>
                    <th>Tipo</th>
                    <th>Data de Vencimento</th>
                    <th>Data de Pagamento</th>
                    <th>Data de Cadastro</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map(t => {
                      const category = categories.find(c => c.id === t.category_id);
                      return (
                        <tr key={t.id} className={selectedTransactions.includes(t.id) ? 'selected-row' : ''}>
                          <td><label className="custom-checkbox"><input type="checkbox" checked={selectedTransactions.includes(t.id)} onChange={() => handleSelectTransaction(t.id)} /><span></span></label></td>
                          <td>{formatTransactionId(t.id)}</td>
                          <td>{renderStatusTag(t)}</td>
                          <td>{t.description}</td>
                          <td>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}</td>
                          <td>{category ? <span className="category-tag" style={{ backgroundColor: category.color }}>{category.name}</span> : <span className="no-category-tag">N/A</span>}</td>
                          <td><span className={`tag ${t.type}`}>{t.type}</span></td>
                          <td>{t.due_date ? new Date(`${t.due_date}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                          <td>{t.status === 'pago' && t.payment_date ? new Date(`${t.payment_date}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                          <td className="creation-date">{
                            (() => {
                              const cadastroStr = normalizeDateStr((t as any).entry_date) || normalizeDateStr(t.created_at);
                              return cadastroStr ? new Date(`${cadastroStr}T00:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-';
                            })()
                          }</td>
                          <td>
                            <div className="action-icons">
                              {t.status === 'pendente' && ( <span onClick={() => handleMarkAsPaid(t)} title="Marcar como pago">✅</span> )}
                              <span onClick={() => handleOpenEditModal(t)} style={{cursor: 'pointer'}}>✏️</span>
                              <span onClick={() => openDeleteConfirm(t.id)} style={{cursor: 'pointer'}}>🗑️</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={10}>Nenhum lançamento encontrado para os filtros selecionados.</td></tr>
                  )}
                </tbody>
              </table>
              </div>
              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Anterior</button>
                  <span>Página {currentPage} de {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>Próximo</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AddTransactionModal 
        isOpen={isTransactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        transactionToEdit={editingTransaction}
        categories={categories}
        onTransactionAdded={() => {
          setTransactionModalOpen(false);
          fetchData(); 
        }}
      />
      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setCategoriesModalOpen(false)}
        onCategoriesChange={fetchData}
      />
      <RecurringTransactionsModal
        isOpen={isRecurringModalOpen}
        onClose={() => setRecurringModalOpen(false)}
        onRecurrenceChange={fetchData}
        categories={categories}
      />

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Excluir Lançamento"
        message="Tem certeza que deseja apagar este lançamento? Esta ação não pode ser desfeita."
        confirmLabel="OK"
        cancelLabel="Cancelar"
        onConfirm={performDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmModal
        open={confirmBulkOpen}
        title="Excluir Selecionados"
        message={`Tem certeza que deseja apagar ${selectedTransactions.length} lançamento(s)?`}
        confirmLabel="OK"
        cancelLabel="Cancelar"
        onConfirm={performBulkDelete}
        onCancel={() => setConfirmBulkOpen(false)}
      />
    </>
  );
};

export default TransacoesPage;