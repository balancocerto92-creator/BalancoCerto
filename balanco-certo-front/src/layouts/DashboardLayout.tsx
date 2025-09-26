// src/layouts/DashboardLayout.tsx

import  { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { AuthUser as User } from '@supabase/supabase-js';
import './DashboardLayout.css';
import UserProfile from '../components/UserProfile';

// --- Importação da Logo PNG da pasta assets ---
// Certifique-se que o nome do arquivo corresponde ao seu PNG (ex: logo.png)
import BalancoCertoLogo from '../assets/balanco-Certo-logo.png'; // <--- VERIFIQUE O NOME E A EXTENSÃO DO SEU ARQUIVO AQUI!

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user || null;
        setUser(currentUser);
        if (!currentUser) {
          navigate('/login');
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="logo">
          {/* --- Usando a logo PNG importada e removendo o texto --- */}
          <img src={BalancoCertoLogo} alt="Balanço Certo Logo" className="logo-icon" />
          {/* O texto "Balanço Certo" foi removido daqui */}
        </div>
        
        <nav className="main-nav">
          <NavLink to="/dashboard" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Visão Geral
          </NavLink>
          <NavLink to="/dashboard/transacoes" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Lançamentos
          </NavLink>
          <NavLink to="/dashboard/relatorios" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            Relatórios
          </NavLink>
        </nav>
        
        <UserProfile onLogout={handleLogout} currentUser={user} />
      </aside>
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;