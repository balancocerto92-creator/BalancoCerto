// meu-saas-financeiro-server/src/index.js
// VERSÃO ATUALIZADA com suporte a parcelamentos nas rotas de compra.

// --- 1. IMPORTAÇÕES, INICIALIZAÇÃO, MIDDLEWARES ---
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Parser } = require('json2csv');
const supabase = require('./config/supabaseClient');
// --- Mercado Pago SDK (compatível v1 e v2) ---
let mercadopago;
let mpV2Config = null;
let isMPv2 = false;
try {
  mercadopago = require('mercadopago');
  // Se for v2, haverá MercadoPagoConfig e classes; v1 tem .configure e objetos com .preapproval/.payment
  if (mercadopago?.MercadoPagoConfig) {
    const { MercadoPagoConfig } = mercadopago;
    mpV2Config = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    isMPv2 = true;
  } else if (mercadopago?.configure) {
    mercadopago.configure({ access_token: process.env.MP_ACCESS_TOKEN });
  }
} catch (e) {
  console.warn('Mercado Pago SDK não instalado. Instale com: npm i mercadopago');
}

// Wrappers para chamadas da API (funcionam tanto na v1 quanto na v2)
async function mpPreapprovalCreate(data) {
  if (!mercadopago) throw new Error('SDK Mercado Pago ausente no servidor.');
  // v2
  if (isMPv2 && mercadopago?.PreApproval && mpV2Config) {
    const pre = new mercadopago.PreApproval(mpV2Config);
    // SDK v2 exige o objeto dentro de { body }
    return await pre.create({ body: data });
  }
  // v1
  if (mercadopago?.preapproval?.create) {
    return await mercadopago.preapproval.create(data);
  }
  throw new Error('API preapproval.create indisponível. Verifique a versão do SDK.');
}

async function mpPreapprovalGet(id) {
  if (!mercadopago) throw new Error('SDK Mercado Pago ausente no servidor.');
  if (isMPv2 && mercadopago?.PreApproval && mpV2Config) {
    const pre = new mercadopago.PreApproval(mpV2Config);
    return await pre.get({ id });
  }
  if (mercadopago?.preapproval?.get) {
    return await mercadopago.preapproval.get(id);
  }
  throw new Error('API preapproval.get indisponível. Verifique a versão do SDK.');
}

async function mpPaymentGetById(id) {
  if (!mercadopago) throw new Error('SDK Mercado Pago ausente no servidor.');
  if (isMPv2 && mercadopago?.Payment && mpV2Config) {
    const pay = new mercadopago.Payment(mpV2Config);
    return await pay.get({ id });
  }
  if (mercadopago?.payment?.findById) {
    return await mercadopago.payment.findById(id);
  }
  throw new Error('API payment.get/findById indisponível. Verifique a versão do SDK.');
}

const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());

// --- FUNÇÃO AUXILIAR PARA CALCULAR PRÓXIMA DATA ---
function calculateNextRunDate(currentDate, frequency) {
  const nextDate = new Date(currentDate);
  if (frequency === 'weekly') {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (frequency === 'monthly') {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else if (frequency === 'yearly') {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }
  return nextDate;
}

// --- Validação de URL pública para back_url (MP não aceita localhost) ---
function isValidBackUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    // Requer HTTPS e não permite localhost/127.0.0.1
    if (u.protocol !== 'https:') return false;
    if (['localhost', '127.0.0.1'].includes(u.hostname)) return false;
    return true;
  } catch (_) {
    return false;
  }
}

// --- 4. DEFINIÇÃO DAS ROTAS ---

// Rota de Teste
app.get('/', (req, res) => {
  res.json({ message: 'API do SaaS Financeiro Balanço Certo está no ar!' });
});

