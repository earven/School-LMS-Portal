import React, { useState } from 'react';

const StudentBatchActions = ({
  selectedStudentIds = [],
  sections = [],
  isAdmin = false,
  onOpenIdCards,
  onOpenBatchPromotion,
  onBulkReassign,
  onBulkStatusUpdate,
  onBulkDelete,
  onClearSelection
}) => {
  const [showBulkReassignModal, setShowBulkReassignModal] = useState(false);
  const [bulkTargetSectionId, setBulkTargetSectionId] = useState('');
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState('Active');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  if (selectedStudentIds.length === 0) return null;

  const handleBulkReassignSubmit = async () => {
    if (!bulkTargetSectionId) {
      alert('Please select a target section.');
      return;
    }
    const targetSection = sections.find(s => s.id === bulkTargetSectionId);
    if (!targetSection) {
      alert('Target section not found.');
      return;
    }

    setIsBulkProcessing(true);
    try {
      await onBulkReassign(bulkTargetSectionId, targetSection);
      setShowBulkReassignModal(false);
      setBulkTargetSectionId('');
      alert(`Successfully reassigned ${selectedStudentIds.length} learners to ${targetSection.name}!`);
    } catch (err) {
      alert(`Reassignment failed: ${err.message}`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkStatusSubmit = async () => {
    setIsBulkProcessing(true);
    try {
      await onBulkStatusUpdate(bulkTargetStatus);
      setShowBulkStatusModal(false);
      alert(`Successfully updated status of ${selectedStudentIds.length} learners to "${bulkTargetStatus}"!`);
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDeleteSubmit = async () => {
    if (window.confirm(`Are you sure you want to permanently delete ${selectedStudentIds.length} learner records?`)) {
      setIsBulkProcessing(true);
      try {
        await onBulkDelete();
        alert(`Successfully deleted ${selectedStudentIds.length} learner records.`);
      } catch (err) {
        alert(`Bulk delete failed: ${err.message}`);
      } finally {
        setIsBulkProcessing(false);
      }
    }
  };

  return (
    <>
      {/* FLOATING BULK ACTION TOOLBAR */}
      <div className="bulk-actions-toolbar">
        <div className="bulk-toolbar-info">
          <span className="bulk-count-badge">{selectedStudentIds.length}</span>
          <span>learners selected</span>
        </div>

        <div className="bulk-toolbar-actions">
          <button 
            type="button" 
            className="bulk-btn btn-bulk-id"
            onClick={onOpenIdCards}
          >
            🪪 Print ID Cards
          </button>

          {isAdmin && (
            <button 
              type="button" 
              className="bulk-btn btn-bulk-promo"
              onClick={onOpenBatchPromotion}
            >
              🎓 Batch Promote
            </button>
          )}

          <button 
            type="button" 
            className="bulk-btn btn-bulk-reassign"
            onClick={() => setShowBulkReassignModal(true)}
          >
            🔄 Reassign Section
          </button>

          <button 
            type="button" 
            className="bulk-btn btn-bulk-status"
            onClick={() => setShowBulkStatusModal(true)}
          >
            🏷️ Update Status
          </button>

          <button 
            type="button" 
            className="bulk-btn btn-bulk-delete"
            onClick={handleBulkDeleteSubmit}
            disabled={isBulkProcessing}
          >
            🗑️ Delete Selected
          </button>

          <button 
            type="button" 
            className="bulk-btn btn-bulk-clear"
            onClick={onClearSelection}
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* BULK REASSIGN SECTION MODAL */}
      {showBulkReassignModal && (
        <div className="modal-overlay" onClick={() => setShowBulkReassignModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reassign Section for {selectedStudentIds.length} Learners</h2>
              <button type="button" className="close-btn" onClick={() => setShowBulkReassignModal(false)}>&times;</button>
            </div>
            <div style={{ padding: '1rem 0' }}>
              <div className="form-group">
                <label>Select Target Section *</label>
                <select 
                  value={bulkTargetSectionId} 
                  onChange={e => setBulkTargetSectionId(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem' }}
                >
                  <option value="">-- Choose Target Section --</option>
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.name} ({sec.gradeLevel})</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="secondary-btn" onClick={() => setShowBulkReassignModal(false)}>Cancel</button>
              <button 
                type="button" 
                className="primary-btn" 
                onClick={handleBulkReassignSubmit} 
                disabled={isBulkProcessing}
              >
                {isBulkProcessing ? 'Reassigning...' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK STATUS UPDATE MODAL */}
      {showBulkStatusModal && (
        <div className="modal-overlay" onClick={() => setShowBulkStatusModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update Status for {selectedStudentIds.length} Learners</h2>
              <button type="button" className="close-btn" onClick={() => setShowBulkStatusModal(false)}>&times;</button>
            </div>
            <div style={{ padding: '1rem 0' }}>
              <div className="form-group">
                <label>Select New Status *</label>
                <select 
                  value={bulkTargetStatus} 
                  onChange={e => setBulkTargetStatus(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem' }}
                >
                  <option value="Active">Active</option>
                  <option value="Transferred Out">Transferred Out (T/O)</option>
                  <option value="Transferred In">Transferred In (T/I)</option>
                  <option value="Dropped">Dropped Out (NLPA)</option>
                  <option value="Graduated">Graduated / Completed</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="secondary-btn" onClick={() => setShowBulkStatusModal(false)}>Cancel</button>
              <button 
                type="button" 
                className="primary-btn" 
                onClick={handleBulkStatusSubmit} 
                disabled={isBulkProcessing}
              >
                {isBulkProcessing ? 'Updating...' : 'Apply Status Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentBatchActions;
