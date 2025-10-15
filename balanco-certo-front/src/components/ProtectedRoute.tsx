// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // <-- USA NOSSO NOVO HOOK

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  console.log('ProtectedRoute.tsx: Rendering ProtectedRoute. Session:', session, 'Loading:', loading);

  if (loading) {
    console.log('ProtectedRoute.tsx: Loading is true, returning null.');
    return null;
  }

  if (!session) {
    console.log('ProtectedRoute.tsx: No session found, redirecting to /login.');
    return <Navigate to="/login" />;
  }

  console.log('ProtectedRoute.tsx: Session found, rendering children.');
  return <>{children}</>;
};

export default ProtectedRoute;