// -- ROTAS DE AUTENTICAÇÃO AUXILIARES --
app.post('/api/check-email', async (req, res) => {
  const { email } = req.body;
  if (!email) { return res.status(400).json({ error: 'E-mail é obrigatório.' }); }
  try {
    const { data, error } = await supabase.rpc('verificar_email', { email_a_verificar: email });
    if (error) throw error;
    return res.status(200).json(data);
  } catch (err) {
    console.error('Erro ao verificar e-mail via RPC:', err.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// -- ROTAS DE CATEGORIAS --
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

// -- ROTAS DE LANÇAMENTOS RECORRENTES --
app.get('/api/recurring-transactions', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Token inválido.' });
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
    const { data: recurring, error } = await supabase.from('recurring_transactions').select('*').eq('organization_id', profile.organization_id).order('description', { ascending: true });
    if (error) throw error;
    res.status(200).json(recurring);
  } catch (error) {
    console.error('Erro ao buscar recorrências:', error.message);
    res.status(500).json({ error: 'Erro interno ao buscar recorrências.' });
  }
});

app.post('/api/recurring-transactions', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Token inválido.' });
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
    const { description, amount, type, category_id, frequency, start_date, end_date } = req.body;
    if (!description || !amount || !type || !frequency || !start_date) {
      return res.status(400).json({ error: 'Dados incompletos para criar a recorrência.' });
    }
    const { data: newRecurrence, error: recurrenceError } = await supabase.from('recurring_transactions').insert({
        description, amount, type, category_id: category_id || null, frequency,
        start_date, next_run_date: start_date, end_date: end_date || null,
        user_id: user.id, organization_id: profile.organization_id
      }).select().single();
    if (recurrenceError) throw recurrenceError;
    const today = new Date();
    today.setHours(0,0,0,0);
    const startDateObj = new Date(start_date);
    if (startDateObj <= today) {
      await supabase.from('transactions').insert({
        organization_id: newRecurrence.organization_id,
        description: newRecurrence.description,
        amount: newRecurrence.amount,
        type: newRecurrence.type,
        category_id: newRecurrence.category_id,
        status: 'pendente',
        transaction_date: newRecurrence.start_date, // Linha corrigida
        due_date: newRecurrence.start_date,
      });
      const nextRunDate = calculateNextRunDate(startDateObj, newRecurrence.frequency);
      await supabase.from('recurring_transactions').update({ next_run_date: nextRunDate.toISOString().split('T')[0] }).eq('id', newRecurrence.id);
    }
    res.status(201).json(newRecurrence);
  } catch (error) {
    console.error('Erro ao criar recorrência:', error.message);
    res.status(500).json({ error: 'Erro interno ao criar recorrência.' });
  }
});
app.put('/api/recurring-transactions/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return res.status(401).json({ error: 'Token inválido.' });
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
        const { id } = req.params;
        const { description, amount, type, category_id, frequency, start_date } = req.body;
        const { data: updatedRecurrence, error } = await supabase.from('recurring_transactions').update({ description, amount, type, category_id, frequency, start_date }).eq('id', id).eq('organization_id', profile.organization_id).select().single();
        if (error) throw error;
        res.status(200).json(updatedRecurrence);
    } catch(error) {
        console.error('Erro ao editar recorrência:', error.message);
        res.status(500).json({ error: 'Erro ao editar recorrência.' });
    }
});
app.delete('/api/recurring-transactions/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return res.status(401).json({ error: 'Token inválido.' });
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
        const { id } = req.params;
        const { error, count } = await supabase.from('recurring_transactions').delete().eq('id', id).eq('organization_id', profile.organization_id);
        if (error) throw error;
        if (count === 0) return res.status(404).json({ error: 'Recorrência não encontrada ou você não tem permissão para deletá-la.' });
        res.status(200).json({ message: 'Recorrência deletada com sucesso.' });
    } catch (error) {
        console.error('Erro ao deletar recorrência:', error.message);
        res.status(500).json({ error: 'Erro interno ao deletar recorrência.' });
    }
});

// *******************************************************************
// --- NOVAS ROTAS DE CARTÕES DE CRÉDITO ---
// *******************************************************************

// ROTA [GET] - Listar todos os cartões da organização
app.get('/api/credit-cards', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return res.status(401).json({ error: 'Token inválido.' });
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });

        const { data: cards, error } = await supabase
            .from('credit_cards')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .order('name');
        
        if (error) throw error;
        res.status(200).json(cards);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar cartões de crédito.' });
    }
});

