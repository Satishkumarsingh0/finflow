import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
  // Single active modal state: { type: string, payload?: any } | null
  // Modal types: 'transaction' | 'party' | 'user' | null
  const [modalState, setModalState] = useState(null);

  const openModal = useCallback((type, payload = null) => {
    // Single open mode: automatically closes any existing open modal and opens the target
    setModalState({ type, payload });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(null);
  }, []);

  // Close modal on Escape key press (single modal UX standard)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modalState) {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalState, closeModal]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (modalState) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalState]);

  const value = {
    modalState,
    isOpen: !!modalState,
    modalType: modalState?.type || null,
    modalPayload: modalState?.payload || null,
    openModal,
    closeModal,
    openTransactionModal: (payload) => openModal('transaction', payload),
    openPartyModal: (party = null) => openModal('party', party),
    openUserModal: (payload) => openModal('user', payload),
  };

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
