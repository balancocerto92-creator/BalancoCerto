// src/pages/RegisterPage.tsx

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

  // ... (o resto dos seus useState e useEffect continua igual)
  const [passwordCriteria, setPasswordCriteria] = useState({ minLength: false, uppercase: false, number: false, specialChar: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // O estado 'showResendLink' e a função 'handleResendConfirmation' não são mais necessários aqui

  useEffect(() => {
    setPasswordCriteria({
      minLength: password.length >= 8, uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password), specialChar: /[!@#$%^&*]/.test(password),
    });
  }, [password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validação de senha
    const allCriteriaMet = Object.values(passwordCriteria).every(Boolean);
    if (!allCriteriaMet) {
      setError('Por favor, cumpra todos os requisitos da senha.');
      setLoading(false);
      return;
    }

    try {
      // 1. Verificação no Backend
      const checkEmailResponse = await axios.post('http://localhost:3001/api/check-email', { email });

      // --- MUDANÇA PRINCIPAL AQUI ---
      // Agora, se o e-mail existir (independente de estar confirmado ou não),
      // nós mostramos a mesma mensagem e paramos o processo.
      if (checkEmailResponse.data.exists) {
        setError('Este e-mail já está cadastrado. Por favor, tente fazer login.');
        setLoading(false);
        return;
      }

      // 2. Se o e-mail não existe, prossegue com o cadastro
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
        {/* ... (o resto do formulário continua igual) ... */}
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
            {/* A lógica e o botão de reenvio foram removidos daqui */}
          </p>
        }
        <p className="auth-toggle">Já tem uma conta? <Link to="/login">Faça login</Link></p>
      </div>
    </div>
  );
};

export default RegisterPage;