// ROTA [POST] - Criar um novo cartão de crédito
app.post('/api/credit-cards', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return res.status(401).json({ error: 'Token inválido.' });
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
        
        const { name, card_brand, card_color, closing_day, due_day } = req.body;
        if (!name || !closing_day || !due_day) return res.status(400).json({ error: 'Nome, dia de fechamento e dia de vencimento são obrigatórios.' });

        const { data: newCard, error } = await supabase
            .from('credit_cards')
            .insert({ name, card_brand, card_color, closing_day, due_day, organization_id: profile.organization_id })
            .select()
            .single();
        
        if (error) throw error;
        res.status(201).json(newCard);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar cartão de crédito.' });
    }
});

// ROTA [GET] - Buscar um único cartão de crédito pelo ID
app.get('/api/credit-cards/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return res.status(401).json({ error: 'Token inválido.' });
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
        
        const { id } = req.params;

        const { data: card, error } = await supabase
            .from('credit_cards')
            .select('*')
            .eq('organization_id', profile.organization_id)
            .eq('id', id)
            .single(); 
        
        if (error) throw error;
        if (!card) return res.status(404).json({ error: 'Cartão não encontrado.' });

        res.status(200).json(card);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar dados do cartão.' });
    }
});

// ROTA [PUT] - Atualizar dados de um cartão de crédito
app.put('/api/credit-cards/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return res.status(401).json({ error: 'Token inválido.' });
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });

        const { id } = req.params;
        const { name, card_brand, card_color, closing_day, due_day } = req.body;
        if (!name || !closing_day || !due_day) {
            return res.status(400).json({ error: 'Nome, dia de fechamento e dia de vencimento são obrigatórios.' });
        }

        const { data: updatedCard, error } = await supabase
            .from('credit_cards')
            .update({ name, card_brand, card_color, closing_day, due_day })
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .select()
            .single();

        if (error) throw error;
        if (!updatedCard) return res.status(404).json({ error: 'Cartão não encontrado ou sem permissão para editar.' });

        res.status(200).json(updatedCard);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar cartão de crédito.' });
    }
});

// --- ROTA [PUT] PARA EDITAR UMA COMPRA (COM SUPORTE A PARCELAMENTO) ---
app.put('/api/credit-card-purchases/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return res.status(401).json({ error: 'Token inválido.' });
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });

        const { id } = req.params;
        // CAMPOS DE PARCELAMENTO ADICIONADOS
        const { description, amount, purchase_date, category_id, total_installments, current_installment } = req.body;

        const { data: updatedPurchase, error } = await supabase
            .from('credit_card_purchases')
            // CAMPOS DE PARCELAMENTO ADICIONADOS
            .update({ description, amount, purchase_date, category_id, total_installments, current_installment })
            .eq('id', id)
            .eq('organization_id', profile.organization_id)
            .select()
            .single();

        if (error) throw error;
        if (!updatedPurchase) return res.status(404).json({ error: 'Compra não encontrada ou sem permissão para editar.' });
        
        res.status(200).json(updatedPurchase);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar a compra.' });
    }
});

// --- ROTA [DELETE] PARA APAGAR UMA COMPRA ---
app.delete('/api/credit-card-purchases/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return res.status(401).json({ error: 'Token inválido.' });
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });

        const { id } = req.params;

        const { error, count } = await supabase
            .from('credit_card_purchases')
            .delete()
            .eq('id', id)
            .eq('organization_id', profile.organization_id);

        if (error) throw error;
        if (count === 0) return res.status(404).json({ error: 'Compra não encontrada ou sem permissão para apagar.' });

        res.status(200).json({ message: 'Compra apagada com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao apagar a compra.' });
    }
});

// ROTA [GET] - Listar compras de um cartão específico
app.get('/api/credit-card-purchases', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return res.status(401).json({ error: 'Token inválido.' });
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });
        
        const { card_id } = req.query;
        if (!card_id) return res.status(400).json({ error: 'O ID do cartão é obrigatório.' });

        const { data: purchases, error } = await supabase
            .from('credit_card_purchases')
            .select('*, categories(name, color)')
            .eq('organization_id', profile.organization_id)
            .eq('credit_card_id', card_id)
            .order('purchase_date', { ascending: false });

        if (error) throw error;
        res.status(200).json(purchases);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar as compras do cartão.' });
    }
});

