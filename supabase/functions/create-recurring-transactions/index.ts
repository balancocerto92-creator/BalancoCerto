// supabase/functions/create-recurring-transactions/index.ts
// VERSÃO FINAL CORRIGIDA - Removendo o campo user_id que não existe na tabela

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  category_id: string | null;
  organization_id: string;
  user_id: string;
  frequency: 'weekly' | 'monthly' | 'yearly';
  next_run_date: string;
}

function calculateNextRunDate(currentDate: Date, frequency: 'weekly' | 'monthly' | 'yearly'): Date {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date().toISOString().split('T')[0];

    const { data: dueTransactions, error: fetchError } = await supabaseAdmin
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .lte('next_run_date', today);

    if (fetchError) throw fetchError;

    if (!dueTransactions || dueTransactions.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum lançamento recorrente para hoje." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let successfulCreations = 0;
    
    for (const trans of dueTransactions as RecurringTransaction[]) {
      
      const newTransaction = {
        organization_id: trans.organization_id,
        // user_id: trans.user_id, // <-- LINHA REMOVIDA - A TABELA NÃO TEM ESTA COLUNA
        description: trans.description,
        amount: trans.amount,
        type: trans.type,
        category_id: trans.category_id,
        status: 'pendente',
        entry_date: new Date().toISOString().split('T')[0], // Data de cadastro é hoje
        due_date: trans.next_run_date, // Data de vencimento é a data da recorrência
        payment_date: null,
      };

      const { error: insertError } = await supabaseAdmin
        .from('transactions')
        .insert(newTransaction);

      if (insertError) {
        console.error(`Falha ao inserir recorrência ID: ${trans.id}`, insertError);
      } else {
        const nextRunDate = calculateNextRunDate(new Date(trans.next_run_date), trans.frequency);
        await supabaseAdmin
          .from('recurring_transactions')
          .update({ next_run_date: nextRunDate.toISOString().split('T')[0] })
          .eq('id', trans.id);
        
        successfulCreations++;
      }
    }

    return new Response(JSON.stringify({ message: `${successfulCreations} de ${dueTransactions.length} lançamento(s) recorrente(s) criado(s).` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("--- ERRO GERAL CAPTURADO NA FUNÇÃO ---", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});