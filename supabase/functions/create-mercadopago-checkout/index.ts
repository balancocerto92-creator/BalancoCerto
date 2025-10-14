// supabase/functions/create-mercadopago-checkout/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts'; // Importe os cabeçalhos CORS
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { jwtVerify } from 'https://deno.land/x/jose@v4.14.4/index.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Incoming request headers:', req.headers);

    const authorization = req.headers.get('Authorization');
    const accessToken = authorization?.replace('Bearer ', '');

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'No access token provided in headers' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const JWT_SECRET = Deno.env.get('JWT_SECRET');

    if (!JWT_SECRET) {
      return new Response(JSON.stringify({ error: 'Supabase JWT secret not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    let userId: string | undefined;
    try {
      const { payload } = await jwtVerify(
        accessToken,
        new TextEncoder().encode(JWT_SECRET),
      );
      userId = payload.sub;
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return new Response(JSON.stringify({ error: 'Invalid access token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID not found in token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!MERCADOPAGO_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: 'Mercado Pago Access Token not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log('Mercado Pago Access Token being used:', MERCADOPAGO_ACCESS_TOKEN);

    // Replace with your actual item data and payer information
    const preferenceData = {
      items: [
        {
          title: 'Produto de Exemplo',
          unit_price: 29.90,
          quantity: 1,
        },
      ],
      payer: {
        email: 'test_user@example.com', // Replace with actual user email
      },
      back_urls: {
        success: 'https://your-frontend.com/success', // Replace with your success URL
        pending: 'https://your-frontend.com/pending', // Replace with your pending URL
        failure: 'https://your-frontend.com/failure', // Replace with your failure URL
      },
      notification_url: 'https://your-supabase-function.com/webhook', // Replace with your webhook URL
      auto_return: 'approved',
    };

    const mercadopagoResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mercadopagoResponse.ok) {
      const errorData = await mercadopagoResponse.json();
      console.error('Mercado Pago API error:', errorData);
      return new Response(JSON.stringify({ error: 'Failed to create Mercado Pago preference', details: errorData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: mercadopagoResponse.status,
      });
    }

    const preference = await mercadopagoResponse.json();
    console.log('Mercado Pago preference object:', preference);
    const mercadopagoCheckoutUrl = preference.init_point;

    return new Response(
      JSON.stringify({ url: mercadopagoCheckoutUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Erro na função create-mercadopago-checkout:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});