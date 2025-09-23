// meu-saas-financeiro-server/src/index.js
// Versão atualizada em: 19 de Setembro de 2025

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importa o cliente Supabase configurado para o backend
const supabase = require('./config/supabaseClient');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'API do SaaS Financeiro Balanço Certo está no ar!' });
});

// Rota segura para buscar transações do usuário logado
app.get('/api/transactions', async (req, res) => {
  try {
    // 1. Pega o token do cabeçalho da requisição
    const token = req.headers.authorization?.split(' ')[1]; // Formato "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({ error: 'Nenhum token fornecido. Acesso não autorizado.' });
    }

    // 2. Verifica o token com o Supabase para obter o usuário
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError) {
      return res.status(401).json({ error: 'Token inválido. Acesso não autorizado.' });
    }

    // 3. Busca o perfil do usuário para encontrar sua organization_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Perfil do usuário não encontrado.' });
    }

    // 4. Busca as transações que pertencem à organização do usuário
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('organization_id', profile.organization_id);

    if (transactionsError) {
      throw transactionsError;
    }
    
    res.status(200).json(transactions);

  } catch (error) {
    console.error('Erro ao buscar transações:', error.message);
    res.status(500).json({ error: 'Erro interno ao buscar transações.' });
  }
});

// Rota para verificar e-mail e status de confirmação (usando RPC)
app.post('/api/check-email', async (req, res) => {
    const { email } = req.body;
  
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }
  
    try {
      const { data, error } = await supabase.rpc('verificar_email', {
        email_a_verificar: email
      });
  
      if (error) {
        throw error;
      }
  
      return res.status(200).json(data);
  
    } catch (err) {
      console.error('Erro ao verificar e-mail via RPC:', err.message);
      res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});


// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta http://localhost:${PORT}`);
});