// ROTA [POST] - Adicionar uma nova compra ao cartão (COM SUPORTE A PARCELAMENTO)
app.post('/api/credit-card-purchases', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return res.status(401).json({ error: 'Token inválido.' });
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });

        // CAMPOS DE PARCELAMENTO ADICIONADOS
        const { credit_card_id, description, amount, purchase_date, category_id, total_installments, current_installment } = req.body;
        if (!credit_card_id || !description || !amount || !purchase_date) {
            return res.status(400).json({ error: 'Dados incompletos para a compra.' });
        }

        const { data: newPurchase, error } = await supabase
            .from('credit_card_purchases')
            .insert({
                credit_card_id, description, amount, purchase_date, category_id,
                organization_id: profile.organization_id,
                // CAMPOS DE PARCELAMENTO ADICIONADOS (com fallback para null)
                total_installments: total_installments || null,
                current_installment: current_installment || null
            })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(newPurchase);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao adicionar compra no cartão.' });
    }
});

// -- ROTAS DE TRANSAÇÕES --
app.get('/api/transactions', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Nenhum token fornecido. Acesso não autorizado.' });
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError) return res.status(401).json({ error: 'Token inválido. Acesso não autorizado.' });
    const { data: profile, error: profileError } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (profileError || !profile) return res.status(404).json({ error: 'Perfil do usuário não encontrado.' });
    const { data: transactions, error: transactionsError } = await supabase.from('transactions').select('*').eq('organization_id', profile.organization_id);
    if (transactionsError) throw transactionsError;
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Erro ao buscar transações:', error.message);
    res.status(500).json({ error: 'Erro interno ao buscar transações.' });
  }
});
app.post('/api/transactions', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError) return res.status(401).json({ error: 'Token inválido.' });
      const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
      if (!profile) return res.status(404).json({ error: 'Perfil do usuário não encontrado.' });
      const { description, amount, type, category_id, status, due_date, transaction_date, entry_date, created_at } = req.body;
      if (!description || !amount || !type) return res.status(400).json({ error: 'Dados incompletos.' });
      const todayStr = new Date().toISOString().split('T')[0];
      const safeEntryDate = entry_date || created_at || todayStr;
      const safeDueDate = status === 'pendente' ? due_date : null;
      const safePaymentDate = status === 'pago' ? transaction_date : null;

      const { data: newTransaction, error: insertError } = await supabase.from('transactions').insert({
            description,
            amount,
            type,
            category_id,
            status,
            entry_date: safeEntryDate,
            due_date: safeDueDate,
            payment_date: safePaymentDate,
            organization_id: profile.organization_id
        }).select().single();
      if (insertError) throw insertError;
      res.status(201).json(newTransaction);
    } catch (error) {
      console.error('Erro ao criar transação:', error.message);
      res.status(500).json({ error: 'Erro interno ao criar transação.' });
    }
});
app.put('/api/transactions/:id', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError) return res.status(401).json({ error: 'Token inválido.' });
      const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
      if (!profile) return res.status(404).json({ error: 'Perfil do usuário não encontrado.' });
      const { id } = req.params;
      const { description, amount, type, category_id, status, due_date, transaction_date } = req.body;
      if (!description || !amount || !type) return res.status(400).json({ error: 'Dados incompletos.' });
      const { data: transaction, error: transactionError } = await supabase.from('transactions').select('organization_id').eq('id', id).single();
      if (transactionError || !transaction) return res.status(404).json({ error: 'Lançamento não encontrado.' });
      if (transaction.organization_id !== profile.organization_id) { return res.status(403).json({ error: 'Você não tem permissão para editar este lançamento.' }); }
      const safeDueDate = status === 'pendente' ? due_date : null;
      const safePaymentDate = status === 'pago' ? transaction_date : null;
      const { data: updatedTransaction, error: updateError } = await supabase.from('transactions').update({
            description,
            amount,
            type,
            category_id,
            status,
            due_date: safeDueDate,
            payment_date: safePaymentDate
        }).eq('id', id).select().single();
      if (updateError) throw updateError;
      res.status(200).json(updatedTransaction);
    } catch (error) {
      console.error('Erro ao atualizar transação:', error.message);
      res.status(500).json({ error: 'Erro interno ao atualizar transação.' });
    }
});
app.delete('/api/transactions/:id', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError) return res.status(401).json({ error: 'Token inválido.' });
      const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
      if (!profile) return res.status(404).json({ error: 'Perfil do usuário não encontrado.' });
      const { id } = req.params;
      const { data: transaction, error: transactionError } = await supabase.from('transactions').select('organization_id').eq('id', id).single();
      if (transactionError || !transaction) return res.status(404).json({ error: 'Lançamento não encontrado.' });
      if (transaction.organization_id !== profile.organization_id) { return res.status(403).json({ error: 'Você não tem permissão para deletar este lançamento.' }); }
      const { error: deleteError } = await supabase.from('transactions').delete().eq('id', id);
      if (deleteError) throw deleteError;
      res.status(200).json({ message: 'Lançamento deletado com sucesso.' });
    } catch (error) {
      console.error('Erro ao deletar transação:', error.message);
      res.status(500).json({ error: 'Erro interno ao deletar transação.' });
    }
});
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
    const { data: profile, error: profileError } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (profileError || !profile) return res.status(404).json({ error: 'Perfil do usuário não encontrado.' });
    const { data: transactions, error: transactionsError } = await supabase.from('transactions').select('created_at, description, amount, type').eq('organization_id', profile.organization_id).order('created_at', { ascending: false });
    if (transactionsError) throw transactionsError;
    const fields = [ { label: 'Data', value: 'created_at' }, { label: 'Descrição', value: 'description' }, { label: 'Valor', value: 'amount' }, { label: 'Tipo', value: 'type' } ];
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
// --- ROTAS DE BILLING / MERCADO PAGO ---
app.post('/api/billing/subscriptions/create', async (req, res) => {
  try {
    if (!mercadopago) return res.status(500).json({ error: 'SDK Mercado Pago ausente no servidor.' });
    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado no backend.' });
    }
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso não autorizado.' });
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Token inválido.' });
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado.' });

    const { plan_id = 'pme', price = 50 } = req.body || {};
    const backUrlRaw = process.env.APP_URL || '';
    const backUrlIsValid = isValidBackUrl(backUrlRaw);
    if (!backUrlIsValid) {
      return res.status(400).json({
        error: 'APP_URL inválida para back_url. Defina uma URL HTTPS pública (sem localhost).',
        hint: 'Exemplo: usar ngrok ou uma URL de produção https e reiniciar o backend.'
      });
    }
    const backUrl = backUrlRaw; // Obrigatório pelo MP
    const payerEmail = (process.env.MP_TEST_PAYER_EMAIL?.trim()) || user.email; // Use test buyer em sandbox

    const reason = `Assinatura ${plan_id.toUpperCase()} - Organização ${profile.organization_id}`;
    const preapprovalData = {
      reason,
      external_reference: `${profile.organization_id}:${plan_id}`,
      payer_email: payerEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: Number(price),
        currency_id: 'BRL'
      },
      back_url: backUrl,
    };

    const response = await mpPreapprovalCreate(preapprovalData);
    const payload = response?.body || response;
    // Retorna URL para redirecionar o usuário ao checkout
    return res.status(200).json({ init_point: payload?.init_point || payload?.sandbox_init_point, id: payload?.id });
  } catch (error) {
    // Propaga detalhes do erro do MP para facilitar diagnóstico
    const details = {
      message: error?.message,
      error: error?.error,
      status: error?.status,
      cause: error?.cause,
      data: error?.data
    };
    console.error('Erro ao criar assinatura no Mercado Pago:', details);
    return res.status(500).json({ error: 'Erro interno ao criar assinatura.', details });
  }
});

