// meu-saas-financeiro-server/src/index.js
// VERSÃO 100% COMPLETA - com status e due_date nas transações

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
app.use(cors());
app.use(express.json());


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


// -- ROTAS DE CATEGORIAS --

// ROTA [GET] - Listar todas as categorias da organização
app.get('/api/categories', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return res.status(401).json({ error: 'Token inválido.' });
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
    const { data: categories, error } = await supabase.from('categories').select('id, sequential_id, name, color').eq('organization_id', profile.organization_id).order('name', { ascending: true });
    if (error) throw error;
    res.status(200).json(categories);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error.message);
    res.status(500).json({ error: 'Erro interno ao buscar categorias.' });
  }
});

// ROTA [POST] - Criar uma nova categoria
app.post('/api/categories', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return res.status(401).json({ error: 'Token inválido.' });
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ error: 'O nome da categoria é obrigatório.' });
    const { data: newCategory, error } = await supabase.from('categories').insert({ name, color, user_id: user.id, organization_id: profile.organization_id }).select('id, sequential_id, name, color').single();
    if (error) {
      if (error.code === '23505') { return res.status(409).json({ error: 'Uma categoria com este nome já existe.' }); }
      throw error;
    }
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Erro ao criar categoria:', error.message);
    res.status(500).json({ error: 'Erro interno ao criar categoria.' });
  }
});

// ROTA [PUT] - Atualizar uma categoria existente
app.put('/api/categories/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) return res.status(401).json({ error: 'Token inválido.' });
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
        const { id } = req.params;
        const { name, color } = req.body;
        if (!name || !color) return res.status(400).json({ error: 'Nome e cor são obrigatórios.' });
        const { data: updatedCategory, error } = await supabase.from('categories').update({ name, color }).eq('id', id).eq('organization_id', profile.organization_id).select('id, sequential_id, name, color').single();
        if (error) throw error;
        if (!updatedCategory) return res.status(404).json({ error: 'Categoria não encontrada ou você não tem permissão para editá-la.' });
        res.status(200).json(updatedCategory);
    } catch (error) {
        console.error('Erro ao atualizar categoria:', error.message);
        res.status(500).json({ error: 'Erro interno ao atualizar categoria.' });
    }
});

// ROTA [DELETE] - Deletar uma categoria
app.delete('/api/categories/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) return res.status(401).json({ error: 'Token inválido.' });
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
        const { id } = req.params;
        const { error, count } = await supabase.from('categories').delete().eq('id', id).eq('organization_id', profile.organization_id);
        if (error) throw error;
        if (count === 0) return res.status(404).json({ error: 'Categoria não encontrada ou você não tem permissão para deletá-la.' });
        res.status(200).json({ message: 'Categoria deletada com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar categoria:', error.message);
        res.status(500).json({ error: 'Erro interno ao deletar categoria.' });
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
      
      // --- ALTERAÇÃO AQUI ---
      const { description, amount, type, category_id, status, due_date } = req.body;
      if (!description || !amount || !type) return res.status(400).json({ error: 'Dados incompletos.' });
  
      const { data: newTransaction, error: insertError } = await supabase
        .from('transactions')
        .insert({ 
            description, 
            amount, 
            type, 
            category_id, 
            status, // Novo campo
            due_date, // Novo campo
            organization_id: profile.organization_id 
        })
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
      // --- ALTERAÇÃO AQUI ---
      const { description, amount, type, category_id, status, due_date } = req.body;
      if (!description || !amount || !type) return res.status(400).json({ error: 'Dados incompletos.' });
  
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions').select('organization_id').eq('id', id).single();
      if (transactionError || !transaction) return res.status(404).json({ error: 'Lançamento não encontrado.' });
      if (transaction.organization_id !== profile.organization_id) {
        return res.status(403).json({ error: 'Você não tem permissão para editar este lançamento.' });
      }
  
      const { data: updatedTransaction, error: updateError } = await supabase
        .from('transactions')
        .update({ 
            description, 
            amount, 
            type, 
            category_id,
            status,   // Novo campo
            due_date  // Novo campo
        })
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

// Rota para Exclusão em Massa
app.post('/api/transactions/bulk-delete', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError) return res.status(401).json({ error: 'Token inválido.' });
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
    const { transactionIds } = req.body;
    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ error: 'A lista de IDs de transações é inválida ou está vazia.' });
    }
    const { error: deleteError, count } = await supabase.from('transactions').delete().eq('organization_id', profile.organization_id).in('id', transactionIds);
    if (deleteError) throw deleteError;
    res.status(200).json({ message: `${count} lançamento(s) deletado(s) com sucesso.` });
  } catch (error) {
    console.error('Erro na exclusão em massa de transações:', error.message);
    res.status(500).json({ error: 'Erro interno ao deletar lançamentos.' });
  }
});


app.get('/api/transactions/export', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError) return res.status(401).json({ error: 'Token inválido.' });

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('organization_id').eq('id', user.id).single();
    if (profileError || !profile) return res.status(404).json({ error: 'Perfil do usuário não encontrado.' });
    
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('created_at, description, amount, type') // A exportação pode ser mais complexa depois
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });
    if (transactionsError) throw transactionsError;

    const fields = [
        { label: 'Data', value: 'created_at' },
        { label: 'Descrição', value: 'description' },
        { label: 'Valor', value: 'amount' },
        { label: 'Tipo', value: 'type' }
    ];
    
    const json2csvParser = new Parser({ fields, delimiter: ';' });
    const csv = json2csvParser.parse(transactions);

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