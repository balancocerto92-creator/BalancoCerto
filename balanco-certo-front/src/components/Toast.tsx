import React from 'react';
import './Toast.css';
import type { ToastType } from '../contexts/ToastContext';

type ToastProps = {
  toasts: { id: number; type: ToastType; message: string }[];
  onDismiss: (id: number) => void;
};

const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} role="status">
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => onDismiss(t.id)} aria-label="Fechar">×</button>
        </div>
      ))}
    </div>
  );
};

export default Toast;