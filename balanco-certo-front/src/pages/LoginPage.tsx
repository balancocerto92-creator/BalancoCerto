// src/pages/LoginPage.tsx

import { useState } from 'react';
import { supabase } from '../supabaseClient';
import './AuthPages.css';
import { Link, useNavigate } from 'react-router-dom';
import logoBalançoCerto from '../assets/balanco-Certo-logo.png';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showResendLink, setShowResendLink] = useState(false);

  const handleResendConfirmation = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    const { error } = await supabase.auth.resend({ type: 'signup', email: email });
    if (error) {
      setError('Erro ao reenviar e-mail. Tente novamente.');
    } else {
      setMessage('Um novo e-mail de confirmação foi enviado!');
    }
    setLoading(false);
    setShowResendLink(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    setShowResendLink(false);

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      if (error.message === 'Email not confirmed') {
        setError('Seu e-mail ainda não foi confirmado. Por favor, verifique sua caixa de entrada.');
        setShowResendLink(true);
      } else {
        setError('E-mail ou senha inválidos.');
      }
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };
  
  // --- MUDANÇA PRINCIPAL AQUI ---
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Diz ao Supabase para onde redirecionar o usuário APÓS o login com Google
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) {
      setError('Erro ao fazer login com Google: ' + error.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Link to="/" className="auth-logo-link"> 
          <img src={logoBalançoCerto} alt="Balanço Certo Logo" className="auth-logo" />
        </Link>
        <h2>Bem-vindo de volta!</h2>
        <p className="auth-subtitle">Acesse sua conta para ver seu balanço.</p>
        
        <form onSubmit={handleLogin} className="auth-form">
          <input type="email" placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div className="forgot-password-link"><Link to="/esqueci-senha">Esqueci minha senha</Link></div>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="auth-divider"><span>OU</span></div>

        <button className="google-signin-button" onClick={signInWithGoogle}>
          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="google-logo"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
          Entrar com o Google
        </button>
        
        {message && <p className="auth-message">{message}</p>}
        {error && 
          <p className="auth-message error">
            {error}
            {showResendLink && 
              <button onClick={handleResendConfirmation} className="resend-link-button" disabled={loading}>
                {loading ? 'Reenviando...' : 'Reenviar e-mail de confirmação'}
              </button>
            }
          </p>
        }
        
        <p className="auth-toggle">Não tem uma conta? <Link to="/cadastro">Cadastre-se</Link></p>
      </div>
    </div>
  );
};

export default LoginPage;