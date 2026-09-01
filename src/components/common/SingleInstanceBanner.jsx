import React, { useState, useEffect } from 'react';
import { singleInstance } from '../../utils/singleInstance';
import { AlertCircle, ArrowRight } from 'lucide-react';

export default function SingleInstanceBanner() {
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [isPrimary, setIsPrimary] = useState(singleInstance.isPrimary);

  useEffect(() => {
    const unsubscribe = singleInstance.subscribe((event) => {
      if (event.type === 'DUPLICATE_OPENED') {
        setDuplicateOpen(true);
      } else if (event.type === 'LOST_PRIMARY') {
        setIsPrimary(false);
      }
    });
    return unsubscribe;
  }, []);

  if (!duplicateOpen && isPrimary) return null;

  return (
    <div className="single-instance-banner">
      <div className="banner-content">
        <AlertCircle size={18} />
        <span>
          {!isPrimary
            ? 'Finflow is currently active in another window. Running in single open mode.'
            : 'Finflow was opened in another tab. Keep this as your primary active window?'}
        </span>
      </div>
      <button
        className="banner-action-btn"
        onClick={() => {
          singleInstance.claimPrimary();
          setIsPrimary(true);
          setDuplicateOpen(false);
        }}
      >
        Make Active Window <ArrowRight size={14} />
      </button>
    </div>
  );
}
