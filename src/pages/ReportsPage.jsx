import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { transactionsApi, partiesApi } from '../api/apiClient';
import { formatCurrency, formatDate, formatIsoDate } from '../utils/formatters';
import { generatePdfReport, generateExcelReport } from '../utils/reportGenerators';
import Loader from '../components/common/Loader';
import {
  FileText,
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Building2,
  WalletCards,
  PieChart,
  CheckCircle,
} from 'lucide-react';

const REPORT_TYPES = [
  {
    id: 'party_statement',
    title: 'Party & Customer Ledger',
    desc: 'Statement of account, receivables, and payables for customers and vendors',
    icon: Building2,
  },
  {
    id: 'transaction_ledger',
    title: 'Master Transaction Ledger',
    desc: 'Itemized transaction records with dates, references, modes, and attachments',
    icon: WalletCards,
  },
  {
    id: 'cash_flow_summary',
    title: 'Cash Flow by Payment Mode',
    desc: 'Categorized breakdown across Bank Transfer, UPI, Cash, Cheque, and Card',
    icon: PieChart,
  },
];

const DATE_PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_year', label: 'This Year' },
  { id: 'custom', label: 'Custom Date Range' },
];

export default function ReportsPage() {
  const [parties, setParties] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Report Configuration States
  const [reportType, setReportType] = useState('party_statement');
  const [datePreset, setDatePreset] = useState('this_month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('all');
  const [selectedDirection, setSelectedDirection] = useState('all');
  const [selectedMode, setSelectedMode] = useState('all');

  const [exporting, setExporting] = useState(false);

  // Set default dates on preset change
  useEffect(() => {
    const now = new Date();
    const todayStr = formatIsoDate(now);

    if (datePreset === 'all') {
      setDateFrom('');
      setDateTo('');
    } else if (datePreset === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (datePreset === 'this_week') {
      const day = now.getDay() || 7; // get current day (1-7, Mon-Sun)
      const monday = new Date(now);
      monday.setDate(now.getDate() - day + 1);
      setDateFrom(formatIsoDate(monday));
      setDateTo(todayStr);
    } else if (datePreset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(formatIsoDate(firstDay));
      setDateTo(todayStr);
    } else if (datePreset === 'last_month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateFrom(formatIsoDate(firstDayLastMonth));
      setDateTo(formatIsoDate(lastDayLastMonth));
    } else if (datePreset === 'this_year') {
      const firstDayYear = new Date(now.getFullYear(), 0, 1);
      setDateFrom(formatIsoDate(firstDayYear));
      setDateTo(todayStr);
    }
  }, [datePreset]);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [partiesList, txList] = await Promise.all([
        partiesApi.getAll(),
        transactionsApi.getAll(),
      ]);
      setParties(partiesList);
      setTransactions(txList);
    } catch (err) {
      setError(err.message || 'Failed to load report data sources.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('data:refresh', handleRefresh);
    return () => window.removeEventListener('data:refresh', handleRefresh);
  }, [loadData]);

  // Filter transactions according to selected filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txDate = tx.transactionDate ? tx.transactionDate.slice(0, 10) : '';

      // Date Range Filter
      if (dateFrom && txDate && txDate < dateFrom) return false;
      if (dateTo && txDate && txDate > dateTo) return false;

      // Party Filter
      const txPartyId = tx.party?._id || (typeof tx.party === 'string' ? tx.party : 'unassigned');
      if (selectedPartyId !== 'all') {
        if (selectedPartyId === 'unassigned' && txPartyId !== 'unassigned') return false;
        if (selectedPartyId !== 'unassigned' && txPartyId !== selectedPartyId) return false;
      }

      // Direction Filter
      if (selectedDirection !== 'all' && tx.direction !== selectedDirection) return false;

      // Mode Filter
      if (selectedMode !== 'all' && tx.mode !== selectedMode) return false;

      return true;
    });
  }, [transactions, dateFrom, dateTo, selectedPartyId, selectedDirection, selectedMode]);

  // Overall Financial Summary
  const summaryMetrics = useMemo(() => {
    let received = 0;
    let transferred = 0;
    filteredTransactions.forEach((t) => {
      if (t.direction === 'received') received += t.amount || 0;
      if (t.direction === 'transferred') transferred += t.amount || 0;
    });
    return {
      received,
      transferred,
      balance: received - transferred,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Party Aggregated Report Data
  const partyReportData = useMemo(() => {
    const aggMap = new Map();
    filteredTransactions.forEach((tx) => {
      const partyId = tx.party?._id || (typeof tx.party === 'string' ? tx.party : 'unassigned');
      if (!aggMap.has(partyId)) {
        aggMap.set(partyId, { received: 0, transferred: 0, count: 0 });
      }
      const agg = aggMap.get(partyId);
      if (tx.direction === 'received') agg.received += tx.amount || 0;
      if (tx.direction === 'transferred') agg.transferred += tx.amount || 0;
      agg.count += 1;
    });

    const relevantParties = selectedPartyId === 'all'
      ? parties
      : parties.filter((p) => p._id === selectedPartyId);

    const list = relevantParties.map((p) => {
      const agg = aggMap.get(p._id) || { received: 0, transferred: 0, count: 0 };
      return {
        id: p._id,
        name: p.name,
        type: p.type || 'Customer',
        phone: p.phone || '—',
        email: p.email || '—',
        taxId: p.taxId || '—',
        received: agg.received,
        transferred: agg.transferred,
        net: agg.received - agg.transferred,
        count: agg.count,
      };
    });

    // If unassigned exists and included
    if ((selectedPartyId === 'all' || selectedPartyId === 'unassigned') && aggMap.has('unassigned')) {
      const agg = aggMap.get('unassigned');
      list.push({
        id: 'unassigned',
        name: 'Direct / Misc (No Party)',
        type: 'Other',
        phone: '—',
        email: '—',
        taxId: '—',
        received: agg.received,
        transferred: agg.transferred,
        net: agg.received - agg.transferred,
        count: agg.count,
      });
    }

    return list.filter((item) => item.count > 0 || selectedPartyId !== 'all');
  }, [filteredTransactions, parties, selectedPartyId]);

  // Mode Aggregated Report Data
  const modeReportData = useMemo(() => {
    const modes = ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Card'];
    return modes.map((m) => {
      const txs = filteredTransactions.filter((t) => t.mode === m);
      const received = txs.filter((t) => t.direction === 'received').reduce((s, t) => s + (t.amount || 0), 0);
      const transferred = txs.filter((t) => t.direction === 'transferred').reduce((s, t) => s + (t.amount || 0), 0);
      return {
        mode: m,
        count: txs.length,
        received,
        transferred,
        net: received - transferred,
      };
    });
  }, [filteredTransactions]);

  // Date Range Text Helper
  const dateRangeText = useMemo(() => {
    if (datePreset === 'all' || (!dateFrom && !dateTo)) return 'All Time Records';
    if (dateFrom && dateTo && dateFrom === dateTo) return `Date: ${formatDate(dateFrom)}`;
    if (dateFrom && dateTo) return `${formatDate(dateFrom)} to ${formatDate(dateTo)}`;
    if (dateFrom) return `From ${formatDate(dateFrom)}`;
    if (dateTo) return `Up to ${formatDate(dateTo)}`;
    return 'Custom Period';
  }, [datePreset, dateFrom, dateTo]);

  // Selected party object for naming
  const selectedPartyObj = parties.find((p) => p._id === selectedPartyId);

  // Trigger PDF Export
  const handleExportPdf = () => {
    setExporting(true);
    try {
      let title = 'Financial Statement Report';
      let tableColumns = [];
      let tableRows = [];
      let filename = `finflow-report-${new Date().toISOString().slice(0, 10)}.pdf`;

      if (reportType === 'party_statement') {
        title = selectedPartyObj
          ? `Statement of Account: ${selectedPartyObj.name}`
          : 'Party & Customer Ledger Statement';
        filename = `finflow-party-ledger-${new Date().toISOString().slice(0, 10)}.pdf`;
        tableColumns = ['Party Name', 'Type', 'Contact Info', 'Received (In)', 'Transferred (Out)', 'Net Balance', 'Entries'];
        tableRows = partyReportData.map((p) => [
          p.name,
          p.type,
          `${p.phone !== '—' ? p.phone : ''} ${p.email !== '—' ? p.email : ''}`.trim() || '—',
          formatCurrency(p.received),
          formatCurrency(p.transferred),
          (p.net >= 0 ? '+ ' : '') + formatCurrency(p.net),
          String(p.count),
        ]);
      } else if (reportType === 'transaction_ledger') {
        title = 'Master Transaction Ledger Report';
        filename = `finflow-transactions-${new Date().toISOString().slice(0, 10)}.pdf`;
        tableColumns = ['Date', 'Type', 'Party', 'Mode', 'Reference', 'Notes', 'Amount'];
        tableRows = filteredTransactions.map((t) => [
          formatDate(t.transactionDate),
          t.direction === 'received' ? 'Money Received' : 'Money Transferred',
          t.party?.name || 'Direct / General',
          t.mode,
          t.reference || '—',
          t.notes || '—',
          (t.direction === 'received' ? '+ ' : '- ') + formatCurrency(t.amount),
        ]);
      } else if (reportType === 'cash_flow_summary') {
        title = 'Cash Flow by Payment Mode Summary';
        filename = `finflow-mode-summary-${new Date().toISOString().slice(0, 10)}.pdf`;
        tableColumns = ['Payment Mode', 'Entries', 'Total Inflow (Received)', 'Total Outflow (Transferred)', 'Net Balance'];
        tableRows = modeReportData.map((m) => [
          m.mode,
          String(m.count),
          formatCurrency(m.received),
          formatCurrency(m.transferred),
          (m.net >= 0 ? '+ ' : '') + formatCurrency(m.net),
        ]);
      }

      generatePdfReport({
        reportTitle: title,
        dateRangeText,
        filterInfo: selectedPartyObj ? `Party: ${selectedPartyObj.name} (${selectedPartyObj.type})` : '',
        summary: summaryMetrics,
        tableColumns,
        tableRows,
        filename,
      });
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // Trigger Excel Export
  const handleExportExcel = () => {
    setExporting(true);
    try {
      let title = 'Financial Report';
      let columns = [];
      let data = [];
      let filename = `finflow-report-${new Date().toISOString().slice(0, 10)}.xlsx`;

      if (reportType === 'party_statement') {
        title = selectedPartyObj
          ? `Statement of Account — ${selectedPartyObj.name}`
          : 'Party & Customer Ledger Summary';
        filename = `finflow-party-ledger-${new Date().toISOString().slice(0, 10)}.xlsx`;
        columns = ['Party Name', 'Party Type', 'Phone', 'Email', 'Tax ID / GST', 'Total Received (₹)', 'Total Transferred (₹)', 'Net Position (₹)', 'Total Entries'];
        data = partyReportData.map((p) => [
          p.name,
          p.type,
          p.phone,
          p.email,
          p.taxId,
          p.received,
          p.transferred,
          p.net,
          p.count,
        ]);
      } else if (reportType === 'transaction_ledger') {
        title = 'Master Transaction Ledger';
        filename = `finflow-transactions-${new Date().toISOString().slice(0, 10)}.xlsx`;
        columns = ['Date', 'Direction', 'Amount (₹)', 'Party Name', 'Party Type', 'Payment Mode', 'Reference / UTR', 'Notes', 'Attachment URL'];
        data = filteredTransactions.map((t) => [
          t.transactionDate ? t.transactionDate.slice(0, 10) : '',
          t.direction === 'received' ? 'Received (Inflow)' : 'Transferred (Outflow)',
          t.amount,
          t.party?.name || 'Direct / No Party',
          t.party?.type || 'Other',
          t.mode,
          t.reference || '',
          t.notes || '',
          t.attachment || '',
        ]);
      } else if (reportType === 'cash_flow_summary') {
        title = 'Cash Flow Summary by Mode';
        filename = `finflow-cashflow-mode-${new Date().toISOString().slice(0, 10)}.xlsx`;
        columns = ['Payment Mode', 'Transaction Count', 'Received (₹)', 'Transferred (₹)', 'Net Balance (₹)'];
        data = modeReportData.map((m) => [
          m.mode,
          m.count,
          m.received,
          m.transferred,
          m.net,
        ]);
      }

      generateExcelReport({
        reportTitle: title,
        dateRangeText,
        filterInfo: selectedPartyObj ? `Party: ${selectedPartyObj.name}` : '',
        summary: summaryMetrics,
        columns,
        data,
        filename,
      });
    } catch (err) {
      console.error('Excel export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="reports-page animate-fade-in">
      {/* Report Type Selector Cards */}
      <div className="report-types-grid">
        {REPORT_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = reportType === type.id;
          return (
            <div
              key={type.id}
              className={`report-type-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setReportType(type.id)}
            >
              <div className="report-type-header">
                <div className="report-icon-box">
                  <Icon size={20} />
                </div>
                {isSelected && (
                  <span className="selected-indicator">
                    <CheckCircle size={15} /> Active
                  </span>
                )}
              </div>
              <h3>{type.title}</h3>
              <p>{type.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Configuration & Filter Panel */}
      <section className="panel report-controls-panel">
        <div className="panel-title">
          <div>
            <h2>Report Parameters & Filters</h2>
            <p>Customize time periods, entity scope, and generate structured exports</p>
          </div>
          <div className="export-action-buttons">
            <button
              type="button"
              className="export-btn pdf"
              onClick={handleExportPdf}
              disabled={exporting || loading}
            >
              <FileText size={16} />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              className="export-btn excel"
              onClick={handleExportExcel}
              disabled={exporting || loading}
            >
              <FileSpreadsheet size={16} />
              <span>Download Excel</span>
            </button>
            <button
              type="button"
              className="export-btn print"
              onClick={handlePrint}
              title="Print / Save as PDF via browser"
            >
              <Printer size={16} />
              <span>Print</span>
            </button>
          </div>
        </div>

        <div className="report-filter-grid">
          {/* Date Range Preset */}
          <div className="filter-group">
            <label>Date Preset</label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setDatePreset('custom');
              }}
            />
          </div>

          {/* To Date */}
          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setDatePreset('custom');
              }}
            />
          </div>

          {/* Party Selector */}
          <div className="filter-group">
            <label>Party / Customer</label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
            >
              <option value="all">All Parties & Customers ({parties.length})</option>
              {parties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.type})
                </option>
              ))}
              <option value="unassigned">Direct / Unassigned (No Party)</option>
            </select>
          </div>

          {/* Direction Filter */}
          <div className="filter-group">
            <label>Movement Type</label>
            <select
              value={selectedDirection}
              onChange={(e) => setSelectedDirection(e.target.value)}
            >
              <option value="all">All Directions (In & Out)</option>
              <option value="received">Money Received (Inflow Only)</option>
              <option value="transferred">Money Transferred (Outflow Only)</option>
            </select>
          </div>

          {/* Payment Mode Filter */}
          <div className="filter-group">
            <label>Payment Mode</label>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
            >
              <option value="all">All Modes</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>
        </div>
      </section>

      {/* Report Summary KPI Strip */}
      <div className="stats-grid">
        <div className="stat in">
          <p>Filtered Total Received</p>
          <strong>{formatCurrency(summaryMetrics.received)}</strong>
          <span>Incoming funds in period</span>
        </div>
        <div className="stat out">
          <p>Filtered Total Transferred</p>
          <strong>{formatCurrency(summaryMetrics.transferred)}</strong>
          <span>Outgoing expenses in period</span>
        </div>
        <div className="stat balance">
          <p>Net Position (In - Out)</p>
          <strong>{formatCurrency(summaryMetrics.balance)}</strong>
          <span>{summaryMetrics.balance >= 0 ? 'Net Surplus' : 'Net Deficit'}</span>
        </div>
        <div className="stat">
          <p>Matching Entries</p>
          <strong>{summaryMetrics.count}</strong>
          <span>Filtered transactions</span>
        </div>
      </div>

      {/* Live Report Preview Table */}
      <section className="panel printable-report-panel">
        <div className="report-preview-header">
          <div>
            <span className="eyebrow">LIVE REPORT PREVIEW</span>
            <h2>
              {reportType === 'party_statement' && (selectedPartyObj ? `Account Statement: ${selectedPartyObj.name}` : 'Party & Customer Ledger Statement')}
              {reportType === 'transaction_ledger' && 'Master Transaction Ledger Report'}
              {reportType === 'cash_flow_summary' && 'Cash Flow by Payment Mode Report'}
            </h2>
            <p className="period-badge">
              <Calendar size={13} />
              <span>{dateRangeText}</span>
            </p>
          </div>
        </div>

        {loading ? (
          <Loader message="Compiling report data..." />
        ) : error ? (
          <div className="form-alert error">
            <p>{error}</p>
            <button className="secondary" onClick={loadData}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* View 1: Party Statement */}
            {reportType === 'party_statement' && (
              !partyReportData.length ? (
                <div className="empty-state">
                  <p>No party ledger entries found matching these date and scope filters.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Party / Company</th>
                        <th>Type</th>
                        <th>Contact</th>
                        <th className="text-right">Total Inflow (₹)</th>
                        <th className="text-right">Total Outflow (₹)</th>
                        <th className="text-right">Net Position</th>
                        <th className="text-center">Entries</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partyReportData.map((p) => {
                        const isNetPos = p.net > 0;
                        const isNetZero = p.net === 0;
                        return (
                          <tr key={p.id}>
                            <td>
                              <b>{p.name}</b>
                              {p.taxId !== '—' && <small>GST: {p.taxId}</small>}
                            </td>
                            <td>
                              <span className={`pill type-pill ${p.type.toLowerCase()}`}>
                                {p.type}
                              </span>
                            </td>
                            <td>
                              <small>{p.phone !== '—' ? p.phone : p.email}</small>
                            </td>
                            <td className="text-right font-semibold positive">
                              {p.received > 0 ? `+ ${formatCurrency(p.received)}` : '₹0'}
                            </td>
                            <td className="text-right font-semibold negative">
                              {p.transferred > 0 ? `- ${formatCurrency(p.transferred)}` : '₹0'}
                            </td>
                            <td className="text-right">
                              <span
                                className={`net-badge ${
                                  isNetZero ? 'neutral' : isNetPos ? 'net-in' : 'net-out'
                                }`}
                              >
                                {isNetZero
                                  ? '₹0'
                                  : isNetPos
                                  ? `+ ${formatCurrency(p.net)}`
                                  : `- ${formatCurrency(Math.abs(p.net))}`}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="count-pill">{p.count}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* View 2: Transaction Ledger */}
            {reportType === 'transaction_ledger' && (
              !filteredTransactions.length ? (
                <div className="empty-state">
                  <p>No transaction records found for the selected filter parameters.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type & Details</th>
                        <th>Party</th>
                        <th>Payment Mode</th>
                        <th>Reference / UTR</th>
                        <th className="text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx) => {
                        const isReceived = tx.direction === 'received';
                        return (
                          <tr key={tx._id}>
                            <td>
                              <span className="date-text">{formatDate(tx.transactionDate)}</span>
                            </td>
                            <td>
                              <div className="tx-type-cell">
                                <div className={`tx-icon-badge ${isReceived ? 'in' : 'out'}`}>
                                  {isReceived ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                </div>
                                <div>
                                  <b>{isReceived ? 'Money Received' : 'Money Transferred'}</b>
                                  <small>{tx.notes || '—'}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span>{tx.party?.name || 'Direct Operations'}</span>
                            </td>
                            <td>
                              <span className="pill">{tx.mode}</span>
                            </td>
                            <td>
                              <span className="text-muted">{tx.reference || '—'}</span>
                            </td>
                            <td className={`text-right font-semibold ${isReceived ? 'positive' : 'negative'}`}>
                              {isReceived ? '+ ' : '- '}
                              {formatCurrency(tx.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {/* View 3: Cash Flow Summary */}
            {reportType === 'cash_flow_summary' && (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Payment Mode</th>
                      <th className="text-center">Transaction Count</th>
                      <th className="text-right">Total Inflow (Received)</th>
                      <th className="text-right">Total Outflow (Transferred)</th>
                      <th className="text-right">Net Balance Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modeReportData.map((m) => {
                      const isNetPos = m.net > 0;
                      const isNetZero = m.net === 0;
                      return (
                        <tr key={m.mode}>
                          <td>
                            <b>{m.mode}</b>
                          </td>
                          <td className="text-center">
                            <span className="count-pill">{m.count}</span>
                          </td>
                          <td className="text-right font-semibold positive">
                            {m.received > 0 ? `+ ${formatCurrency(m.received)}` : '₹0'}
                          </td>
                          <td className="text-right font-semibold negative">
                            {m.transferred > 0 ? `- ${formatCurrency(m.transferred)}` : '₹0'}
                          </td>
                          <td className="text-right">
                            <span
                              className={`net-badge ${
                                isNetZero ? 'neutral' : isNetPos ? 'net-in' : 'net-out'
                              }`}
                            >
                              {isNetZero
                                ? '₹0'
                                : isNetPos
                                ? `+ ${formatCurrency(m.net)}`
                                : `- ${formatCurrency(Math.abs(m.net))}`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
