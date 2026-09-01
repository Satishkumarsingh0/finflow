import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';

export default function Header({ onMenuClick }) {
  const { user, isAdmin, isOperator, isAccounts } = useAuth();
  const { openTransactionModal, openPartyModal, openUserModal } = useModal();
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/dashboard':
        return {
          eyebrow: 'FINANCIAL OVERVIEW',
          title: `Good day, ${user?.name ? user.name.split(' ')[0] : 'User'}`,
          action: (isAccounts || isOperator || isAdmin) && {
            label: 'Record payment',
            onClick: () => openTransactionModal(),
          },
        };
      case '/transactions':
        return {
          eyebrow: 'LEDGER & ENTRIES',
          title: 'Transactions',
          action: (isAccounts || isOperator || isAdmin) && {
            label: 'Record payment',
            onClick: () => openTransactionModal(),
          },
        };
      case '/parties':
        return {
          eyebrow: 'RELATIONSHIPS',
          title: 'Parties & Customers',
          action: (isOperator || isAdmin) && {
            label: 'Add party',
            onClick: () => openPartyModal(),
          },
        };
      case '/reports':
        return {
          eyebrow: 'EXPORT & STATEMENTS',
          title: 'Financial Reports',
          action: (isAccounts || isOperator || isAdmin) && {
            label: 'Record payment',
            onClick: () => openTransactionModal(),
          },
        };
      case '/analytics':
        return {
          eyebrow: 'DATA INSIGHTS',
          title: 'Analytics & Graphs',
          action: null,
        };
      case '/users':
        return {
          eyebrow: 'ADMINISTRATION',
          title: 'User Management',
          action: isAdmin && {
            label: 'Add team member',
            onClick: () => openUserModal(),
          },
        };
      default:
        return { eyebrow: 'FINFLOW', title: 'Workspace', action: null };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <header className="app-header">
      <div className="header-left">
        {/* Mobile hamburger — hidden on desktop via CSS */}
        <button
          className="icon-btn menu mobile-only"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          type="button"
        >
          <Menu size={22} />
        </button>

        <div>
          <p className="eyebrow">{pageInfo.eyebrow}</p>
          <h1>{pageInfo.title}</h1>
        </div>
      </div>

      <div className="header-right">
        {pageInfo.action && (
          <button className="primary" onClick={pageInfo.action.onClick} type="button">
            <Plus size={18} />
            <span>{pageInfo.action.label}</span>
          </button>
        )}
      </div>
    </header>
  );
}
