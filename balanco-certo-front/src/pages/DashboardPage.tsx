// src/pages/DashboardPage.tsx

import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js'; // <-- CORRIGIDO

const DashboardPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Bem-vindo ao Balanço Certo</h1>
      {user ? (
        <div>
          <p>Você está logado como: <strong>{user.email}</strong></p>
          <button onClick={handleLogout} style={{ padding: '0.5rem 1rem' }}>
            Sair (Logout)
          </button>
        </div>
      ) : (
        <p>Carregando informações do usuário...</p>
      )}

      <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '2rem' }}>
        <h2>Suas Transações</h2>
        <p>Em breve, suas transações aparecerão aqui.</p>
      </div>
    </div>
  );
};

export default DashboardPage;