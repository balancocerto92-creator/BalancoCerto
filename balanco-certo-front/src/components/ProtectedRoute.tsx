// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // <-- USA NOSSO NOVO HOOK

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Pega a informação da sessão diretamente do nosso contexto central
  const { session, loading } = useAuth();

  // Se ainda estivermos verificando a sessão, não mostramos nada
  if (loading) {
    return null; // ou um spinner de carregamento
  }

  // Se, após a verificação, não houver sessão, redireciona para o login
  if (!session) {
    return <Navigate to="/login" />;
  }
  
  // Se houver uma sessão, renderiza a página filha
  return <>{children}</>;
};

export default ProtectedRoute;