// src/pages/ReportsPage.tsx
// Primeira versão de Relatórios com filtros, KPIs e gráficos

import { useEffect, useMemo, useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale/pt-BR';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import './ReportsPage.css';

registerLocale('pt-BR', ptBR);

type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  status: string;
  category_id: string | null;
  categories?: { name: string; color: string } | null;
  entry_date: string | null;
  due_date: string | null;
  payment_date: string | null;
};

type Category = { id: string; name: string; color: string };

// Componente de Multi-Seleção de Categorias com busca e "Selecionar todos"
const CategoryMultiSelect: React.FC<{
  categories: Category[];
  value: string[];
  onChange: (ids: string[]) => void;
}> = ({ categories, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const allIds = useMemo(() => ['sem-categoria', ...categories.map(c => c.id)], [categories]);
  const allSelected = allIds.length > 0 && allIds.every(id => value.includes(id));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  const toggleAll = (checked: boolean) => {
    onChange(checked ? allIds : []);
  };
  const toggleId = (id: string, checked: boolean) => {
    if (checked) {
      onChange(Array.from(new Set([...value, id])));
    } else {
      onChange(value.filter(v => v !== id));
    }
  };

  const summaryLabel = (() => {
    if (value.length === 0) return 'Todas as categorias';
    if (allSelected) return 'Todas selecionadas';
    return `${value.length} selecionada(s)`;
  })();

  return (
    <div className="multi-select">
      <button
        type="button"
        className="multi-select-control"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {summaryLabel}
        <span className="multi-caret">▾</span>
      </button>
      {open && (
        <div className="multi-dropdown" role="listbox" aria-label="Selecionar categorias">
          <div className="multi-search-wrapper">
            <input
              className="multi-search"
              type="text"
              placeholder="Buscar..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <label className="multi-option">
            <input type="checkbox" checked={allSelected} onChange={e => toggleAll(e.target.checked)} />
            Selecionar todos
          </label>
          <label className="multi-option">
            <input
              type="checkbox"
              checked={value.includes('sem-categoria')}
              onChange={e => toggleId('sem-categoria', e.target.checked)}
            />
            Sem categoria
          </label>
          {filtered.map(cat => (
            <label key={cat.id} className="multi-option">
              <input
                type="checkbox"
                checked={value.includes(cat.id)}
                onChange={e => toggleId(cat.id, e.target.checked)}
              />
              <span className="cat-chip" style={{ backgroundColor: cat.color }}>{cat.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

type Basis = 'caixa' | 'competencia';



const ReportsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Removido balão de ajuda global; ajuda agora é por card
  const [openHelp, setOpenHelp] = useState<string | null>(null);

  const HelpIcon: React.FC<{ id: string; title: string; description: React.ReactNode }> = ({ id, title, description }) => (
    <span className={openHelp === id ? 'help-hint open' : 'help-hint'}>
      <button
        className="info-icon"
        title="Ajuda"
        aria-expanded={openHelp === id}
        aria-controls={`help-${id}`}
        onClick={() => setOpenHelp(prev => (prev === id ? null : id))}
      >?
      </button>
      <div id={`help-${id}`} className="info-bubble" role="dialog" aria-label={`Ajuda – ${title}`}>
        <strong>{title}</strong>
        <div className="help-sections">
          <div className="help-section">
            {description}
          </div>
        </div>
      </div>
    </span>
  );

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState<Date>(startOfMonth);
  const [endDate, setEndDate] = useState<Date>(today);
  const [basis, setBasis] = useState<Basis>('caixa');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (!token) throw new Error('Sessão não encontrada.');
        const headers = { Authorization: `Bearer ${token}` };

        const [txRes, catRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/transactions`, { headers }),
          axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/categories`, { headers }),
        ]);

        setTransactions(txRes.data || []);
        setCategories(catRes.data || []);
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregar dados para relatórios.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  function parseDate(date: string | null): Date | null {
    if (!date) return null;
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const filteredTransactions = useMemo(() => {
    const start = startDate;
    const end = endDate;
    return transactions.filter(t => {
      const dateStr = basis === 'caixa' ? t.payment_date : t.due_date;
      const d = parseDate(dateStr);
      if (!d) return false;
      if (start && d < start) return false;
      if (end) {
        const endInclusive = new Date(end);
        endInclusive.setHours(23, 59, 59, 999);
        if (d > endInclusive) return false;
      }
      // Filtro por categoria
      if (selectedCategoryIds.length > 0) {
        const catId = t.category_id ?? 'sem-categoria';
        if (!selectedCategoryIds.includes(catId)) return false;
      }
      // Filtro por status
      if (selectedStatuses.length > 0) {
        if (!selectedStatuses.includes(t.status)) return false;
      }
      return true;
    });
  }, [transactions, startDate, endDate, basis, selectedCategoryIds, selectedStatuses]);

  const kpis = useMemo(() => {
    const receitas = filteredTransactions
      .filter(t => t.type === 'receita')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const despesas = filteredTransactions
      .filter(t => t.type === 'despesa')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const saldo = receitas - despesas;
    return { receitas, despesas, saldo };
  }, [filteredTransactions]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { receita: number; despesa: number }>();
    filteredTransactions.forEach(t => {
      const dateStr = basis === 'caixa' ? t.payment_date : t.due_date;
      const d = parseDate(dateStr);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const curr = map.get(key) || { receita: 0, despesa: 0 };
      if (t.type === 'receita') curr.receita += t.amount || 0;
      else curr.despesa += t.amount || 0;
      map.set(key, curr);
    });
    return Array.from(map.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([month, vals]) => ({ month, ...vals, saldo: vals.receita - vals.despesa }));
  }, [filteredTransactions, basis]);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, { name: string; color: string; total: number }>();
    filteredTransactions
      .filter(t => t.type === 'despesa')
      .forEach(t => {
        const cat = categories.find(c => c.id === t.category_id);
        const key = cat ? cat.id : 'sem-categoria';
        const name = cat ? cat.name : 'Sem categoria';
        const color = cat ? cat.color : '#94a3b8';
        const curr = map.get(key) || { name, color, total: 0 };
        curr.total += t.amount || 0;
        map.set(key, curr);
      });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredTransactions, categories]);

  // Novo relatório: Receitas por Categoria
  const revenuesByCategory = useMemo(() => {
    const map = new Map<string, { name: string; color: string; total: number }>();
    filteredTransactions
      .filter(t => t.type === 'receita')
      .forEach(t => {
        const cat = categories.find(c => c.id === t.category_id);
        const key = cat ? cat.id : 'sem-categoria';
        const name = cat ? cat.name : 'Sem categoria';
        const color = cat ? cat.color : '#10b981';
        const curr = map.get(key) || { name, color, total: 0 };
        curr.total += t.amount || 0;
        map.set(key, curr);
      });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredTransactions, categories]);

  // Novo relatório: Top 5 Despesas
  const topExpenses = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'despesa')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredTransactions]);

  // Novo relatório: Status dos Lançamentos
  const statusMetrics = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredTransactions.forEach(t => {
      const key = t.status || 'indefinido';
      const curr = map.get(key) || { count: 0, total: 0 };
      curr.count += 1;
      curr.total += t.amount || 0;
      map.set(key, curr);
    });
    const order = ['pago', 'pendente', 'vencido'];
    const arr = Array.from(map.entries()).map(([status, m]) => ({ status, ...m }));
    return arr.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  }, [filteredTransactions]);

  // Novo relatório: Saldo Mensal Acumulado
  const saldoAcumuladoSeries = useMemo(() => {
    let run = 0;
    return byMonth.map(m => {
      run += m.saldo;
      return { month: m.month, acumulado: run };
    });
  }, [byMonth]);

  const maxAbsAcumulado = useMemo(() => {
    const vals = saldoAcumuladoSeries.map(v => Math.abs(v.acumulado));
    return Math.max(1, ...(vals.length ? vals : [0]));
  }, [saldoAcumuladoSeries]);

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const exportCSV = () => {
    const rows = filteredTransactions.map(t => ({
      descricao: t.description,
      tipo: t.type,
      valor: t.amount,
      categoria: categories.find(c => c.id === t.category_id)?.name || 'Sem categoria',
      data_base: basis === 'caixa' ? t.payment_date : t.due_date,
    }));
    const header = 'descricao,tipo,valor,categoria,data_base';
    const body = rows.map(r => `${r.descricao},${r.tipo},${r.valor},${r.categoria},${r.data_base}`).join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_${basis}_${startDate}_a_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="reports-container">
      <header className="page-header">
        <div className="page-title">
          <h1>Relatórios</h1>
        </div>
        <div className="header-actions">
          <button className="button-secondary" onClick={exportCSV}>Exportar CSV</button>
        </div>
      </header>

      <div className="filter-bar">
        <div className="filter-group">
          <label>Início</label>
          <DatePicker
            selected={startDate}
            onChange={(date: Date | null) => date && setStartDate(date)}
            dateFormat="dd/MM/yyyy"
            locale="pt-BR"
            className="date-input"
            placeholderText="Selecione a data inicial"
          />
        </div>
        <div className="filter-group">
          <label>Fim</label>
          <DatePicker
            selected={endDate}
            onChange={(date: Date | null) => date && setEndDate(date)}
            dateFormat="dd/MM/yyyy"
            locale="pt-BR"
            className="date-input"
            placeholderText="Selecione a data final"
          />
        </div>
        <div className="filter-group">
          <label>Base</label>
          <div className="basis-toggle">
            <button
              className={basis === 'caixa' ? 'toggle-option active' : 'toggle-option'}
              onClick={() => setBasis('caixa')}
            >Caixa</button>
            <button
              className={basis === 'competencia' ? 'toggle-option active' : 'toggle-option'}
              onClick={() => setBasis('competencia')}
            >Competência</button>
            <HelpIcon
              id="basis-help"
              title="Base (Caixa vs Competência)"
              description={<p><b>Caixa:</b> usa a <u>data de pagamento</u> para incluir os lançamentos no período. <b>Competência:</b> usa a <u>data de vencimento</u>, refletindo quando a receita/despesa ocorre, independente do pagamento. Essa escolha afeta todos os cartões e a exportação.</p>}
            />
          </div>
        </div>
        <div className="filter-group">
          <label>Categorias</label>
          <CategoryMultiSelect categories={categories} value={selectedCategoryIds} onChange={setSelectedCategoryIds} />
        </div>
        <div className="filter-group">
          <label>Status</label>
          <div className="status-toggle">
            {['pendente','pago','vencido'].map(st => (
              <button
                key={st}
                className={selectedStatuses.includes(st) ? 'toggle-option active' : 'toggle-option'}
                onClick={() => {
                  setSelectedStatuses(prev => prev.includes(st) ? prev.filter(s => s !== st) : [...prev, st]);
                }}
              >{st[0].toUpperCase() + st.slice(1)}</button>
            ))}
          </div>
        </div>
      </div>

      {loading && <p>Carregando relatórios...</p>}
      {error && <p className="form-error-message">{error}</p>}

      {!loading && !error && (
        <>
          <div className="kpi-cards-container">
            <div className="kpi-card">
              <span className="card-title">Receitas</span>
              <span className="card-value receita">{formatBRL(kpis.receitas)}</span>
            </div>
            <div className="kpi-card">
              <span className="card-title">Despesas</span>
              <span className="card-value despesa">{formatBRL(kpis.despesas)}</span>
            </div>
            <div className="kpi-card">
              <span className="card-title">Saldo</span>
              <span className="card-value">{formatBRL(kpis.saldo)}</span>
            </div>
          </div>

          <section className="charts-grid">
            <div className="chart-card">
              <div className="card-header">
                <h3>Fluxo de Caixa Mensal</h3>
                <HelpIcon
                  id="fluxo"
                  title="Fluxo de Caixa Mensal"
                  description={<p>Mostra receitas e despesas por mês. Base atual: <b>{basis === 'caixa' ? 'Caixa (pagamento)' : 'Competência (vencimento)'}</b>. Saldo = receitas − despesas.</p>}
                />
              </div>
              <div className="bar-grid">
                {byMonth.map((m) => (
                  <div key={m.month} className="bar-row">
                    <span className="bar-label">{m.month}</span>
                    <div className="bar-track">
                      <div className="bar receita" style={{ width: `${Math.min(100, (m.receita / (m.receita + m.despesa || 1)) * 100)}%` }} />
                      <div className="bar despesa" style={{ width: `${Math.min(100, (m.despesa / (m.receita + m.despesa || 1)) * 100)}%` }} />
                    </div>
                    <span className="bar-values">R {m.saldo.toFixed(2)}</span>
                  </div>
                ))}
                {byMonth.length === 0 && <p>Nenhum dado no período selecionado.</p>}
              </div>
            </div>

            <div className="chart-card">
              <div className="card-header">
                <h3>Despesas por Categoria</h3>
                <HelpIcon
                  id="despesas-cat"
                  title="Despesas por Categoria"
                  description={<p>Soma de despesas por categoria no período e filtros ativos. "Sem categoria" agrupa lançamentos sem categoria definida.</p>}
                />
              </div>
              <ul className="pie-list">
                {expensesByCategory.map((c) => (
                  <li key={c.name}>
                    <span className="dot" style={{ backgroundColor: c.color }} />
                    <span className="cat-name">{c.name}</span>
                    <span className="cat-value">{formatBRL(c.total)}</span>
                  </li>
                ))}
                {expensesByCategory.length === 0 && <p>Nenhuma despesa no período.</p>}
              </ul>
            </div>

            <div className="chart-card">
              <div className="card-header">
                <h3>Receitas por Categoria</h3>
                <HelpIcon
                  id="receitas-cat"
                  title="Receitas por Categoria"
                  description={<p>Soma de receitas por categoria, respeitando período e filtros. Útil para identificar fontes principais de receita.</p>}
                />
              </div>
              <ul className="pie-list">
                {revenuesByCategory.map((c) => (
                  <li key={c.name}>
                    <span className="dot" style={{ backgroundColor: c.color }} />
                    <span className="cat-name">{c.name}</span>
                    <span className="cat-value">{formatBRL(c.total)}</span>
                  </li>
                ))}
                {revenuesByCategory.length === 0 && <p>Nenhuma receita no período.</p>}
              </ul>
            </div>

            <div className="chart-card">
              <div className="card-header">
                <h3>Top 5 Despesas</h3>
                <HelpIcon
                  id="top-despesas"
                  title="Top 5 Despesas"
                  description={<p>Lista as maiores despesas do período, considerando os filtros aplicados, com categoria e valor.</p>}
                />
              </div>
              <ul className="top-list">
                {topExpenses.map(t => (
                  <li key={t.id}>
                    <span className="top-desc">{t.description}</span>
                    <span className="top-cat">{categories.find(c => c.id === t.category_id)?.name || 'Sem categoria'}</span>
                    <span className="top-val">{formatBRL(t.amount)}</span>
                  </li>
                ))}
                {topExpenses.length === 0 && <p>Nenhuma despesa no período.</p>}
              </ul>
            </div>

            <div className="chart-card">
              <div className="card-header">
                <h3>Status dos Lançamentos</h3>
                <HelpIcon
                  id="status-lancamentos"
                  title="Status dos Lançamentos"
                  description={<p>Mostra contagem e total em R$ por status (Pago, Pendente, Vencido) dos lançamentos filtrados.</p>}
                />
              </div>
              <ul className="status-list">
                {statusMetrics.map(s => (
                  <li key={s.status}>
                    <span className="status-name">{s.status[0].toUpperCase() + s.status.slice(1)}</span>
                    <span className="status-count">{s.count} lanç.</span>
                    <span className="status-total">{formatBRL(s.total)}</span>
                  </li>
                ))}
                {statusMetrics.length === 0 && <p>Nenhum lançamento no período.</p>}
              </ul>
            </div>

            <div className="chart-card">
              <div className="card-header">
                <h3>Saldo Mensal Acumulado</h3>
                <HelpIcon
                  id="saldo-acumulado"
                  title="Saldo Mensal Acumulado"
                  description={<p>Exibe a evolução do saldo acumulado mês a mês (positivo em verde, negativo em vermelho).</p>}
                />
              </div>
              <div className="bar-grid">
                {saldoAcumuladoSeries.map((m) => (
                  <div key={m.month} className="bar-row">
                    <span className="bar-label">{m.month}</span>
                    <div className="bar-track">
                      <div
                        className={`bar ${m.acumulado >= 0 ? 'receita' : 'despesa'}`}
                        style={{ width: `${Math.min(100, (Math.abs(m.acumulado) / maxAbsAcumulado) * 100)}%` }}
                      />
                    </div>
                    <span className="bar-values">{formatBRL(m.acumulado)}</span>
                  </div>
                ))}
                {saldoAcumuladoSeries.length === 0 && <p>Nenhum dado no período selecionado.</p>}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default ReportsPage;