import React from 'react';

const SettingsResetModal = ({
  showResetModal,
  setShowResetModal,
  handleConfirmReset,
}) => {
  if (!showResetModal) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-window">
        <div className="modal-warning-header">
          <span className="modal-warning-icon">⚠️</span>
          <h3>Confirm Reset Defaults</h3>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to restore default configurations? This action will overwrite all customization data (school name, email, addresses, modules, logo, and active backgrounds) instantly.</p>
          <p className="modal-subtext">This action cannot be undone once confirmed.</p>
        </div>
        <div className="modal-footer">
          <button 
            type="button" 
            className="modal-cancel-btn" 
            onClick={() => setShowResetModal(false)}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="modal-confirm-btn" 
            onClick={handleConfirmReset}
          >
            Yes, Restore Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsResetModal;
