import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, subtitle, children, onClose, maxWidth = '590px' }) {
  const modalRef = useRef(null);

  // Focus trap on open
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, []);

  return (
    <div
      className="modal-backdrop animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="modal animate-slide-up"
        style={{ maxWidth: `min(${maxWidth}, 100%)` }}
        ref={modalRef}
        tabIndex={-1}
      >
        <button
          className="icon-btn close"
          onClick={onClose}
          aria-label="Close dialog"
          type="button"
        >
          <X size={20} />
        </button>
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          {subtitle && <p className="modal-subtitle">{subtitle}</p>}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
