// src/pages/RegisterPage.tsx
// Versão atualizada para produção em: 24 de Setembro de 2025

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './AuthPages.css';
import { Link, useNavigate } from 'react-router-dom';
import logoBalançoCerto from '../assets/balanco-Certo-logo.png';
import axios from 'axios';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [passwordCriteria, setPasswordCriteria] = useState({
    minLength: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResendLink, setShowResendLink] = useState(false);

  useEffect(() => {
    setPasswordCriteria({
      minLength: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[!@#$%^&*]/.test(password),
    });
  }, [password]);

  const handleResendConfirmation = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resend({ type: 'signup', email: email });
    if (error) {
      setError('Erro ao reenviar e-mail. Tente novamente.');
    } else {
      // Usaremos navigate para a página de confirmação para dar um feedback melhor
      navigate(`/confirmacao-email?email=${email}&resent=true`);
    }
    setLoading(false);
    setShowResendLink(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowResendLink(false);

    const allCriteriaMet = Object.values(passwordCriteria).every(Boolean);
    if (!allCriteriaMet) {
      setError('Por favor, cumpra todos os requisitos da senha.');
      setLoading(false);
      return;
    }

    try {
      // **MUDANÇA PRINCIPAL: URL DA API DINÂMICA**
      // Busca a URL base da API das variáveis de ambiente (Vercel)
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/api/check-email`;
      
      const checkEmailResponse = await axios.post(apiUrl, { email });

      if (checkEmailResponse.data.exists) {
        if (checkEmailResponse.data.confirmed) {
          setError('Este e-mail já está cadastrado. Por favor, faça login.');
        } else {
          setError('Este e-mail já foi usado, mas não foi confirmado.');
          setShowResendLink(true);
        }
        setLoading(false);
        return;
      }

      const { error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (authError) { throw authError; }
      
      navigate(`/confirmacao-email?email=${email}`);

    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.message || 'Ocorreu um erro ao conectar com o servidor.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro inesperado. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Link to="/" className="auth-logo-link"> 
          <img src={logoBalançoCerto} alt="Balanço Certo Logo" className="auth-logo" />
        </Link>
        <h2>Crie sua Conta</h2>
        <p className="auth-subtitle">Comece a organizar suas finanças hoje mesmo.</p>
        <form onSubmit={handleRegister} className="auth-form">
          <input type="text" placeholder="Seu nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <input type="email" placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input 
            type="password" 
            placeholder="Crie uma senha forte" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <div className="password-criteria">
            <p className={passwordCriteria.minLength ? 'valid' : ''}>✔ Pelo menos 8 caracteres</p>
            <p className={passwordCriteria.uppercase ? 'valid' : ''}>✔ Pelo menos uma letra maiúscula</p>
            <p className={passwordCriteria.number ? 'valid' : ''}>✔ Pelo menos um número</p>
            <p className={passwordCriteria.specialChar ? 'valid' : ''}>✔ Pelo menos um caractere especial (!@#$%^&*)</p>
          </div>
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Verificando...' : 'Criar Conta'}
          </button>
        </form>
        {error && 
          <p className="auth-message error">
            {error}
            {showResendLink && 
              <button onClick={handleResendConfirmation} className="resend-link-button">
                Reenviar e-mail de confirmação
              </button>
            }
          </p>
        }
        <p className="auth-toggle">Já tem uma conta? <Link to="/login">Faça login</Link></p>
      </div>
    </div>
  );
};

export default RegisterPage;