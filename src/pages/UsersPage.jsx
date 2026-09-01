import React, { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../api/apiClient';
import UserList from '../components/users/UserList';
import Loader from '../components/common/Loader';
import { useModal } from '../context/ModalContext';
import { Plus, ShieldAlert, RefreshCw } from 'lucide-react';

export default function UsersPage() {
  const { openUserModal } = useModal();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to load team members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();

    const handleRefresh = () => loadUsers();
    window.addEventListener('data:refresh', handleRefresh);
    return () => window.removeEventListener('data:refresh', handleRefresh);
  }, [loadUsers]);

  return (
    <div className="users-page">
      {/* Role Summary Banner */}
      <div className="role-summary-card">
        <div className="role-info-item">
          <ShieldAlert size={18} className="role-icon admin" />
          <div>
            <b>Admin</b>
            <span>Full system control & team management</span>
          </div>
        </div>
        <div className="role-info-item">
          <ShieldAlert size={18} className="role-icon operator" />
          <div>
            <b>Operator</b>
            <span>Day-to-day entries & parties management</span>
          </div>
        </div>
        <div className="role-info-item">
          <ShieldAlert size={18} className="role-icon accounts" />
          <div>
            <b>Accounts</b>
            <span>Ledger recording & financial analytics</span>
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Team Members & Access Control</h2>
            <p>Manage user accounts, credentials, and organizational roles</p>
          </div>
          <div className="panel-actions">
            <button
              className="icon-btn refresh-btn"
              onClick={loadUsers}
              title="Refresh list"
              type="button"
            >
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            </button>
            <button
              className="primary"
              onClick={() => openUserModal()}
              type="button"
            >
              <Plus size={16} />
              <span>Add Team Member</span>
            </button>
          </div>
        </div>

        {loading ? (
          <Loader message="Loading team members..." />
        ) : error ? (
          <div className="form-alert error">
            <p>{error}</p>
            <button className="secondary" onClick={loadUsers}>
              Retry
            </button>
          </div>
        ) : (
          <UserList users={users} loading={loading} />
        )}
      </section>
    </div>
  );
}
