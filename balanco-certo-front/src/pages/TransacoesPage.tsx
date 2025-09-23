// src/pages/TransacoesPage.tsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import './TransacoesPage.css';

// Vamos definir um "tipo" para nossas transações para o TypeScript ficar feliz
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

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        setError('');

        // 1. Pega a sessão atual do usuário no Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error('Sessão não encontrada. Faça login novamente.');
        }
        
        // 2. Pega o token de acesso da sessão
        const token = session.access_token;

        // 3. Faz a chamada para o nosso backend, enviando o token no cabeçalho
        const response = await axios.get('http://localhost:3001/api/transactions', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        setTransactions(response.data);

      } catch (err: any) {
        setError(err.response?.data?.error || 'Não foi possível carregar as transações.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []); // O array vazio [] garante que isso rode apenas uma vez, quando a página carrega

  return (
    <div className="transacoes-container">
      <header className="page-header">
        <h1>Lançamentos</h1>
        <button className="cta-button">Adicionar Lançamento</button>
      </header>

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
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? (
                transactions.map(t => (
                  <tr key={t.id}>
                    <td>{t.description}</td>
                    <td className={t.type === 'receita' ? 'receita' : 'despesa'}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                    </td>
                    <td>{t.type}</td>
                    <td>{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>Nenhum lançamento encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TransacoesPage;