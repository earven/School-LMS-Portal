import React from 'react';
import { 
  formatDate, 
  getDeadlineCountdown, 
  getLinkIndicator,
  getCategoryBadge 
} from './submissionUtils';

const SubmissionTaskCard = ({
  task,
  isAdmin = false,
  user,
  personnel = [],
  responses = [],
  adviserIds = new Set(),
  onSelectTask,
  onEditTask,
  onDeleteTask,
  onToggleArchive
}) => {
  const userResp = responses.find(r => r.submissionId === task.id && r.userId === user?.uid);
  const userStatus = userResp ? (userResp.status || 'Submitted') : 'Pending';
  const status = isAdmin ? 'Admin' : userStatus;
  
  const countdown = getDeadlineCountdown(task.deadline);
  const isOverdue = countdown.isOverdue && !userResp;
  const isNeedsRevision = userResp?.status === 'Needs Revision';
  const isArchived = Boolean(task.isArchived);
  const categoryInfo = getCategoryBadge(task.category);

  // Admin stats computation
  let stats = null;
  if (isAdmin) {
    const allTeachers = personnel.filter(p => ['teacher', 'admin', 'system_admin'].includes(p.role));
    let targets = allTeachers;
    if (task.recipients === 'advisers') {
      targets = allTeachers.filter(t => adviserIds.has(t.id));
    } else if (task.recipients === 'non-advisers') {
      targets = allTeachers.filter(t => !adviserIds.has(t.id));
    } else if (typeof task.recipients === 'string' && task.recipients.startsWith('subject:')) {
      const sub = task.recipients.replace('subject:', '');
      targets = allTeachers.filter(t => (t.subjects || []).includes(sub));
    } else if (Array.isArray(task.recipients)) {
      targets = allTeachers.filter(t => task.recipients.includes(t.id));
    } else if (typeof task.recipients === 'string' && task.recipients !== 'all') {
      targets = allTeachers.filter(t => t.id === task.recipients);
    }

    const targetIds = new Set(targets.map(t => t.id));
    const taskResponses = responses.filter(r => r.submissionId === task.id && targetIds.has(r.userId));
    const submittedCount = taskResponses.length;
    const approvedCount = taskResponses.filter(r => r.status === 'Approved').length;
    const percentage = targets.length > 0 ? Math.round((submittedCount / targets.length) * 100) : 0;

    stats = {
      count: submittedCount,
      total: targets.length,
      approved: approvedCount,
      percentage
    };
  }

  const isTargeted = task.recipients !== 'all';
  const targetPerson = isTargeted && typeof task.recipients === 'string' 
    ? personnel.find(p => p.id === task.recipients) 
    : null;
  const targetCount = Array.isArray(task.recipients) ? task.recipients.length : null;

  return (
    <div 
      className={`task-card ${status.toLowerCase().replace(/\s+/g, '-')} ${isOverdue ? 'overdue' : ''} ${isNeedsRevision ? 'needs-revision' : ''} ${isArchived ? 'is-archived' : ''}`}
      onClick={() => onSelectTask(task)}
    >
      <div className="task-card-header">
        <div className="header-badges-left">
          <span className={`status-badge ${status.toLowerCase().replace(/\s+/g, '-')}`}>
            {isAdmin ? `${stats?.count || 0} / ${stats?.total || 0} Submitted` : (userResp?.status || status)}
          </span>
          <span className={`category-tag ${categoryInfo.className}`}>
            {categoryInfo.icon} {categoryInfo.label}
          </span>
          {isArchived && <span className="archived-tag">📦 Archived</span>}
        </div>
        <span className={`countdown-chip ${countdown.class}`}>
          {countdown.label}
        </span>
      </div>

      <h3>{task.title}</h3>

      {isAdmin && (
        <p className="task-target-badge">
          {task.recipients === 'all' && '🎯 Target: All Teachers'}
          {task.recipients === 'advisers' && '🎯 Target: Advisers Only'}
          {task.recipients === 'non-advisers' && '🎯 Target: Non-Advisers Only'}
          {typeof task.recipients === 'string' && task.recipients.startsWith('subject:') && `🎯 Target: ${task.recipients.replace('subject:', '').toUpperCase()} Teachers Only`}
          {targetPerson && `🎯 Target: ${targetPerson.fullName || targetPerson.email}`}
          {targetCount && `🎯 Target: ${targetCount} Selected Teachers`}
        </p>
      )}

      {/* Progress bar for admin */}
      {isAdmin && stats && (
        <div className="progress-container">
          <div className="progress-bar-label">
            <span>Progress ({stats.approved} Approved)</span>
            <span>{stats.percentage}%</span>
          </div>
          <div className="progress-track">
            <div 
              className="progress-fill" 
              style={{ width: `${stats.percentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Teacher Revision Notice Banner */}
      {!isAdmin && isNeedsRevision && (
        <div className="card-revision-alert">
          <span>⚠️ <strong>Revision Requested:</strong> {userResp.feedback || 'Please update and re-submit your report.'}</span>
        </div>
      )}

      <p className="task-desc">{task.description}</p>

      {task.folderLink && (() => {
        const indicator = getLinkIndicator(task);
        return (
          <div className="task-folder-indicator">
            {indicator.icon} {indicator.label}
          </div>
        );
      })()}

      <div className="task-footer">
        <span className="created-at">Deadline: {formatDate(task.deadline)}</span>
        {isAdmin && (
          <div className="task-actions" onClick={e => e.stopPropagation()}>
            {onToggleArchive && (
              <button 
                type="button"
                className={`archive-task-icon ${isArchived ? 'unarchive' : ''}`}
                onClick={(e) => onToggleArchive(task.id, !isArchived, e)} 
                title={isArchived ? "Restore Task to Active" : "Archive Task"}
              >
                {isArchived ? '📥' : '📦'}
              </button>
            )}
            <button 
              type="button"
              className="edit-task-icon" 
              onClick={(e) => onEditTask(task, e)} 
              title="Edit Task"
            >
              ✏️
            </button>
            <button 
              type="button"
              className="delete-task-icon" 
              onClick={(e) => onDeleteTask(task.id, e)} 
              title="Delete Task"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmissionTaskCard;
