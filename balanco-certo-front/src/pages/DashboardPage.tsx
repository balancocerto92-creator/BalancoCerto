// src/pages/DashboardPage.tsx

import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import type { AuthUser as User } from '@supabase/supabase-js';
import './DashboardPage.css';

// Importações para o gráfico
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);


// Tipo da Transação
type Transaction = {
  id: number;
  created_at: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
};

const DashboardPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

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
        setError('Não foi possível carregar os dados financeiros.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const { totalReceitas, totalDespesas, saldoAtual } = useMemo(() => {
    const receitas = transactions
      .filter(t => t.type === 'receita')
      .reduce((acc, t) => acc + t.amount, 0);
    
    const despesas = transactions
      .filter(t => t.type === 'despesa')
      .reduce((acc, t) => acc + t.amount, 0);
      
    return {
      totalReceitas: receitas,
      totalDespesas: despesas,
      saldoAtual: receitas - despesas,
    };
  }, [transactions]);
  
  const getFirstName = () => {
    if (!user?.user_metadata.full_name) return 'Usuário';
    return user.user_metadata.full_name.split(' ')[0];
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { boxWidth: 20, padding: 20, font: { size: 14 } }
      },
      title: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 16 },
        bodyFont: { size: 14 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: { callback: function(value: any) { return 'R$ ' + value; } }
      },
      x: {
        grid: { display: false }
      }
    }
  };
  
  const chartData = {
    labels: ['Resumo do Período'],
    datasets: [
      {
        label: 'Receitas',
        data: [totalReceitas],
        backgroundColor: 'rgba(74, 222, 128, 0.8)',
        borderColor: '#16a34a',
        borderWidth: 1,
        borderRadius: 8,
      },
      {
        label: 'Despesas',
        data: [totalDespesas],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: '#dc2626',
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  if (loading) {
    return <div className="loading-message">Carregando informações...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="dashboard-page-container">
      <header className="page-header">
        <h1>Visão Geral</h1>
        <p className="welcome-message">Olá, {getFirstName()}! Aqui está o resumo da sua saúde financeira.</p>
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
      
      <div className="content-card" style={{ height: '400px' }}>
        <h3>Atividade Recente</h3>
        <Bar options={chartOptions} data={chartData} />
      </div>
    </div>
  );
};

export default DashboardPage;