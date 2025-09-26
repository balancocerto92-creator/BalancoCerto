// src/App.tsx
// Versão com os caminhos de importação corrigidos

import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importação de Componentes e Layouts
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LandingPage from './components/LandingPage';

// Importação das Páginas (com os caminhos corretos)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import EmailConfirmationPage from './pages/EmailConfirmationPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import TransacoesPage from './pages/TransacoesPage';


// Importação do CSS global
import './App.css'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- Rotas Públicas --- */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/confirmacao-email" element={<EmailConfirmationPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="/reset-senha" element={<ResetPasswordPage />} />
        
        {/* --- Rotas Protegidas (Área Logada) --- */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} /> 
          <Route path="transacoes" element={<TransacoesPage />} />          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;