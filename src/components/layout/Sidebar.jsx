import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  WalletCards,
  Users,
  LineChart,
  FileBarChart2,
  UserCog,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', icon: WalletCards },
  { path: '/parties', label: 'Parties & Customers', icon: Users },
  { path: '/analytics', label: 'Analytics & Graphs', icon: LineChart },
  { path: '/reports', label: 'Financial Reports', icon: FileBarChart2 },
  { path: '/users', label: 'User Management', icon: UserCog, adminOnly: true },
];

export default function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}) {
  const { user, logout, isAdmin } = useAuth();
  const filteredNav = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <div className="logo" title="Finflow Company Finance">
          <div className="brand-mark">F</div>
          {!isCollapsed && <span className="logo-text">finflow</span>}
        </div>

        {/* Collapse / Expand toggle — desktop only */}
        <button
          type="button"
          className="icon-btn collapse-toggle-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="workspace">
          <small>WORKSPACE</small>
          <b>Northstar Holdings</b>
        </div>
      )}

      <nav className="nav-menu">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={onClose}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={19} className="nav-icon" />
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {user && (
        <div className="side-user">
          <div
            className="avatar"
            title={isCollapsed ? `${user.name} (${user.role})` : undefined}
          >
            {user.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          {!isCollapsed && (
            <div className="user-info">
              <b>{user.name}</b>
              <span>{user.role}</span>
            </div>
          )}
          <button
            onClick={logout}
            className="logout-btn"
            title="Sign out"
            aria-label="Sign out"
            type="button"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </aside>
  );
}
