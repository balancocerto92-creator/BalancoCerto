// src/pages/ResetPasswordPage.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './AuthPages.css';
import { Link, useNavigate } from 'react-router-dom';
import logoBalançoCerto from '../assets/balanco-Certo-logo.png';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // O token vem na URL após o '#', então não podemos usar useSearchParams
  // Usamos useEffect para lidar com isso quando a página carrega
  useEffect(() => {
    // Escuta por mudanças na autenticação, especificamente PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Se o evento for de recuperação de senha, a sessão contém o token de acesso
        // e o usuário já está tecnicamente logado para poder mudar a senha.
        // Não precisamos extrair o token manualmente.
        console.log('Sessão de recuperação de senha detectada.');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    // A validação de senha forte pode ser adicionada aqui também
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    // A biblioteca do Supabase usa a sessão de 'PASSWORD_RECOVERY' automaticamente
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setError('Erro ao redefinir a senha: ' + error.message);
    } else {
      setMessage('Senha redefinida com sucesso! Você já pode fazer login com sua nova senha.');
      // Opcional: redirecionar para o login após um tempo
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Link to="/" className="auth-logo-link"> 
          <img src={logoBalançoCerto} alt="Balanço Certo Logo" className="auth-logo" />
        </Link>
        <h2>Crie sua Nova Senha</h2>
        <p className="auth-subtitle">Digite e confirme sua nova senha de acesso.</p>
        
        {message ? (
          <p className="auth-message">{message}</p>
        ) : (
          <form onSubmit={handleResetPassword} className="auth-form">
            <input
              type="password"
              placeholder="Digite a nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirme a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            </button>
          </form>
        )}
        
        {error && <p className="auth-message error">{error}</p>}
        
        <p className="auth-toggle">
          Lembrou a senha? <Link to="/login">Faça login</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;