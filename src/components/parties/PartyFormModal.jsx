import React, { useState } from 'react';
import Modal from '../common/Modal';
import { partiesApi } from '../../api/apiClient';
import { AlertCircle } from 'lucide-react';

export default function PartyFormModal({ party, onClose }) {
  const isEditing = !!party;
  const [formData, setFormData] = useState(
    party || {
      name: '',
      type: 'Customer',
      phone: '',
      email: '',
      taxId: '',
      address: '',
    }
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Party name is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await partiesApi.update(party._id, formData);
      } else {
        await partiesApi.create(formData);
      }

      window.dispatchEvent(new CustomEvent('data:refresh'));
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save party details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEditing ? 'Edit Party' : 'Add New Party'}
      subtitle={
        isEditing
          ? 'Update business contact and tax details'
          : 'Register a new customer, vendor, or business partner'
      }
      onClose={onClose}
      maxWidth="580px"
    >
      {error && (
        <div className="form-alert error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form className="grid-form" onSubmit={handleSubmit}>
        <label>
          Company / Contact Name
          <input
            type="text"
            name="name"
            placeholder="e.g. Acme Retail Pvt Ltd"
            required
            value={formData.name}
            onChange={handleChange}
            autoFocus
          />
        </label>

        <label>
          Relationship Type
          <select name="type" value={formData.type} onChange={handleChange}>
            <option value="Customer">Customer</option>
            <option value="Vendor">Vendor</option>
            <option value="Other">Other</option>
          </select>
        </label>

        <label>
          Phone Number
          <input
            type="tel"
            name="phone"
            placeholder="e.g. +91 98765 43210"
            value={formData.phone || ''}
            onChange={handleChange}
          />
        </label>

        <label>
          Email Address
          <input
            type="email"
            name="email"
            placeholder="e.g. accounts@acme.com"
            value={formData.email || ''}
            onChange={handleChange}
          />
        </label>

        <label>
          Tax ID / GSTIN
          <input
            type="text"
            name="taxId"
            placeholder="e.g. 27AAAAA0000A1Z5"
            value={formData.taxId || ''}
            onChange={handleChange}
          />
        </label>

        <label className="wide">
          Business Address
          <input
            type="text"
            name="address"
            placeholder="e.g. Suite 402, Trade Tower, Mumbai"
            value={formData.address || ''}
            onChange={handleChange}
          />
        </label>

        <div className="form-actions wide">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEditing ? 'Update Party' : 'Create Party'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
