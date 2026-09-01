import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { transactionsApi } from '../api/apiClient';
import TransactionTable from '../components/transactions/TransactionTable';
import Loader from '../components/common/Loader';
import { useModal } from '../context/ModalContext';
import { Plus, Search, Filter, RefreshCw, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function TransactionsPage() {
  const { openTransactionModal } = useModal();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await transactionsApi.getAll();
      setTransactions(data);
    } catch (err) {
      setError(err.message || 'Failed to load transaction history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();

    const handleRefresh = () => loadTransactions();
    window.addEventListener('data:refresh', handleRefresh);
    return () => window.removeEventListener('data:refresh', handleRefresh);
  }, [loadTransactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Direction filter
      if (directionFilter !== 'all' && tx.direction !== directionFilter) {
        return false;
      }
      // Mode filter
      if (modeFilter !== 'all' && tx.mode !== modeFilter) {
        return false;
      }
      // Search query (party name, reference, notes)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const partyName = tx.party?.name?.toLowerCase() || '';
        const reference = tx.reference?.toLowerCase() || '';
        const notes = tx.notes?.toLowerCase() || '';
        if (!partyName.includes(query) && !reference.includes(query) && !notes.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, directionFilter, modeFilter, searchQuery]);

  // Calculated totals of filtered subset
  const totals = useMemo(() => {
    let inTotal = 0;
    let outTotal = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.direction === 'received') inTotal += tx.amount || 0;
      if (tx.direction === 'transferred') outTotal += tx.amount || 0;
    });
    return { inTotal, outTotal, net: inTotal - outTotal };
  }, [filteredTransactions]);

  return (
    <div className="transactions-page">
      {/* Quick Filter & Search Bar */}
      <div className="filter-card">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search party, reference, notes..."
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
          <div className="select-wrap">
            <Filter size={14} />
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
            >
              <option value="all">All Directions</option>
              <option value="received">Received (Inflow)</option>
              <option value="transferred">Transferred (Outflow)</option>
            </select>
          </div>

          <div className="select-wrap">
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
            >
              <option value="all">All Payment Modes</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>

          <button
            className="icon-btn refresh-btn"
            onClick={loadTransactions}
            title="Refresh list"
            type="button"
          >
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Summary strip for filtered results */}
      <div className="summary-strip">
        <div className="summary-pill">
          <span>Entries: <b>{filteredTransactions.length}</b></span>
        </div>
        <div className="summary-pill in">
          <ArrowDownLeft size={14} />
          <span>In: <b>{formatCurrency(totals.inTotal)}</b></span>
        </div>
        <div className="summary-pill out">
          <ArrowUpRight size={14} />
          <span>Out: <b>{formatCurrency(totals.outTotal)}</b></span>
        </div>
      </div>

      {/* Ledger Table Panel */}
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Transaction Ledger</h2>
            <p>Comprehensive record of all incoming receipts and outgoing vouchers</p>
          </div>
          <button
            className="primary"
            onClick={() => openTransactionModal()}
            type="button"
          >
            <Plus size={16} />
            <span>Record Payment</span>
          </button>
        </div>

        {error ? (
          <div className="form-alert error">
            <p>{error}</p>
            <button className="secondary" onClick={loadTransactions}>
              Retry
            </button>
          </div>
        ) : (
          <TransactionTable
            transactions={filteredTransactions}
            compact={false}
            loading={loading}
          />
        )}
      </section>
    </div>
  );
}
