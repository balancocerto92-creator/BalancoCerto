// src/pages/ForgotPasswordPage.tsx

import { useState } from 'react';
import { supabase } from '../supabaseClient';
import './AuthPages.css';
import { Link } from 'react-router-dom';
import logoBalançoCerto from '../assets/balanco-Certo-logo.png';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Esta é a URL para onde o usuário será redirecionado após clicar no link do e-mail.
      // Vamos criar essa página no próximo passo.
      redirectTo: `${window.location.origin}/reset-senha`, 
    });

    if (error) {
      setError('Erro ao enviar e-mail: ' + error.message);
    } else {
      setMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Link to="/" className="auth-logo-link"> 
          <img src={logoBalançoCerto} alt="Balanço Certo Logo" className="auth-logo" />
        </Link>
        <h2>Recuperar Senha</h2>
        <p className="auth-subtitle">Digite seu e-mail para receber o link de recuperação.</p>
        <form onSubmit={handlePasswordReset} className="auth-form">
          <input
            type="email"
            placeholder="Seu e-mail de cadastro"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
          </button>
        </form>
        {message && <p className="auth-message">{message}</p>}
        {error && <p className="auth-message error">{error}</p>}
        <p className="auth-toggle">
          Lembrou a senha? <Link to="/login">Faça login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;