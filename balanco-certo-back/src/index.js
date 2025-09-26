// meu-saas-financeiro-server/src/index.js
// Versão final consolidada em: 26 de Setembro de 2025

// --- 1. IMPORTAÇÕES ---
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Parser } = require('json2csv');
const supabase = require('./config/supabaseClient');


// --- 2. INICIALIZAÇÃO DO APP ---
const app = express();
const PORT = process.env.PORT || 3001;


// --- 3. CONFIGURAÇÃO DE MIDDLEWARES ---
app.use(cors()); // Habilita o CORS para permitir requisições do frontend
app.use(express.json()); // Habilita o servidor a entender requisições com corpo em JSON


// --- 4. DEFINIÇÃO DAS ROTAS ---

// Rota de Teste
app.get('/', (req, res) => {
  res.json({ message: 'API do SaaS Financeiro Balanço Certo está no ar!' });
});

// -- ROTAS DE AUTENTICAÇÃO AUXILIARES --

// Rota para verificar e-mail e status de confirmação antes do cadastro
app.post('/api/check-email', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório.' });
  }

  try {
    const { data, error } = await supabase.rpc('verificar_email', {
      email_a_verificar: email
    });
    if (error) throw error;
    return res.status(200).json(data);

  } catch (err) {
    console.error('Erro ao verificar e-mail via RPC:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// -- ROTAS DE TRANSAÇÕES (CRUD & EXPORT) --

// Listar todas as transações do usuário logado
app.get('/api/transactions', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Nenhum token fornecido. Acesso não autorizado.' });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError) return res.status(401).json({ error: 'Token inválido. Acesso não autorizado.' });

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('organization_id').eq('id', user.id).single();
    if (profileError || !profile) return res.status(404).json({ error: 'Perfil do usuário não encontrado.' });

    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions').select('*').eq('organization_id', profile.organization_id);
    if (transactionsError) throw transactionsError;
    
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Erro ao buscar transações:', error.message);
    res.status(500).json({ error: 'Erro interno ao buscar transações.' });
  }
});

// Criar uma nova transação
app.post('/api/transactions', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
  
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError) return res.status(401).json({ error: 'Token inválido.' });
  
      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('organization_id').eq('id', user.id).single();
      if (profileError || !profile) return res.status(404).json({ error: 'Perfil do usuário não encontrado.' });
      
      const { description, amount, type } = req.body;
      if (!description || !amount || !type) return res.status(400).json({ error: 'Dados incompletos.' });
  
      const { data: newTransaction, error: insertError } = await supabase
        .from('transactions')
        .insert({ description, amount, type, organization_id: profile.organization_id })
        .select().single();
      if (insertError) throw insertError;
  
      res.status(201).json(newTransaction);
    } catch (error) {
      console.error('Erro ao criar transação:', error.message);
      res.status(500).json({ error: 'Erro interno ao criar transação.' });
    }
});

// Atualizar (editar) uma transação existente
app.put('/api/transactions/:id', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
      
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError) return res.status(401).json({ error: 'Token inválido.' });
  
      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('organization_id').eq('id', user.id).single();
      if (profileError || !profile) return res.status(404).json({ error: 'Perfil do usuário não encontrado.' });
      
      const { id } = req.params;
      const { description, amount, type } = req.body;
      if (!description || !amount || !type) return res.status(400).json({ error: 'Dados incompletos.' });
  
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions').select('organization_id').eq('id', id).single();
      if (transactionError || !transaction) return res.status(404).json({ error: 'Lançamento não encontrado.' });
      if (transaction.organization_id !== profile.organization_id) {
        return res.status(403).json({ error: 'Você não tem permissão para editar este lançamento.' });
      }
  
      const { data: updatedTransaction, error: updateError } = await supabase
        .from('transactions')
        .update({ description, amount, type })
        .eq('id', id)
        .select().single();
      if (updateError) throw updateError;
  
      res.status(200).json(updatedTransaction);
    } catch (error) {
      console.error('Erro ao atualizar transação:', error.message);
      res.status(500).json({ error: 'Erro interno ao atualizar transação.' });
    }
});

// Deletar uma transação
app.delete('/api/transactions/:id', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
      
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError) return res.status(401).json({ error: 'Token inválido.' });
  
      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('organization_id').eq('id', user.id).single();
      if (profileError || !profile) return res.status(404).json({ error: 'Perfil do usuário não encontrado.' });
      
      const { id } = req.params;
  
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions').select('organization_id').eq('id', id).single();
      if (transactionError || !transaction) return res.status(404).json({ error: 'Lançamento não encontrado.' });
      if (transaction.organization_id !== profile.organization_id) {
        return res.status(403).json({ error: 'Você não tem permissão para deletar este lançamento.' });
      }
  
      const { error: deleteError } = await supabase.from('transactions').delete().eq('id', id);
      if (deleteError) throw deleteError;
  
      res.status(200).json({ message: 'Lançamento deletado com sucesso.' });
    } catch (error) {
      console.error('Erro ao deletar transação:', error.message);
      res.status(500).json({ error: 'Erro interno ao deletar transação.' });
    }
});

app.get('/api/transactions/export', async (req, res) => {
  try {
    // 1. Validação do usuário (continua a mesma)
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError) return res.status(401).json({ error: 'Token inválido.' });

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('organization_id').eq('id', user.id).single();
    if (profileError || !profile) return res.status(404).json({ error: 'Perfil do usuário não encontrado.' });
    
    // 2. Busca das transações (continua a mesma)
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('created_at, description, amount, type')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });
    if (transactionsError) throw transactionsError;

    // --- MUDANÇA PRINCIPAL AQUI ---

    // 3. Define os cabeçalhos e a ordem das colunas no arquivo final
    const fields = [
        { label: 'Data', value: 'created_at' },
        { label: 'Descrição', value: 'description' },
        { label: 'Valor', value: 'amount' },
        { label: 'Tipo', value: 'type' }
    ];
    
    // 4. Configura o conversor para usar PONTO E VÍRGULA (;)
    const json2csvParser = new Parser({ fields, delimiter: ';' });
    const csv = json2csvParser.parse(transactions);

    // 5. Envia o arquivo para download (continua o mesmo)
    res.header('Content-Type', 'text/csv');
    res.attachment(`lancamentos-balanco-certo-${new Date().toISOString().slice(0,10)}.csv`);
    return res.status(200).send(csv);

  } catch (error) {
    console.error('Erro ao exportar transações:', error.message);
    res.status(500).json({ error: 'Erro interno ao exportar transações.' });
  }
});

// --- 5. INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta http://localhost:${PORT}`);
});