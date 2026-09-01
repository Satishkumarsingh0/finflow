import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { FileText, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export default function TransactionTable({ transactions = [], compact = false, loading = false }) {
  if (loading) {
    return (
      <div className="table-loading">
        <p>Loading transactions...</p>
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="empty-state">
        <p>No transactions recorded yet.</p>
        <small>Use the "Record payment" button to add your first transaction.</small>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Type & Details</th>
            <th>Party</th>
            <th>Mode</th>
            <th>Date</th>
            <th className="text-right">Amount</th>
            {!compact && <th>Attachment</th>}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const isReceived = tx.direction === 'received';
            return (
              <tr key={tx._id} className="transaction-row">
                <td>
                  <div className="tx-type-cell">
                    <div className={`tx-icon-badge ${isReceived ? 'in' : 'out'}`}>
                      {isReceived ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                    </div>
                    <div>
                      <b>{isReceived ? 'Money Received' : 'Money Transferred'}</b>
                      <small>{tx.reference || tx.notes || '—'}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="party-name">{tx.party?.name || '—'}</span>
                </td>
                <td>
                  <span className="pill mode-pill">{tx.mode}</span>
                </td>
                <td>
                  <span className="date-text">{formatDate(tx.transactionDate)}</span>
                </td>
                <td className={`text-right font-semibold ${isReceived ? 'positive' : 'negative'}`}>
                  {isReceived ? '+ ' : '- '}
                  {formatCurrency(tx.amount, tx.currency || 'INR')}
                </td>
                {!compact && (
                  <td>
                    {tx.attachment ? (
                      <a
                        href={tx.attachment}
                        target="_blank"
                        rel="noreferrer"
                        className="attachment-link"
                        title="View uploaded document"
                      >
                        <FileText size={14} />
                        <span>View file</span>
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
