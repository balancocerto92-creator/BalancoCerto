// src/layouts/DashboardLayout.tsx
// VERSÃO ATUALIZADA para usar uma imagem como logo

import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { AuthUser as User } from '@supabase/supabase-js';
import './DashboardLayout.css';
import UserProfile from '../components/UserProfile';
import TrialBanner from '../components/TrialBanner';

// 1. IMPORTA A IMAGEM DA LOGO DA PASTA ASSETS
import logoImage from '../assets/balanco-Certo-logo.png'; 

// Importa todos os ícones do arquivo "barril" (index.ts)
import { 
    HomeIcon, 
    ListIcon, 
    ReportIcon, 
    CreditCardIcon,
    FinanceIcon
} from '../components/Icons/index';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    // Listener para mudanças de autenticação (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        if (!session) {
          navigate('/login');
        }
      }
    );

    // Limpa o listener quando o componente é desmontado
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
        <div>
            {/* 2. CÓDIGO DA LOGO ATUALIZADO */}
            <div className="logo">
                <img src={logoImage} alt="Logo Balanço Certo" style={{}} />
            </div>

            <nav className="main-nav">
                <NavLink to="/dashboard" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <HomeIcon /> Visão Geral
                </NavLink>
                <NavLink to="/dashboard/transacoes" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <ListIcon /> Lançamentos
                </NavLink>
                <NavLink to="/dashboard/relatorios" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <ReportIcon /> Relatórios
                </NavLink>
                <NavLink to="/dashboard/credit-cards" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <CreditCardIcon /> Cartões de Crédito
                </NavLink>
                <NavLink to="/dashboard/finance" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <FinanceIcon /> Configurações Financeiras
                </NavLink>
            </nav>
        </div>
        
        <UserProfile onLogout={handleLogout} currentUser={user} />
      </aside>
      <main className="main-content">
        <TrialBanner />
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;