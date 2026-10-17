import React from 'react';

const SettingsRestoreModal = ({
  showRestoreModal,
  backupPreview,
  selectedRestoreCollections = [],
  setSelectedRestoreCollections,
  isRestoring,
  restoreProgress,
  restoreConfirmationText,
  setRestoreConfirmationText,
  setShowRestoreModal,
  setBackupPreview,
  fileInputRef,
  handleExecuteRestore,
}) => {
  if (!showRestoreModal || !backupPreview) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-window restore-modal">
        <div className="modal-header-restore">
          <span className="modal-restore-icon">📦</span>
          <div>
            <h3>Pre-Restore Snapshot Inspection</h3>
            <p className="modal-subtitle">Review contents before merging data into Firestore</p>
          </div>
        </div>

        <div className="modal-body">
          <div className="restore-meta-summary">
            <div className="meta-item">
              <span className="meta-label">Originating School:</span>
              <span className="meta-value">{backupPreview.metadata?.school?.name || 'N/A'} (ID: {backupPreview.metadata?.school?.id || 'N/A'})</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Snapshot Created:</span>
              <span className="meta-value">{backupPreview.metadata?.exportDate ? new Date(backupPreview.metadata.exportDate).toLocaleString() : 'N/A'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Total Records:</span>
              <span className="meta-value">{backupPreview.metadata?.totalRecords || 0} documents</span>
            </div>
          </div>

          <div className="restore-collections-picker">
            <h4>Select Collections to Restore:</h4>
            <div className="collections-checkbox-grid">
              {Object.keys(backupPreview.data || {}).map((colName) => {
                const count = backupPreview.data[colName]?.length || 0;
                const isChecked = selectedRestoreCollections.includes(colName);

                return (
                  <label key={colName} className={`collection-checkbox-card ${isChecked ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRestoreCollections(prev => [...prev, colName]);
                        } else {
                          setSelectedRestoreCollections(prev => prev.filter(c => c !== colName));
                        }
                      }}
                    />
                    <span className="col-name">{colName}</span>
                    <span className="col-count">{count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {isRestoring && restoreProgress && (
            <div className="restore-progress-container">
              <div className="progress-info">
                <span>Restoring <strong>{restoreProgress.collectionName}</strong>...</span>
                <span>{restoreProgress.percentage}% ({restoreProgress.current} / {restoreProgress.total})</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${restoreProgress.percentage}%` }}></div>
              </div>
            </div>
          )}

          {!isRestoring && (
            <div className="restore-confirm-box">
              <label htmlFor="confirm-phrase">
                Type <strong>RESTORE DATA</strong> to authorize this database operation:
              </label>
              <input
                id="confirm-phrase"
                type="text"
                placeholder="RESTORE DATA"
                value={restoreConfirmationText}
                onChange={(e) => setRestoreConfirmationText(e.target.value)}
                className="confirm-phrase-input"
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            type="button" 
            className="modal-cancel-btn" 
            onClick={() => {
              setShowRestoreModal(false);
              setBackupPreview(null);
              if (fileInputRef?.current) fileInputRef.current.value = '';
            }}
            disabled={isRestoring}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="modal-restore-btn" 
            onClick={handleExecuteRestore}
            disabled={isRestoring || restoreConfirmationText.trim().toUpperCase() !== 'RESTORE DATA' || selectedRestoreCollections.length === 0}
          >
            {isRestoring ? 'Restoring Records...' : 'Execute Restoration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsRestoreModal;
