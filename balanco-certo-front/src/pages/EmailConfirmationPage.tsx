// src/pages/EmailConfirmationPage.tsx

import React, { useState } from 'react';
import './AuthPages.css';
import { Link, useSearchParams } from 'react-router-dom';
import logoBalançoCerto from '../assets/balanco-Certo-logo.png';
import { supabase } from '../supabaseClient'; // Importe o Supabase

const EmailConfirmationPage = () => {
  // Hook para ler os parâmetros da URL
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email'); // Pega o valor do parâmetro 'email'

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResendEmail = async () => {
    if (!email) {
      setError('E-mail não encontrado na URL.');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      setError('Erro ao reenviar e-mail: ' + error.message);
    } else {
      setMessage('Um novo e-mail de confirmação foi enviado!');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Link to="/" className="auth-logo-link"> 
          <img src={logoBalançoCerto} alt="Balanço Certo Logo" className="auth-logo" />
        </Link>
        <h2>Confirme seu E-mail</h2>
        <p className="auth-subtitle" style={{ marginBottom: '2rem' }}>
          Enviamos um link de confirmação para <strong>{email || 'seu e-mail'}</strong>. Por favor, clique no link para ativar sua conta.
        </p>
        
        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
          Não recebeu? Verifique sua caixa de spam ou clique abaixo para reenviar.
        </p>

        <div className="confirmation-actions">
          <button 
            className="auth-button-outline" 
            onClick={handleResendEmail} 
            disabled={loading}
          >
            {loading ? 'Reenviando...' : 'Reenviar E-mail'}
          </button>
          
          <Link to="/login" className="auth-button">
            Já confirmei, fazer Login
          </Link>
        </div>
        
        {/* Exibe mensagens de sucesso ou erro */}
        {message && <p className="auth-message">{message}</p>}
        {error && <p className="auth-message error">{error}</p>}
      </div>
    </div>
  );
};

export default EmailConfirmationPage;