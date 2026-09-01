import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';
import { useModal } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Users,
  Building2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export default function PartyTransactionSummary({ parties = [], transactions = [], loading = false }) {
  const { openTransactionModal, openPartyModal } = useModal();
  const { isOperator, isAccounts, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('highest_volume'); // 'highest_volume' | 'highest_in' | 'highest_out' | 'net' | 'name'

  // Compute aggregated in/out/net for each party
  const partyAggregations = useMemo(() => {
    // Map partyId -> { received: 0, transferred: 0, txCount: 0, lastTxDate: null }
    const aggMap = new Map();

    transactions.forEach((tx) => {
      const partyId = tx.party?._id || (typeof tx.party === 'string' ? tx.party : 'unassigned');
      if (!aggMap.has(partyId)) {
        aggMap.set(partyId, {
          received: 0,
          transferred: 0,
          txCount: 0,
          lastTxDate: null,
        });
      }
      const agg = aggMap.get(partyId);
      const amount = tx.amount || 0;
      if (tx.direction === 'received') {
        agg.received += amount;
      } else if (tx.direction === 'transferred') {
        agg.transferred += amount;
      }
      agg.txCount += 1;
      const txDate = new Date(tx.transactionDate || tx.createdAt);
      if (!agg.lastTxDate || txDate > agg.lastTxDate) {
        agg.lastTxDate = txDate;
      }
    });

    // Merge with parties list
    const list = parties.map((p) => {
      const agg = aggMap.get(p._id) || { received: 0, transferred: 0, txCount: 0, lastTxDate: null };
      return {
        _id: p._id,
        name: p.name,
        type: p.type || 'Customer',
        email: p.email,
        phone: p.phone,
        active: p.active,
        received: agg.received,
        transferred: agg.transferred,
        net: agg.received - agg.transferred,
        totalVolume: agg.received + agg.transferred,
        txCount: agg.txCount,
        lastTxDate: agg.lastTxDate,
      };
    });

    // Also include unassigned transactions if any exist
    if (aggMap.has('unassigned') && aggMap.get('unassigned').txCount > 0) {
      const agg = aggMap.get('unassigned');
      list.push({
        _id: 'unassigned',
        name: 'Direct Operations / Misc (No Party)',
        type: 'Other',
        email: '',
        phone: '',
        active: true,
        received: agg.received,
        transferred: agg.transferred,
        net: agg.received - agg.transferred,
        totalVolume: agg.received + agg.transferred,
        txCount: agg.txCount,
        lastTxDate: agg.lastTxDate,
        isUnassigned: true,
      });
    }

    return list;
  }, [parties, transactions]);

  // Filter and Sort
  const filteredAndSorted = useMemo(() => {
    return partyAggregations
      .filter((p) => {
        // Type filter
        if (typeFilter !== 'all' && p.type !== typeFilter) {
          return false;
        }
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const name = p.name.toLowerCase();
          const email = p.email?.toLowerCase() || '';
          const phone = p.phone?.toLowerCase() || '';
          if (!name.includes(q) && !email.includes(q) && !phone.includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'highest_in') return b.received - a.received;
        if (sortBy === 'highest_out') return b.transferred - a.transferred;
        if (sortBy === 'net') return Math.abs(b.net) - Math.abs(a.net);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return b.totalVolume - a.totalVolume; // default: highest volume
      });
  }, [partyAggregations, typeFilter, searchQuery, sortBy]);

  const canRecordPayment = isAccounts || isOperator || isAdmin;

  return (
    <section className="panel party-summary-panel">
      {/* Panel Header */}
      <div className="panel-title">
        <div>
          <h2>Party & Customer Cashflow Breakdown</h2>
          <p>Aggregated money received, money transferred, and net balances by business entity</p>
        </div>
        <div className="panel-actions">
          <Link to="/parties" className="secondary-link">
            <span>Manage directory</span>
            <ArrowRight size={15} />
          </Link>
          {canRecordPayment && (
            <button
              className="secondary"
              onClick={() => openTransactionModal()}
              type="button"
            >
              <Plus size={16} />
              <span>Record payment</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="party-summary-filters">
        <div className="search-input-wrap">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search party by name, email, or phone..."
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
              type="button"
              className={`filter-tab ${typeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTypeFilter('all')}
            >
              All ({partyAggregations.length})
            </button>
            <button
              type="button"
              className={`filter-tab ${typeFilter === 'Customer' ? 'active' : ''}`}
              onClick={() => setTypeFilter('Customer')}
            >
              Customers
            </button>
            <button
              type="button"
              className={`filter-tab ${typeFilter === 'Vendor' ? 'active' : ''}`}
              onClick={() => setTypeFilter('Vendor')}
            >
              Vendors
            </button>
          </div>

          <div className="select-wrap">
            <Filter size={13} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="highest_volume">Sort: Highest Volume</option>
              <option value="highest_in">Sort: Highest Received (Inflow)</option>
              <option value="highest_out">Sort: Highest Transferred (Outflow)</option>
              <option value="net">Sort: Largest Net Balance</option>
              <option value="name">Sort: Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="table-loading">
          <p>Calculating party aggregates...</p>
        </div>
      ) : !filteredAndSorted.length ? (
        <div className="empty-state">
          <Building2 size={32} />
          <p>No parties matching criteria found.</p>
          <button className="secondary" onClick={() => openPartyModal()} type="button">
            Add new party
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table party-summary-table">
            <thead>
              <tr>
                <th>Party / Customer</th>
                <th>Type</th>
                <th className="text-right">Money Received (In)</th>
                <th className="text-right">Money Transferred (Out)</th>
                <th className="text-right">Net Position</th>
                <th className="text-center">Entries</th>
                <th className="text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((p) => {
                const hasInflow = p.received > 0;
                const hasOutflow = p.transferred > 0;
                const isNetPositive = p.net > 0;
                const isNetZero = p.net === 0;

                return (
                  <tr key={p._id} className="party-summary-row">
                    <td>
                      <div className="party-cell-info">
                        <div className="avatar small">
                          {p.name ? p.name[0].toUpperCase() : 'P'}
                        </div>
                        <div>
                          <b className="party-name-bold">{p.name}</b>
                          <small className="party-subtext">
                            {p.email || p.phone || (p.isUnassigned ? 'Miscellaneous' : 'Active Account')}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`pill type-pill ${p.type.toLowerCase()}`}>
                        {p.type}
                      </span>
                    </td>

                    <td className="text-right">
                      <div className="amount-cell-in">
                        <ArrowDownLeft size={13} className="text-success" />
                        <span className={hasInflow ? 'positive font-bold' : 'text-muted'}>
                          {formatCurrency(p.received)}
                        </span>
                      </div>
                    </td>

                    <td className="text-right">
                      <div className="amount-cell-out">
                        <ArrowUpRight size={13} className="text-danger" />
                        <span className={hasOutflow ? 'negative font-bold' : 'text-muted'}>
                          {formatCurrency(p.transferred)}
                        </span>
                      </div>
                    </td>

                    <td className="text-right">
                      <span
                        className={`net-badge ${
                          isNetZero
                            ? 'neutral'
                            : isNetPositive
                            ? 'net-in'
                            : 'net-out'
                        }`}
                      >
                        {isNetZero ? (
                          'Settled (₹0)'
                        ) : isNetPositive ? (
                          <>
                            <TrendingUp size={12} />
                            <span>+ {formatCurrency(p.net)} (Net In)</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown size={12} />
                            <span>- {formatCurrency(Math.abs(p.net))} (Net Out)</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="text-center">
                      <span className="count-pill">{p.txCount}</span>
                    </td>

                    <td className="text-right">
                      <div className="row-action-btns">
                        {canRecordPayment && !p.isUnassigned && (
                          <button
                            type="button"
                            className="mini-action-btn"
                            title={`Record payment with ${p.name}`}
                            onClick={() => openTransactionModal({ partyId: p._id })}
                          >
                            <Plus size={13} />
                            <span>Pay</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="mini-action-btn view-ledger"
                          title="View transactions"
                          onClick={() => {
                            navigate('/transactions');
                          }}
                        >
                          <span>Ledger</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
