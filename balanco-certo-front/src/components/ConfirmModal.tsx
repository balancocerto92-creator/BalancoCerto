// src/components/ConfirmModal.tsx
import React from 'react';
import './ConfirmModal.css';

type ConfirmModalProps = {
  open: boolean;
  title?: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title = 'Confirmação',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  busy = false,
}) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={() => !busy && onCancel()}>
      <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="confirm-header">
          <h3>{title}</h3>
          <button className="close-button" onClick={onCancel} disabled={busy}>×</button>
        </div>
        <div className="confirm-body">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
        <div className="confirm-actions">
          <button className="cta-button secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button className="cta-button" onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;