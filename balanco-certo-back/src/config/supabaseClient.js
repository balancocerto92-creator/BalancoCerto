// src/config/supabaseClient.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../.env' }); // Ajusta o caminho para ler o .env da raiz

// Pega a URL e a Service Key do arquivo .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Cria e exporta o cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;