import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './DpaConsentModal.css';

const DpaConsentModal = () => {
  const { user, acceptDPA, logout } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  // If user has already accepted or no user is logged in, don't show modal
  if (!user || user.hasAcceptedDPA) {
    return null;
  }

  const handleAccept = async () => {
    if (!agreed) return;
    setLoading(true);
    await acceptDPA();
    setLoading(false);
  };

  const handleDecline = async () => {
    await logout();
  };

  return (
    <div className="dpa-modal-overlay">
      <div className="dpa-modal-content">
        <h2>Data Privacy Act Consent & Acceptable Use</h2>
        
        <div className="dpa-modal-body">
          <p>
            Welcome to the School LMS Portal. By accessing this system, you are granted access to sensitive 
            personal information of students and school personnel.
          </p>
          <p>
            In accordance with the <strong>Data Privacy Act of 2012 (RA 10173)</strong>, you are required to uphold 
            strict confidentiality. You agree to:
          </p>
          <ul>
            <li>Process personal data only for legitimate school administrative purposes.</li>
            <li>Protect data from unauthorized access, sharing, or downloading.</li>
            <li>Ensure you log out securely when using shared devices.</li>
          </ul>
          <p>
            Failure to comply with these terms may result in disciplinary action or legal liability under the DPA.
          </p>
        </div>

        <div className="dpa-modal-consent">
          <label className="dpa-checkbox-label">
            <input 
              type="checkbox" 
              checked={agreed} 
              onChange={(e) => setAgreed(e.target.checked)} 
            />
            I have read, understood, and agree to the Data Privacy & Acceptable Use Policy.
          </label>
        </div>

        <div className="dpa-modal-actions">
          <button 
            type="button" 
            className="btn-decline" 
            onClick={handleDecline}
            disabled={loading}
          >
            Decline & Log Out
          </button>
          <button 
            type="button" 
            className="btn-accept" 
            onClick={handleAccept} 
            disabled={!agreed || loading}
          >
            {loading ? 'Saving...' : 'Accept & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DpaConsentModal;
