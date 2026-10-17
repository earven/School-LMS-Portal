import React, { useState, useEffect } from 'react';
import { 
  formatDate, 
  formatDateTime, 
  getLinkButtonProps, 
  getBannerProps, 
  detectLinkType 
} from './submissionUtils';

const SubmissionDetailModal = ({
  isOpen,
  onClose,
  task,
  isAdmin = false,
  user,
  personnel = [],
  responses = [],
  adviserIds = new Set(),
  onTeacherSubmit,
  onAdminReview,
  onBatchApprove,
  onSendReminders,
  onExportCSV,
  onOpenPrintReport,
  sendingReminders = false
}) => {
  // Teacher response state
  const [responseForm, setResponseForm] = useState({ remarks: '', link: '' });

  // Admin filter & single review state
  const [adminResponseFilter, setAdminResponseFilter] = useState('all');
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'Approved', feedback: '' });
  const [selectedResponseIds, setSelectedResponseIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setSelectedResponse(null);
      setSelectedResponseIds([]);
      setAdminResponseFilter('all');

      if (!isAdmin && user) {
        const existing = responses.find(r => r.submissionId === task.id && r.userId === user.uid);
        if (existing) {
          setResponseForm({
            remarks: existing.remarks || '',
            link: existing.link || ''
          });
        } else {
          setResponseForm({ remarks: '', link: '' });
        }
      }
    }
  }, [task, isAdmin, user, responses, isOpen]);

  if (!isOpen || !task) return null;

  const getUserStatus = (taskId) => {
    const response = responses.find(r => r.submissionId === taskId && r.userId === user?.uid);
    return response ? (response.status || 'Submitted') : 'Pending';
  };

  const getTargetTeachers = () => {
    const allTeachers = personnel.filter(p => ['teacher', 'admin', 'system_admin'].includes(p.role));
    if (!task) return [];
    if (task.recipients === 'all') return allTeachers;
    if (task.recipients === 'advisers') return allTeachers.filter(t => adviserIds.has(t.id));
    if (task.recipients === 'non-advisers') return allTeachers.filter(t => !adviserIds.has(t.id));
    if (typeof task.recipients === 'string' && task.recipients.startsWith('subject:')) {
      const sub = task.recipients.replace('subject:', '');
      return allTeachers.filter(t => (t.subjects || []).includes(sub));
    }
    if (Array.isArray(task.recipients)) {
      return allTeachers.filter(t => task.recipients.includes(t.id));
    }
    if (typeof task.recipients === 'string') {
      return allTeachers.filter(t => t.id === task.recipients);
    }
    return [];
  };

  const handleSelectResponseForReview = (row) => {
    if (!row.response) return;
    setSelectedResponse(row.response);
    setReviewForm({
      status: row.response.status || 'Approved',
      feedback: row.response.feedback || ''
    });
  };

  const handleSaveReviewSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onAdminReview(selectedResponse.id, reviewForm);
      setSelectedResponse(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTeacherSubmitForm = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onTeacherSubmit(responseForm);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchApproveClick = async () => {
    if (selectedResponseIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await onBatchApprove(selectedResponseIds);
      setSelectedResponseIds([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const linkBtnProps = getLinkButtonProps(task);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content detail-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task.title}</h2>
          <button type="button" className="close-x" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body-scroll">
          <div className="task-info">
            <p className="modal-desc">{task.description}</p>
            <div className="meta-grid">
              <div className="meta-item">
                <label>Deadline</label>
                <span>{formatDate(task.deadline)}</span>
              </div>
              <div className="meta-item">
                <label>Status</label>
                <span className={`status-text ${getUserStatus(task.id).toLowerCase()}`}>
                  {getUserStatus(task.id)}
                </span>
              </div>
            </div>
            {task.folderLink && (
              <a 
                href={task.folderLink} 
                target="_blank" 
                rel="noreferrer" 
                className="folder-access-btn"
              >
                {linkBtnProps.icon} {linkBtnProps.label}
              </a>
            )}
          </div>

          {isAdmin ? (
            selectedResponse ? (
              <div className="response-review-panel">
                <button 
                  type="button" 
                  className="back-to-list-btn" 
                  onClick={() => setSelectedResponse(null)}
                >
                  ← Back to Submission List
                </button>
                <h3>Review Teacher Submission</h3>
                
                <div className="review-teacher-card">
                  <strong>Teacher:</strong> {personnel.find(p => p.id === selectedResponse.userId)?.fullName || selectedResponse.userName || 'Unknown'}
                  <br />
                  <strong>Submitted At:</strong> {formatDateTime(selectedResponse.submittedAt)}
                </div>

                <div className="review-details">
                  <div className="review-detail-item" style={{ marginBottom: '1rem' }}>
                    <label>Submission Link / Document Proof</label>
                    {selectedResponse.link ? (
                      <a href={selectedResponse.link} target="_blank" rel="noreferrer" className="folder-access-btn inline">
                        🔗 Open Submitted Document
                      </a>
                    ) : (
                      <span className="no-link-text">No document link attached</span>
                    )}
                  </div>

                  <div className="review-detail-item">
                    <label>Teacher's Remarks</label>
                    <p className="remarks-box">{selectedResponse.remarks || 'No remarks provided'}</p>
                  </div>
                </div>

                <form onSubmit={handleSaveReviewSubmit} className="review-form">
                  <div className="form-group">
                    <label>Review Decision</label>
                    <select
                      value={reviewForm.status}
                      onChange={e => setReviewForm({ ...reviewForm, status: e.target.value })}
                    >
                      <option value="Approved">✅ Approved (Complied)</option>
                      <option value="Needs Revision">⚠️ Needs Revision (Action Required)</option>
                      <option value="Submitted">⏳ Pending Further Review</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Feedback / Revision Instructions</label>
                    <textarea
                      placeholder="Provide clear feedback or specify required corrections..."
                      rows={3}
                      value={reviewForm.feedback}
                      onChange={e => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                    ></textarea>
                  </div>

                  <div className="modal-actions no-pad">
                    <button type="button" className="cancel-btn" onClick={() => setSelectedResponse(null)}>Cancel</button>
                    <button type="submit" className="submit-btn" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : 'Save Review'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="admin-responses">
                <div className="admin-responses-header">
                  <div className="admin-responses-title">
                    <h3>Submission List Status</h3>
                    <p className="subtitle-small">Track targeted teacher responses (Click a submitted row to inspect and review)</p>
                  </div>
                  <div className="admin-actions-row">
                    <select 
                      value={adminResponseFilter}
                      onChange={e => setAdminResponseFilter(e.target.value)}
                      className="admin-response-select"
                    >
                      <option value="all">All Targets</option>
                      <option value="submitted">Submitted Only</option>
                      <option value="pending">Pending Only</option>
                      <option value="approved">Approved Only</option>
                      <option value="revision">Needs Revision Only</option>
                    </select>

                    <button 
                      type="button"
                      className="nudge-btn" 
                      onClick={onSendReminders}
                      disabled={sendingReminders}
                      title="Send a push notification reminder to all pending teachers"
                    >
                      {sendingReminders ? 'Sending…' : '📢 Remind Pending'}
                    </button>

                    <button 
                      type="button"
                      className="print-report-btn" 
                      onClick={onOpenPrintReport}
                      title="View and print compliance report matrix"
                    >
                      🖨️ Print Report
                    </button>

                    <button type="button" className="export-csv-btn" onClick={onExportCSV}>
                      📥 Export CSV
                    </button>
                  </div>
                </div>

                {/* Batch Action Toolbar */}
                {selectedResponseIds.length > 0 && (
                  <div className="batch-actions-toolbar">
                    <span>{selectedResponseIds.length} submission(s) selected</span>
                    <button 
                      type="button" 
                      className="batch-approve-btn" 
                      onClick={handleBatchApproveClick}
                      disabled={isSubmitting}
                    >
                      ✓ Batch Approve Selected
                    </button>
                    <button 
                      type="button" 
                      className="batch-clear-btn" 
                      onClick={() => setSelectedResponseIds([])}
                    >
                      Clear Selection
                    </button>
                  </div>
                )}

                <div className="responses-table">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                const taskResponses = responses.filter(r => r.submissionId === task.id);
                                setSelectedResponseIds(taskResponses.map(r => r.id));
                              } else {
                                setSelectedResponseIds([]);
                              }
                            }}
                            aria-label="Select all responses"
                          />
                        </th>
                        <th>Teacher</th>
                        <th>Status</th>
                        <th>Date Submitted</th>
                        <th>Submission Proof / Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const targets = getTargetTeachers();
                        const taskResponses = responses.filter(r => r.submissionId === task.id);
                        const responseMap = new Map(taskResponses.map(r => [r.userId, r]));

                        const rows = targets.map(t => {
                          const resp = responseMap.get(t.id);
                          const isOverdue = new Date(task.deadline) < new Date() && !resp;
                          const statusLabel = resp ? (resp.status || 'Submitted') : (isOverdue ? 'Overdue' : 'Pending');
                          return { teacher: t, response: resp, status: statusLabel };
                        }).filter(row => {
                          if (adminResponseFilter === 'submitted') return !!row.response;
                          if (adminResponseFilter === 'pending') return !row.response;
                          if (adminResponseFilter === 'approved') return row.response?.status === 'Approved';
                          if (adminResponseFilter === 'revision') return row.response?.status === 'Needs Revision';
                          return true;
                        });

                        if (rows.length === 0) {
                          return (
                            <tr>
                              <td colSpan="5" className="empty-row">
                                No matching teacher records found for this filter.
                              </td>
                            </tr>
                          );
                        }

                        return rows.map(({ teacher, response, status }) => (
                          <tr 
                            key={teacher.id} 
                            className={`status-row-${status.toLowerCase().replace(/\s+/g, '-')} ${response ? 'clickable-row' : ''}`}
                            onClick={() => response && handleSelectResponseForReview({ teacher, response, status })}
                          >
                            <td onClick={(e) => e.stopPropagation()}>
                              {response && (
                                <input 
                                  type="checkbox"
                                  checked={selectedResponseIds.includes(response.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedResponseIds(prev => [...prev, response.id]);
                                    } else {
                                      setSelectedResponseIds(prev => prev.filter(id => id !== response.id));
                                    }
                                  }}
                                  aria-label={`Select ${teacher.fullName || teacher.email}`}
                                />
                              )}
                            </td>
                            <td>
                              <div className="table-teacher-info">
                                <span className="table-teacher-name">{teacher.fullName || teacher.email}</span>
                                <span className="table-teacher-sub">{teacher.position || 'Teacher'} {adviserIds.has(teacher.id) ? '• Adviser' : ''}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`status-pill ${status.toLowerCase().replace(/\s+/g, '-')}`}>
                                {status}
                              </span>
                            </td>
                            <td>
                              {response ? formatDateTime(response.submittedAt) : '—'}
                            </td>
                            <td>
                              {response ? (
                                <div className="submission-details-td">
                                  {response.link && (
                                    <a 
                                      href={response.link} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="table-submission-link"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      🔗 View Link
                                    </a>
                                  )}
                                  {response.remarks && <p className="mini-remarks">{response.remarks}</p>}
                                  {response.feedback && <p className="mini-feedback"><strong>Feedback:</strong> {response.feedback}</p>}
                                </div>
                              ) : (
                                <span className="pending-text-placeholder">Awaiting submission</span>
                              )}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            <div className="teacher-submit-form">
              {(() => {
                const banner = getBannerProps(task);
                const userResponse = responses.find(r => r.submissionId === task.id && r.userId === user?.uid);
                return (
                  <>
                    {userResponse && userResponse.status === 'Needs Revision' && (
                      <div className="review-feedback-banner needs-revision">
                        <strong>⚠️ Revision Requested by Administrator</strong>
                        <p><strong>Admin Feedback:</strong> {userResponse.feedback || 'Please correct your uploaded file and update your submission below.'}</p>
                      </div>
                    )}
                    {userResponse && userResponse.status === 'Approved' && (
                      <div className="review-feedback-banner approved">
                        <strong>✅ Submission Approved</strong>
                        <p>Your report has been verified and approved by the school administrator.</p>
                      </div>
                    )}
                    <div className={`onedrive-banner ${(task.linkType || detectLinkType(task.folderLink))}-banner-type`}>
                      <div className="onedrive-icon">{banner.icon}</div>
                      <div className="onedrive-text">
                        <strong>{banner.title}</strong>
                        <p>{banner.text}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
              <form onSubmit={handleTeacherSubmitForm}>
                <div className="form-group">
                  <label>Submission Link / Document URL (Optional)</label>
                  <input 
                    type="url" 
                    placeholder="Paste link here if you want to link the specific file or form response..." 
                    value={responseForm.link}
                    onChange={e => setResponseForm({ ...responseForm, link: e.target.value })}
                  />
                  <p className="field-hint">You can leave this blank if you submitted on the external link directly and do not need to attach a separate link.</p>
                </div>
                <div className="form-group">
                  <label>Remarks / Notes</label>
                  <textarea 
                    placeholder="e.g., Done uploading my report for the month."
                    rows={3}
                    value={responseForm.remarks}
                    onChange={e => setResponseForm({ ...responseForm, remarks: e.target.value })}
                  ></textarea>
                </div>
                <button type="submit" className="submit-btn full" disabled={isSubmitting}>
                  {isSubmitting 
                    ? 'Submitting...' 
                    : (getUserStatus(task.id) === 'Submitted' || getUserStatus(task.id) === 'Needs Revision' 
                        ? 'Update / Resubmit Report' 
                        : 'Submit Report')}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetailModal;
