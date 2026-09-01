import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { transactionsApi, partiesApi } from '../../api/apiClient';
import { formatIsoDate } from '../../utils/formatters';
import { Paperclip, CheckCircle, AlertCircle } from 'lucide-react';

const PAYMENT_MODES = ['Bank Transfer', 'Cash', 'Cheque', 'UPI', 'Card'];

export default function TransactionFormModal({ onClose, initialPartyId = '' }) {
  const [parties, setParties] = useState([]);
  const [loadingParties, setLoadingParties] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    direction: 'received',
    amount: '',
    mode: 'Bank Transfer',
    party: initialPartyId,
    reference: '',
    notes: '',
    transactionDate: formatIsoDate(),
  });
  const [file, setFile] = useState(null);

  useEffect(() => {
    partiesApi.getAll()
      .then((data) => {
        setParties(data.filter((p) => p.active));
      })
      .catch((err) => {
        console.error('Failed to load parties:', err);
      })
      .finally(() => setLoadingParties(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.amount || Number(formData.amount) <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          data.append(key, val);
        }
      });
      if (file) {
        data.append('attachment', file);
      }

      await transactionsApi.create(data);
      // Trigger global data refresh so all active views update
      window.dispatchEvent(new CustomEvent('data:refresh'));
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record transaction. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Record Payment"
      subtitle="Log an incoming payment or outgoing business expense"
      onClose={onClose}
      maxWidth="620px"
    >
      {error && (
        <div className="form-alert error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form className="grid-form" onSubmit={handleSubmit}>
        <label>
          Movement Type
          <select
            name="direction"
            value={formData.direction}
            onChange={handleChange}
            required
          >
            <option value="received">Money Received (Inflow)</option>
            <option value="transferred">Money Transferred (Outflow)</option>
          </select>
        </label>

        <label>
          Amount (₹)
          <input
            type="number"
            name="amount"
            min="1"
            step="any"
            placeholder="e.g. 25000"
            value={formData.amount}
            onChange={handleChange}
            required
            autoFocus
          />
        </label>

        <label>
          Payment Mode
          <select
            name="mode"
            value={formData.mode}
            onChange={handleChange}
            required
          >
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label>
          Associated Party
          <select
            name="party"
            value={formData.party}
            onChange={handleChange}
            disabled={loadingParties}
          >
            <option value="">{loadingParties ? 'Loading parties...' : 'No party selected'}</option>
            {parties.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.type})
              </option>
            ))}
          </select>
        </label>

        <label>
          Reference No. / UTR
          <input
            type="text"
            name="reference"
            placeholder="e.g. UPI/428194729104 or CHQ-0092"
            value={formData.reference}
            onChange={handleChange}
          />
        </label>

        <label>
          Transaction Date
          <input
            type="date"
            name="transactionDate"
            value={formData.transactionDate}
            onChange={handleChange}
            required
          />
        </label>

        <label className="wide">
          Notes / Purpose
          <input
            type="text"
            name="notes"
            placeholder="e.g. Advance for invoice #1042"
            value={formData.notes}
            onChange={handleChange}
          />
        </label>

        <label className="wide upload-label">
          <Paperclip size={17} />
          <span>Attach payment receipt / outgoing challan (PDF or Image, max 5MB)</span>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
          {file && (
            <span className="file-selected">
              <CheckCircle size={14} /> {file.name}
            </span>
          )}
        </label>

        <div className="form-actions wide">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? 'Recording...' : 'Record Transaction'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
