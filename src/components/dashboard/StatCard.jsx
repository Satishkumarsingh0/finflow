import React from 'react';

export default function StatCard({ label, value, kind, subtitle }) {
  const defaultSubtitle = {
    in: 'Incoming funds',
    out: 'Outgoing funds',
    balance: 'Available balance',
    neutral: 'Business contacts',
  }[kind] || '';

  return (
    <div className={`stat ${kind}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{subtitle || defaultSubtitle}</span>
    </div>
  );
}
