import React from 'react';
import { formatDate, getDeadlineCountdown, getCategoryBadge, getLinkIndicator } from './submissionUtils';

const SubmissionTableView = ({
  tasks = [],
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
  const allTeachers = personnel.filter(p => ['teacher', 'admin', 'system_admin'].includes(p.role));

  const getTaskStats = (task) => {
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

    return {
      submittedCount,
      totalCount: targets.length,
      approvedCount,
      percentage
    };
  };

  const getRecipientLabel = (task) => {
    if (task.recipients === 'all') return 'All Faculty';
    if (task.recipients === 'advisers') return 'Advisers Only';
    if (task.recipients === 'non-advisers') return 'Non-Advisers';
    if (typeof task.recipients === 'string' && task.recipients.startsWith('subject:')) {
      return `${task.recipients.replace('subject:', '').toUpperCase()} Teachers`;
    }
    if (Array.isArray(task.recipients)) {
      return `${task.recipients.length} Selected`;
    }
    return '1 Assigned';
  };

  return (
    <div className="submission-table-wrapper">
      <table className="submission-table">
        <thead>
          <tr>
            <th>Deliverable Title</th>
            <th>Category</th>
            <th>Target Faculty</th>
            <th>Deadline</th>
            <th>{isAdmin ? 'Compliance' : 'My Status'}</th>
            <th className="th-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => {
            const userResp = responses.find(r => r.submissionId === task.id && r.userId === user?.uid);
            const countdown = getDeadlineCountdown(task.deadline);
            const isOverdue = countdown.isOverdue && !userResp;
            const isNeedsRevision = userResp?.status === 'Needs Revision';
            const categoryInfo = getCategoryBadge(task.category);
            const stats = isAdmin ? getTaskStats(task) : null;
            const isArchived = Boolean(task.isArchived);

            let teacherStatus = 'Pending';
            if (userResp) {
              teacherStatus = userResp.status || 'Submitted';
            } else if (isOverdue) {
              teacherStatus = 'Overdue';
            }

            return (
              <tr 
                key={task.id} 
                className={`table-task-row ${isArchived ? 'is-archived-row' : ''}`}
                onClick={() => onSelectTask(task)}
              >
                <td className="td-title">
                  <div className="title-cell-content">
                    <span className="task-title-text">{task.title}</span>
                    {task.folderLink && (
                      <span className="table-link-pill" title={task.folderLink}>
                        {getLinkIndicator(task).icon} Link
                      </span>
                    )}
                    {isArchived && <span className="table-archived-badge">📦 Archived</span>}
                  </div>
                  <div className="task-subdesc">{task.description?.slice(0, 75)}{task.description?.length > 75 ? '...' : ''}</div>
                </td>

                <td className="td-category">
                  <span className={`category-tag ${categoryInfo.className}`}>
                    {categoryInfo.icon} {categoryInfo.label}
                  </span>
                </td>

                <td className="td-target">
                  <span className="target-pill">{getRecipientLabel(task)}</span>
                </td>

                <td className="td-deadline">
                  <div className="deadline-date">{formatDate(task.deadline)}</div>
                  <span className={`countdown-chip-sm ${countdown.class}`}>
                    {countdown.label}
                  </span>
                </td>

                <td className="td-status">
                  {isAdmin ? (
                    <div className="table-progress-cell">
                      <div className="progress-numbers">
                        <strong>{stats.submittedCount} / {stats.totalCount}</strong>
                        <span>({stats.percentage}%)</span>
                      </div>
                      <div className="table-progress-bar">
                        <div 
                          className="table-progress-fill" 
                          style={{ width: `${stats.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <span className={`status-badge ${teacherStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                      {teacherStatus}
                    </span>
                  )}
                </td>

                <td className="td-actions" onClick={e => e.stopPropagation()}>
                  <div className="table-actions-group">
                    <button
                      type="button"
                      className="table-view-btn"
                      onClick={() => onSelectTask(task)}
                      title="View Details / Submissions"
                    >
                      {isAdmin ? 'Review' : 'Open'}
                    </button>

                    {isAdmin && (
                      <>
                        {onToggleArchive && (
                          <button
                            type="button"
                            className="table-icon-btn"
                            onClick={(e) => onToggleArchive(task.id, !isArchived, e)}
                            title={isArchived ? "Restore to Active" : "Archive Deliverable"}
                          >
                            {isArchived ? '📥' : '📦'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="table-icon-btn"
                          onClick={(e) => onEditTask(task, e)}
                          title="Edit Request"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="table-icon-btn delete-btn"
                          onClick={(e) => onDeleteTask(task.id, e)}
                          title="Delete Request"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SubmissionTableView;
