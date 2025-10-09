// src/contexts/ToastContext.tsx
import { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';

export type ToastType = 'info' | 'success' | 'error';

type ToastItem = { id: number; type: ToastType; message: string };

type ShowToastArgs = { type: ToastType; message: string; duration?: number };

type ToastContextValue = {
  showToast: (args: ShowToastArgs) => void;
};

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [counter, setCounter] = useState(0);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback(({ type, message, duration = 4000 }: ShowToastArgs) => {
    setCounter(prev => prev + 1);
    const id = counter + 1;
    const newToast: ToastItem = { id, type, message };
    setToasts(prev => [...prev, newToast]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
  }, [counter, dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);