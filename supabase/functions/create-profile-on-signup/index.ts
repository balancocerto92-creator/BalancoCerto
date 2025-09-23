// supabase/functions/create-profile-on-signup/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Função chamada!')

Deno.serve(async (req) => {
  try {
    // Cria um cliente admin do Supabase.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Pega o 'record' (o novo usuário) do corpo da requisição do webhook.
    const { record: user } = await req.json()

    console.log('Novo usuário recebido:', user);

    const userFullName = user.raw_user_meta_data?.full_name || 'Novo Usuário';
    console.log('Nome extraído:', userFullName);

    // 1. Cria uma nova organização
    console.log('Criando organização...');
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ name: `Organização de ${userFullName}` })
      .select()
      .single()

    if (orgError) throw orgError
    console.log('Organização criada:', orgData);

    // 2. Cria o perfil, vinculando à nova organização
    console.log('Criando perfil...');
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: user.id,
        full_name: userFullName,
        organization_id: orgData.id,
      })

    if (profileError) throw profileError
    console.log('Perfil criado com sucesso para o usuário:', user.id);

    return new Response(JSON.stringify({ message: 'Perfil criado com sucesso!' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Erro na função:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
