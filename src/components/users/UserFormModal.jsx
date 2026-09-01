import React, { useState } from 'react';
import Modal from '../common/Modal';
import { usersApi } from '../../api/apiClient';
import { AlertCircle } from 'lucide-react';

export default function UserFormModal({ onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operator',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('All fields are required.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await usersApi.create(formData);
      window.dispatchEvent(new CustomEvent('data:refresh'));
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create team member.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Add Team Member"
      subtitle="Create a new login credential and assign access role"
      onClose={onClose}
      maxWidth="540px"
    >
      {error && (
        <div className="form-alert error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form className="grid-form" onSubmit={handleSubmit}>
        <label className="wide">
          Full Name
          <input
            type="text"
            name="name"
            placeholder="e.g. Ramesh Kumar"
            required
            value={formData.name}
            onChange={handleChange}
            autoFocus
          />
        </label>

        <label className="wide">
          Email Address
          <input
            type="email"
            name="email"
            placeholder="e.g. ramesh@finflow.test"
            required
            value={formData.email}
            onChange={handleChange}
          />
        </label>

        <label className="wide">
          Initial Password
          <input
            type="password"
            name="password"
            placeholder="Minimum 6 characters"
            required
            value={formData.password}
            onChange={handleChange}
          />
        </label>

        <label className="wide">
          Role & Access Level
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="operator">Operator (Parties & Transactions)</option>
            <option value="accounts">Accounts (Transactions & Dashboard)</option>
            <option value="admin">Admin (Full Access & User Management)</option>
          </select>
        </label>

        <div className="form-actions wide">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
