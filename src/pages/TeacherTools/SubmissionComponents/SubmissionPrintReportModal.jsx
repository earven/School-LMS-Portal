import React from 'react';
import { formatDate, formatDateTime } from './submissionUtils';

const SubmissionPrintReportModal = ({
  isOpen,
  onClose,
  task,
  settings,
  user,
  personnel = [],
  responses = [],
  adviserIds = new Set()
}) => {
  if (!isOpen || !task) return null;

  const allTeachers = personnel.filter(p => ['teacher', 'admin', 'system_admin'].includes(p.role));

  const getTargetTeachers = () => {
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

  const targets = getTargetTeachers();
  const targetIds = new Set(targets.map(t => t.id));
  const taskResponses = responses.filter(r => r.submissionId === task.id && targetIds.has(r.userId));
  const submittedCount = taskResponses.length;
  const compliancePercentage = targets.length > 0 ? Math.round((submittedCount / targets.length) * 100) : 0;
  const responseMap = new Map(taskResponses.map(r => [r.userId, r]));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content print-modal-content" onClick={e => e.stopPropagation()}>
        <div className="print-modal-header no-print">
          <h2>Printable Compliance Matrix</h2>
          <div className="print-modal-actions">
            <button type="button" className="primary-btn" onClick={() => window.print()}>🖨️ Print / Save as PDF</button>
            <button type="button" className="close-x" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="printable-report-area">
          <div className="report-header-banner">
            <h2>{settings?.schoolName || 'DEPARTMENT OF EDUCATION'}</h2>
            <p className="report-school-sub">School LMS Portal • Faculty Submission Compliance Report</p>
            <div className="report-meta-box">
              <div><strong>Report Task:</strong> {task.title}</div>
              <div><strong>Deadline:</strong> {formatDate(task.deadline)}</div>
              <div><strong>Date Generated:</strong> {new Date().toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            </div>
          </div>

          <div className="report-stats-summary">
            <div className="report-stats-grid">
              <div className="stat-pill"><strong>Total Target:</strong> {targets.length}</div>
              <div className="stat-pill"><strong>Complied / Submitted:</strong> {submittedCount}</div>
              <div className="stat-pill"><strong>Pending:</strong> {Math.max(0, targets.length - submittedCount)}</div>
              <div className="stat-pill"><strong>Compliance Rate:</strong> {compliancePercentage}%</div>
            </div>
          </div>

          <table className="printable-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Teacher Name</th>
                <th>Position / Designation</th>
                <th>Status</th>
                <th>Date Submitted</th>
                <th>Signature / Remarks</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((t, index) => {
                const resp = responseMap.get(t.id);
                const isOverdue = new Date(task.deadline) < new Date() && !resp;
                const status = resp ? (resp.status || 'Submitted') : (isOverdue ? 'Overdue' : 'Pending');

                return (
                  <tr key={t.id}>
                    <td>{index + 1}</td>
                    <td><strong>{t.fullName || t.email}</strong></td>
                    <td>{t.position || 'Teacher'} {adviserIds.has(t.id) ? '(Adviser)' : ''}</td>
                    <td>
                      <span className={`print-status-tag ${status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {status}
                      </span>
                    </td>
                    <td>{resp ? formatDateTime(resp.submittedAt) : '—'}</td>
                    <td>{resp?.remarks || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="report-sign-footer">
            <div className="sign-block">
              <p>Prepared by:</p>
              <div className="sign-line"></div>
              <strong>{user?.fullName || 'School Administrator'}</strong>
              <span>LMS Administrator / Coordinator</span>
            </div>
            <div className="sign-block">
              <p>Noted by:</p>
              <div className="sign-line"></div>
              <strong>{settings?.principalName || 'School Principal / Head'}</strong>
              <span>School Head / Principal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionPrintReportModal;
