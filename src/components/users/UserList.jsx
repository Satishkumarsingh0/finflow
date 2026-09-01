import React from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function UserList({ users = [], loading = false }) {
  if (loading) {
    return (
      <div className="table-loading">
        <p>Loading users...</p>
      </div>
    );
  }

  if (!users.length) {
    return (
      <div className="empty-state">
        <p>No team members found.</p>
      </div>
    );
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <ShieldAlert size={14} className="role-icon admin" />;
      case 'accounts':
        return <ShieldCheck size={14} className="role-icon accounts" />;
      default:
        return <Shield size={14} className="role-icon operator" />;
    }
  };

  return (
    <div className="user-table-wrap">
      <div className="user-grid">
        {users.map((u) => (
          <div className="user-card" key={u._id}>
            <div className="user-card-header">
              <div className="avatar">{u.name ? u.name[0].toUpperCase() : 'U'}</div>
              <div className="user-meta">
                <b>{u.name}</b>
                <span className="user-email">{u.email}</span>
              </div>
            </div>
            <div className="user-card-footer">
              <span className={`role-badge ${u.role}`}>
                {getRoleIcon(u.role)}
                <span>{u.role}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