// Webhook de Assinaturas do Mercado Pago
app.post('/api/billing/webhooks/mercadopago', async (req, res) => {
  try {
    if (!mercadopago) return res.status(500).json({ error: 'SDK Mercado Pago ausente no servidor.' });
    const eventBody = req.body || {};
    const eventQuery = req.query || {};
    // Mercado Pago pode enviar via query (?type=payment&id=123) e/ou JSON body.
    const topic = (eventQuery.type || eventBody.type || eventBody.topic || eventBody.action || '').toLowerCase();
    const resourceId = (eventQuery.id || eventBody.id || eventBody.data?.id || eventBody.resource?.id || '').toString();

    console.log('📨 Webhook Mercado Pago recebido:', JSON.stringify({ topic, resourceId, raw: eventBody }));

    // Trata eventos de aprovação de assinatura (preapproval)
    if (topic.includes('preapproval')) {
      if (!resourceId) {
        console.warn('Webhook preapproval sem resourceId.');
        return res.status(200).json({ ok: true });
      }
      try {
        const pr = await mpPreapprovalGet(resourceId);
        const preapproval = pr?.body || pr;
        // Exemplo de campos úteis: status, external_reference, payer_email
        const externalRef = preapproval?.external_reference || '';
        const status = preapproval?.status || 'unknown';
        console.log('🔎 Preapproval detalhado:', { status, externalRef });
        // Podemos marcar estado de assinatura por organização (se houver tabela dedicada)
        // Nesta versão, apenas reconhecemos e registramos o evento
        return res.status(200).json({ ok: true });
      } catch (e) {
        console.error('Erro ao consultar preapproval:', e.message);
        return res.status(200).json({ ok: true });
      }
    }

    // Trata eventos de pagamento mensal da assinatura
    if (topic.includes('payment')) {
      if (!resourceId) {
        console.warn('Webhook payment sem resourceId.');
        return res.status(200).json({ ok: true });
      }
      try {
        const payResp = await mpPaymentGetById(resourceId);
        const payment = payResp?.body || payResp;
        const status = payment?.status;
        const transactionAmount = payment?.transaction_amount || payment?.amount || 0;
        const paymentDateISO = payment?.date_approved || payment?.date_created || new Date().toISOString();
        const preapprovalId = payment?.preapproval_id || payment?.preapproval_id_id || null;
        let externalRef = payment?.external_reference || '';

        // Se não houver external_reference no payment, tenta buscar no preapproval
        if (!externalRef && preapprovalId) {
          try {
            const pr = await mercadopago.preapproval.get(preapprovalId);
            const preapproval = pr?.body || pr;
            externalRef = preapproval?.external_reference || '';
          } catch (e) {
            console.warn('Não foi possível obter external_reference via preapproval:', e.message);
          }
        }

        console.log('🔎 Payment detalhado:', { status, transactionAmount, externalRef });

        if (status === 'approved' && externalRef) {
          // external_reference esperado: "<organization_id>:<plan_id>"
          const [orgIdStr, planId] = externalRef.split(':');
          const organizationId = orgIdStr || null;
          if (organizationId) {
            // Insere uma despesa paga em transactions como fatura de assinatura
            const description = `Fatura Mercado Pago – Assinatura ${planId || 'plano'}`;
            const todayStr = new Date().toISOString().split('T')[0];
            const paymentDateStr = (paymentDateISO || todayStr).split('T')[0];

            const { error: insertError } = await supabase
              .from('transactions')
              .insert({
                organization_id: organizationId,
                description,
                amount: Number(transactionAmount || 0),
                type: 'despesa',
                category_id: null,
                status: 'pago',
                entry_date: todayStr,
                payment_date: paymentDateStr,
              });
            if (insertError) {
              console.error('Erro ao registrar fatura da assinatura em transactions:', insertError.message);
            } else {
              console.log('✅ Fatura da assinatura registrada em transactions com sucesso.');
            }
          }
        }

        return res.status(200).json({ ok: true });
      } catch (e) {
        console.error('Erro ao consultar payment:', e.message);
        return res.status(200).json({ ok: true });
      }
    }

    // Caso não identifique o tópico, apenas acusa recebimento
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Erro ao processar webhook do Mercado Pago:', error.message);
    return res.status(500).json({ error: 'Erro interno ao processar webhook.' });
  }
});