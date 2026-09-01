import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import SingleInstanceBanner from '../common/SingleInstanceBanner';
import { useModal } from '../../context/ModalContext';
import TransactionFormModal from '../transactions/TransactionFormModal';
import PartyFormModal from '../parties/PartyFormModal';
import UserFormModal from '../users/UserFormModal';

const SIDEBAR_COLLAPSED_KEY = 'finflow_sidebar_collapsed';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const { modalType, closeModal, modalPayload } = useModal();

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className={`app ${isCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Backdrop for mobile drawer */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className={`content ${isCollapsed ? 'collapsed-margin' : ''}`}>
        <SingleInstanceBanner />
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          isSidebarCollapsed={isCollapsed}
          onToggleSidebarCollapse={handleToggleCollapse}
        />
        <div className="content-inner animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Standalone Single Open Mode Modal System */}
      {modalType === 'transaction' && (
        <TransactionFormModal
          onClose={closeModal}
          initialPartyId={modalPayload?.partyId}
        />
      )}
      {modalType === 'party' && (
        <PartyFormModal
          party={modalPayload}
          onClose={closeModal}
        />
      )}
      {modalType === 'user' && (
        <UserFormModal
          onClose={closeModal}
        />
      )}
    </div>
  );
}
