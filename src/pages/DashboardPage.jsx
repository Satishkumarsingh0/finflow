import React, { useState, useEffect, useCallback } from 'react';
import { dashboardApi, partiesApi, transactionsApi } from '../api/apiClient';
import { formatCurrency } from '../utils/formatters';
import StatCard from '../components/dashboard/StatCard';
import PartyTransactionSummary from '../components/dashboard/PartyTransactionSummary';
import Loader from '../components/common/Loader';
import { AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [parties, setParties] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      setError('');
      const [summary, partiesList, txList] = await Promise.all([
        dashboardApi.getSummary(),
        partiesApi.getAll(),
        transactionsApi.getAll(),
      ]);
      setDashboardData(summary);
      setParties(partiesList);
      setTransactions(txList);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();

    const handleRefresh = () => loadDashboard();
    window.addEventListener('data:refresh', handleRefresh);
    return () => window.removeEventListener('data:refresh', handleRefresh);
  }, [loadDashboard]);

  if (loading && !dashboardData) {
    return <Loader message="Loading financial overview and party breakdowns..." />;
  }

  if (error && !dashboardData) {
    return (
      <div className="panel error-panel">
        <AlertCircle size={24} />
        <h3>Unable to load dashboard</h3>
        <p>{error}</p>
        <button className="primary" onClick={loadDashboard}>
          Retry
        </button>
      </div>
    );
  }

  const { received = 0, transferred = 0, balance = 0, activeParties = 0 } =
    dashboardData || {};

  return (
    <div className="dashboard-page animate-fade-in">
      {/* High-level financial summary cards */}
      <div className="stats-grid">
        <StatCard
          label="Total Received"
          value={formatCurrency(received)}
          kind="in"
          subtitle="Total incoming revenue"
        />
        <StatCard
          label="Total Transferred"
          value={formatCurrency(transferred)}
          kind="out"
          subtitle="Total outgoing expenses"
        />
        <StatCard
          label="Net Balance"
          value={formatCurrency(balance)}
          kind="balance"
          subtitle="Current available capital"
        />
        <StatCard
          label="Active Parties"
          value={activeParties}
          kind="neutral"
          subtitle="Registered customers & vendors"
        />
      </div>

      {/* Aggregated Party In/Out Summary */}
      <PartyTransactionSummary
        parties={parties}
        transactions={transactions}
        loading={loading}
      />
    </div>
  );
}
