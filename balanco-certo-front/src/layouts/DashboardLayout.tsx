// src/layouts/DashboardLayout.tsx

import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './DashboardLayout.css';
import logo from '../assets/balanco-Certo-logo.png'; // Verifique o nome do seu logo

const DashboardLayout = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src={logo} alt="Balanço Certo Logo" />
        </div>
        <nav className="sidebar-nav">
          <Link to="/dashboard">Visão Geral</Link>
          <Link to="/dashboard/transacoes">Lançamentos</Link>
          <Link to="/dashboard/relatorios">Relatórios</Link>
          <Link to="/dashboard/configuracoes">Configurações</Link>
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">
            Sair
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet /> 
      </main>
    </div>
  );
};

export default DashboardLayout;