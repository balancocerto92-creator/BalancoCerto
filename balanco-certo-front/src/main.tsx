import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Importa o nosso provedor de autenticação
import { AuthProvider } from './contexts/AuthContext.tsx';

console.log('main.tsx: Starting application rendering...');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* "Abraçamos" toda a aplicação com o AuthProvider */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);

console.log('main.tsx: Application rendering initiated.');