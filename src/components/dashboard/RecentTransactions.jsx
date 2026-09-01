import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight } from 'lucide-react';
import TransactionTable from '../transactions/TransactionTable';
import { useModal } from '../../context/ModalContext';

export default function RecentTransactions({ transactions = [], loading = false }) {
  const { openTransactionModal } = useModal();

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>Recent Activity</h2>
          <p>Latest money movement across your business accounts</p>
        </div>
        <div className="panel-actions">
          <Link to="/transactions" className="secondary-link">
            <span>View all</span>
            <ArrowRight size={15} />
          </Link>
          <button
            className="secondary"
            onClick={() => openTransactionModal()}
            type="button"
          >
            <Plus size={16} />
            <span>Add entry</span>
          </button>
        </div>
      </div>
      <TransactionTable transactions={transactions} compact loading={loading} />
    </section>
  );
}
