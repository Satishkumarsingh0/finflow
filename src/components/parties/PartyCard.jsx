import React, { useState } from 'react';
import { Mail, Phone, MapPin, Edit2, Power } from 'lucide-react';
import { partiesApi } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';

export default function PartyCard({ party, onEdit, onStatusChange }) {
  const { isOperator, isAdmin } = useAuth();
  const [toggling, setToggling] = useState(false);

  const handleToggleStatus = async () => {
    if (!isOperator && !isAdmin) return;
    setToggling(true);
    try {
      await partiesApi.updateStatus(party._id, !party.active);
      if (onStatusChange) onStatusChange();
    } catch (err) {
      console.error('Failed to toggle party status:', err);
    } finally {
      setToggling(false);
    }
  };

  const canManage = isOperator || isAdmin;

  return (
    <article className={`party-card ${!party.active ? 'disabled' : ''}`}>
      <div className="party-top">
        <div className="avatar">
          {party.name ? party.name[0].toUpperCase() : 'P'}
        </div>
        <span className={`status-pill ${party.active ? 'active' : 'disabled'}`}>
          {party.active ? 'Active' : 'Disabled'}
        </span>
      </div>

      <div className="party-body">
        <div className="party-title-wrap">
          <span className="party-type-tag">{party.type}</span>
          <h3>{party.name}</h3>
        </div>

        <div className="party-details">
          {party.email && (
            <p className="detail-item">
              <Mail size={13} />
              <span>{party.email}</span>
            </p>
          )}
          {party.phone && (
            <p className="detail-item">
              <Phone size={13} />
              <span>{party.phone}</span>
            </p>
          )}
          {party.taxId && (
            <p className="detail-item tax-id">
              <small>GST/TAX:</small>
              <span>{party.taxId}</span>
            </p>
          )}
          {party.address && (
            <p className="detail-item address">
              <MapPin size={13} />
              <span>{party.address}</span>
            </p>
          )}
          {!party.email && !party.phone && !party.address && (
            <p className="detail-item text-muted">No contact info provided</p>
          )}
        </div>
      </div>

      {canManage && (
        <div className="party-actions">
          <button
            type="button"
            className="action-link-btn"
            onClick={() => onEdit(party)}
          >
            <Edit2 size={13} />
            <span>Edit</span>
          </button>
          <button
            type="button"
            className={`action-link-btn ${party.active ? 'danger' : 'success'}`}
            onClick={handleToggleStatus}
            disabled={toggling}
          >
            <Power size={13} />
            <span>{toggling ? '...' : party.active ? 'Disable' : 'Enable'}</span>
          </button>
        </div>
      )}
    </article>
  );
}
