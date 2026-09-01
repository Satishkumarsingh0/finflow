import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { partiesApi } from '../api/apiClient';
import PartyCard from '../components/parties/PartyCard';
import Loader from '../components/common/Loader';
import { useModal } from '../context/ModalContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Users, RefreshCw } from 'lucide-react';

export default function PartiesPage() {
  const { openPartyModal } = useModal();
  const { isOperator, isAdmin } = useAuth();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadParties = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await partiesApi.getAll();
      setParties(data);
    } catch (err) {
      setError(err.message || 'Failed to load business relationships.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParties();

    const handleRefresh = () => loadParties();
    window.addEventListener('data:refresh', handleRefresh);
    return () => window.removeEventListener('data:refresh', handleRefresh);
  }, [loadParties]);

  const filteredParties = useMemo(() => {
    return parties.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = p.name?.toLowerCase() || '';
        const email = p.email?.toLowerCase() || '';
        const phone = p.phone?.toLowerCase() || '';
        const taxId = p.taxId?.toLowerCase() || '';
        if (!name.includes(q) && !email.includes(q) && !phone.includes(q) && !taxId.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [parties, typeFilter, searchQuery]);

  const canAdd = isOperator || isAdmin;

  return (
    <div className="parties-page">
      {/* Search & Filter Bar */}
      <div className="filter-card">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search party by name, email, phone, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              type="button"
            >
              ×
            </button>
          )}
        </div>

        <div className="filter-controls">
          <div className="tabs-wrap">
            <button
              className={`filter-tab ${typeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTypeFilter('all')}
              type="button"
            >
              All ({parties.length})
            </button>
            <button
              className={`filter-tab ${typeFilter === 'Customer' ? 'active' : ''}`}
              onClick={() => setTypeFilter('Customer')}
              type="button"
            >
              Customers ({parties.filter((p) => p.type === 'Customer').length})
            </button>
            <button
              className={`filter-tab ${typeFilter === 'Vendor' ? 'active' : ''}`}
              onClick={() => setTypeFilter('Vendor')}
              type="button"
            >
              Vendors ({parties.filter((p) => p.type === 'Vendor').length})
            </button>
          </div>

          <button
            className="icon-btn refresh-btn"
            onClick={loadParties}
            title="Refresh list"
            type="button"
          >
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Main Grid Panel */}
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Business Relationships</h2>
            <p>Maintain your customers, vendors, and suppliers directory</p>
          </div>
          {canAdd && (
            <button
              className="primary"
              onClick={() => openPartyModal()}
              type="button"
            >
              <Plus size={16} />
              <span>Add Party</span>
            </button>
          )}
        </div>

        {loading ? (
          <Loader message="Loading directory..." />
        ) : error ? (
          <div className="form-alert error">
            <p>{error}</p>
            <button className="secondary" onClick={loadParties}>
              Retry
            </button>
          </div>
        ) : !filteredParties.length ? (
          <div className="empty-state">
            <Users size={32} />
            <p>No parties matching criteria found.</p>
            {canAdd && (
              <button
                className="secondary"
                onClick={() => openPartyModal()}
                type="button"
              >
                Create new party
              </button>
            )}
          </div>
        ) : (
          <div className="party-grid">
            {filteredParties.map((party) => (
              <PartyCard
                key={party._id}
                party={party}
                onEdit={(p) => openPartyModal(p)}
                onStatusChange={loadParties}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
