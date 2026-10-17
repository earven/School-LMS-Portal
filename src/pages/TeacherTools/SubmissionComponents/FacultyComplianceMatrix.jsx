import React, { useState, useMemo } from 'react';
import { formatDate, getDeadlineCountdown, getCategoryBadge, formatDateTime } from './submissionUtils';

const FacultyComplianceMatrix = ({
  tasks = [],
  personnel = [],
  responses = [],
  sections = [],
  adviserIds = new Set(),
  onSelectTaskForReview,
  onSendSingleReminder
}) => {
  const [facultySearch, setFacultySearch] = useState('');
  const [facultyRoleFilter, setFacultyRoleFilter] = useState('all'); // 'all' | 'advisers' | 'non-advisers'
  const [selectedCellDetail, setSelectedCellDetail] = useState(null);

  // Map section adviser to section name
  const adviserSectionMap = useMemo(() => {
    const map = new Map();
    sections.forEach(sec => {
      if (sec.adviserId) {
        map.set(sec.adviserId, sec.name || `Grade ${sec.gradeLevel || ''}`);
      }
    });
    return map;
  }, [sections]);

  // Target all teachers / school personnel
  const allTeachers = useMemo(() => {
    return personnel.filter(p => ['teacher', 'admin', 'system_admin'].includes(p.role));
  }, [personnel]);

  // Check if a teacher is targeted for a specific task
  const isTeacherTargeted = (teacherId, task) => {
    if (!task) return false;
    if (task.recipients === 'all') return true;
    if (task.recipients === 'advisers') return adviserIds.has(teacherId);
    if (task.recipients === 'non-advisers') return !adviserIds.has(teacherId);
    if (typeof task.recipients === 'string' && task.recipients.startsWith('subject:')) {
      const sub = task.recipients.replace('subject:', '');
      const teacher = personnel.find(p => p.id === teacherId);
      return (teacher?.subjects || []).includes(sub);
    }
    if (Array.isArray(task.recipients)) return task.recipients.includes(teacherId);
    if (typeof task.recipients === 'string') return task.recipients === teacherId;
    return false;
  };

  // Filter faculty based on search and role
  const filteredFaculty = useMemo(() => {
    return allTeachers.filter(teacher => {
      const name = (teacher.fullName || teacher.name || teacher.email || '').toLowerCase();
      const matchesSearch = name.includes(facultySearch.toLowerCase());

      const isAdviser = adviserIds.has(teacher.id);
      let matchesRole = true;
      if (facultyRoleFilter === 'advisers') matchesRole = isAdviser;
      else if (facultyRoleFilter === 'non-advisers') matchesRole = !isAdviser;

      return matchesSearch && matchesRole;
    });
  }, [allTeachers, facultySearch, facultyRoleFilter, adviserIds]);

  // Quick lookup map: `${taskId}_${teacherId}` => response
  const responseMap = useMemo(() => {
    const map = new Map();
    responses.forEach(r => {
      map.set(`${r.submissionId}_${r.userId}`, r);
    });
    return map;
  }, [responses]);

  // Compute cell data for a given teacher & task
  const getCellData = (teacher, task) => {
    const isTargeted = isTeacherTargeted(teacher.id, task);
    if (!isTargeted) {
      return {
        status: 'not-assigned',
        label: '—',
        badgeClass: 'cell-na',
        isTargeted: false,
        response: null
      };
    }

    const resp = responseMap.get(`${task.id}_${teacher.id}`);
    const isPastDue = new Date(task.deadline) < new Date();

    if (resp) {
      if (resp.status === 'Approved') {
        return {
          status: 'approved',
          label: 'Approved',
          icon: '✅',
          badgeClass: 'cell-approved',
          isTargeted: true,
          response: resp
        };
      }
      if (resp.status === 'Needs Revision') {
        return {
          status: 'revision',
          label: 'Revision',
          icon: '✏️',
          badgeClass: 'cell-revision',
          isTargeted: true,
          response: resp
        };
      }
      return {
        status: 'submitted',
        label: 'Submitted',
        icon: '📤',
        badgeClass: 'cell-submitted',
        isTargeted: true,
        response: resp
      };
    }

    if (isPastDue) {
      return {
        status: 'overdue',
        label: 'Overdue',
        icon: '⚠️',
        badgeClass: 'cell-overdue',
        isTargeted: true,
        response: null
      };
    }

    return {
      status: 'pending',
      label: 'Pending',
      icon: '⏳',
      badgeClass: 'cell-pending',
      isTargeted: true,
      response: null
    };
  };

  // Compute teacher overall compliance
  const getTeacherCompliance = (teacher) => {
    let assignedCount = 0;
    let submittedCount = 0;
    let approvedCount = 0;

    tasks.forEach(task => {
      if (isTeacherTargeted(teacher.id, task)) {
        assignedCount++;
        const resp = responseMap.get(`${task.id}_${teacher.id}`);
        if (resp) {
          submittedCount++;
          if (resp.status === 'Approved') approvedCount++;
        }
      }
    });

    const percentage = assignedCount > 0 ? Math.round((submittedCount / assignedCount) * 100) : 100;
    return { assignedCount, submittedCount, approvedCount, percentage };
  };

  // Compute task column stats
  const getTaskColumnStats = (task) => {
    let assigned = 0;
    let submitted = 0;

    allTeachers.forEach(t => {
      if (isTeacherTargeted(t.id, task)) {
        assigned++;
        if (responseMap.has(`${task.id}_${t.id}`)) {
          submitted++;
        }
      }
    });

    const pct = assigned > 0 ? Math.round((submitted / assigned) * 100) : 0;
    return { assigned, submitted, pct };
  };

  // Overall matrix summary
  const matrixSummary = useMemo(() => {
    let totalCells = 0;
    let completedCells = 0;

    allTeachers.forEach(t => {
      tasks.forEach(task => {
        if (isTeacherTargeted(t.id, task)) {
          totalCells++;
          if (responseMap.has(`${task.id}_${t.id}`)) {
            completedCells++;
          }
        }
      });
    });

    const complianceRate = totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 100;
    return { totalCells, completedCells, complianceRate };
  }, [allTeachers, tasks, responseMap]);

  // Export Matrix to CSV
  const handleExportMatrixCSV = () => {
    if (tasks.length === 0 || filteredFaculty.length === 0) return;

    const taskHeaders = tasks.map(t => `"${t.title.replace(/"/g, '""')}"`);
    const headers = [
      'Faculty Member',
      'Email',
      'Role / Position',
      'Advisory Section',
      'Assigned Requirements',
      'Completed Submissions',
      'Faculty Compliance %',
      ...taskHeaders
    ];

    const rows = filteredFaculty.map(teacher => {
      const comp = getTeacherCompliance(teacher);
      const advisory = adviserSectionMap.get(teacher.id) || 'None';

      const taskStatuses = tasks.map(task => {
        const cell = getCellData(teacher, task);
        if (!cell.isTargeted) return '"N/A (Not Assigned)"';
        if (cell.response) {
          return `"${cell.label}${cell.response.link ? ` [${cell.response.link}]` : ''}"`;
        }
        return `"${cell.label}"`;
      });

      return [
        `"${teacher.fullName || teacher.name || 'Unnamed'}"`,
        `"${teacher.email || ''}"`,
        `"${teacher.position || teacher.role || 'Teacher'}"`,
        `"${advisory}"`,
        comp.assignedCount,
        comp.submittedCount,
        `"${comp.percentage}%"`,
        ...taskStatuses
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const linkObj = document.createElement('a');
    linkObj.href = URL.createObjectURL(blob);
    linkObj.download = `Faculty_Compliance_Matrix_${new Date().toISOString().slice(0, 10)}.csv`;
    linkObj.style.visibility = 'hidden';
    document.body.appendChild(linkObj);
    linkObj.click();
    document.body.removeChild(linkObj);
  };

  const handleCellClick = (teacher, task, cell) => {
    if (!cell.isTargeted) return;
    setSelectedCellDetail({
      teacher,
      task,
      cell
    });
  };

  return (
    <div className="compliance-matrix-container">
      {/* MATRIX CONTROL HEADER */}
      <div className="matrix-toolbar no-print">
        <div className="matrix-toolbar-left">
          <div className="matrix-search-box">
            <span className="matrix-search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Filter faculty by name..." 
              value={facultySearch}
              onChange={e => setFacultySearch(e.target.value)}
              className="matrix-search-input"
            />
          </div>

          <div className="matrix-role-pills">
            <button 
              type="button"
              className={`matrix-role-btn ${facultyRoleFilter === 'all' ? 'active' : ''}`}
              onClick={() => setFacultyRoleFilter('all')}
            >
              All Faculty ({allTeachers.length})
            </button>
            <button 
              type="button"
              className={`matrix-role-btn ${facultyRoleFilter === 'advisers' ? 'active' : ''}`}
              onClick={() => setFacultyRoleFilter('advisers')}
            >
              Advisers ({allTeachers.filter(t => adviserIds.has(t.id)).length})
            </button>
            <button 
              type="button"
              className={`matrix-role-btn ${facultyRoleFilter === 'non-advisers' ? 'active' : ''}`}
              onClick={() => setFacultyRoleFilter('non-advisers')}
            >
              Non-Advisers ({allTeachers.filter(t => !adviserIds.has(t.id)).length})
            </button>
          </div>
        </div>

        <div className="matrix-toolbar-right">
          <div className="matrix-stat-chip">
            <span className="stat-label">Matrix Compliance:</span>
            <span className="stat-value">{matrixSummary.complianceRate}%</span>
            <span className="stat-sub">({matrixSummary.completedCells}/{matrixSummary.totalCells} slots)</span>
          </div>

          <button 
            type="button" 
            className="matrix-export-btn"
            onClick={handleExportMatrixCSV}
            title="Download complete matrix report as CSV spreadsheet"
          >
            📊 Export Matrix CSV
          </button>
        </div>
      </div>

      {/* MATRIX TABLE */}
      {tasks.length === 0 ? (
        <div className="empty-matrix-card">
          <div className="empty-icon">📊</div>
          <h3>No Active Deliverables</h3>
          <p>Create submission tasks or switch from archived history to view the compliance matrix.</p>
        </div>
      ) : filteredFaculty.length === 0 ? (
        <div className="empty-matrix-card">
          <div className="empty-icon">👥</div>
          <h3>No Faculty Found</h3>
          <p>No faculty members match your filter criteria.</p>
        </div>
      ) : (
        <div className="matrix-scroll-wrapper">
          <table className="matrix-table">
            <thead>
              <tr>
                <th className="sticky-col-header faculty-col">
                  Faculty Member
                </th>
                <th className="sticky-col-header comp-col">
                  Compliance
                </th>
                {tasks.map(task => {
                  const countdown = getDeadlineCountdown(task.deadline);
                  const colStats = getTaskColumnStats(task);
                  const cat = getCategoryBadge(task.category);

                  return (
                    <th key={task.id} className="task-header-col">
                      <div className="task-col-content">
                        <span className={`task-col-category ${cat.className}`}>
                          {cat.label}
                        </span>
                        <div className="task-col-title" title={task.title}>
                          {task.title}
                        </div>
                        <div className="task-col-meta">
                          <span className="task-col-deadline">Due {formatDate(task.deadline)}</span>
                          <span className={`countdown-chip-xs ${countdown.class}`}>
                            {countdown.label}
                          </span>
                        </div>
                        <div className="task-col-progress">
                          <span>{colStats.submitted}/{colStats.assigned}</span>
                          <span className="pct">({colStats.pct}%)</span>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredFaculty.map(teacher => {
                const comp = getTeacherCompliance(teacher);
                const advisorySection = adviserSectionMap.get(teacher.id);

                return (
                  <tr key={teacher.id} className="matrix-faculty-row">
                    {/* Faculty Profile Column (Sticky Left) */}
                    <td className="sticky-cell faculty-cell">
                      <div className="faculty-name-row">
                        <strong>{teacher.fullName || teacher.name || teacher.email}</strong>
                        {advisorySection && (
                          <span className="advisory-badge" title={`Adviser for ${advisorySection}`}>
                            🏫 {advisorySection}
                          </span>
                        )}
                      </div>
                      <div className="faculty-role-sub">
                        {teacher.position || teacher.role || 'Teacher'}
                        {teacher.department ? ` • ${teacher.department}` : ''}
                      </div>
                    </td>

                    {/* Overall Compliance Column (Sticky Left 2) */}
                    <td className="sticky-cell comp-cell">
                      <div className="comp-badge-wrapper">
                        <span className={`comp-pct-badge ${comp.percentage >= 80 ? 'high' : comp.percentage >= 50 ? 'med' : 'low'}`}>
                          {comp.percentage}%
                        </span>
                        <span className="comp-fraction">
                          {comp.submittedCount}/{comp.assignedCount}
                        </span>
                      </div>
                    </td>

                    {/* Task Status Cells */}
                    {tasks.map(task => {
                      const cell = getCellData(teacher, task);

                      return (
                        <td 
                          key={task.id} 
                          className={`matrix-status-cell ${cell.isTargeted ? 'clickable' : 'na'}`}
                          onClick={() => handleCellClick(teacher, task, cell)}
                          title={cell.isTargeted ? `${teacher.fullName || teacher.email} - ${task.title}: ${cell.label}` : 'Not assigned to this teacher'}
                        >
                          <span className={`matrix-cell-pill ${cell.badgeClass}`}>
                            {cell.icon && <span className="pill-icon">{cell.icon}</span>}
                            <span className="pill-text">{cell.label}</span>
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* QUICK CELL INSPECTION MODAL / DRAWER */}
      {selectedCellDetail && (
        <div className="modal-overlay" onClick={() => setSelectedCellDetail(null)}>
          <div className="modal-content matrix-cell-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="cell-modal-title-group">
                <span className={`status-badge ${selectedCellDetail.cell.status}`}>
                  {selectedCellDetail.cell.label}
                </span>
                <h3>{selectedCellDetail.task.title}</h3>
              </div>
              <button type="button" className="close-x" onClick={() => setSelectedCellDetail(null)}>✕</button>
            </div>

            <div className="modal-body-scroll">
              <div className="cell-teacher-card">
                <div className="cell-teacher-avatar">👤</div>
                <div>
                  <strong>{selectedCellDetail.teacher.fullName || selectedCellDetail.teacher.email}</strong>
                  <p>{selectedCellDetail.teacher.position || selectedCellDetail.teacher.role || 'Teacher'}</p>
                </div>
              </div>

              <div className="cell-detail-grid">
                <div className="cell-detail-item">
                  <label>Deliverable Deadline</label>
                  <span>{formatDate(selectedCellDetail.task.deadline)}</span>
                </div>
                <div className="cell-detail-item">
                  <label>Status</label>
                  <span className={`status-text-highlight ${selectedCellDetail.cell.status}`}>
                    {selectedCellDetail.cell.label}
                  </span>
                </div>
              </div>

              {selectedCellDetail.cell.response ? (
                <div className="cell-response-box">
                  <h4>Teacher's Submission Details</h4>
                  <div className="resp-meta-row">
                    <span>Submitted: {formatDateTime(selectedCellDetail.cell.response.submittedAt)}</span>
                  </div>
                  {selectedCellDetail.cell.response.link && (
                    <div className="resp-link-row">
                      <label>Attached Submission Link:</label>
                      <a 
                        href={selectedCellDetail.cell.response.link} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="open-link-btn"
                      >
                        🔗 Open Submitted Document
                      </a>
                    </div>
                  )}
                  {selectedCellDetail.cell.response.remarks && (
                    <div className="resp-remarks-row">
                      <label>Remarks from Teacher:</label>
                      <p>{selectedCellDetail.cell.response.remarks}</p>
                    </div>
                  )}
                  {selectedCellDetail.cell.response.feedback && (
                    <div className="resp-feedback-row">
                      <label>Administrator Feedback:</label>
                      <p>{selectedCellDetail.cell.response.feedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="cell-pending-box">
                  <p>No response has been uploaded by this teacher yet.</p>
                  {selectedCellDetail.cell.status === 'overdue' && (
                    <div className="overdue-warning-alert">
                      ⚠️ This requirement is past the deadline of {formatDate(selectedCellDetail.task.deadline)}.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions-footer">
              {onSelectTaskForReview && (
                <button
                  type="button"
                  className="open-task-full-btn"
                  onClick={() => {
                    const taskToOpen = selectedCellDetail.task;
                    setSelectedCellDetail(null);
                    onSelectTaskForReview(taskToOpen);
                  }}
                >
                  🔍 Open Full Task Review Board
                </button>
              )}

              {onSendSingleReminder && !selectedCellDetail.cell.response && (
                <button
                  type="button"
                  className="send-reminder-quick-btn"
                  onClick={() => {
                    onSendSingleReminder(selectedCellDetail.task.id, [selectedCellDetail.teacher.id]);
                    setSelectedCellDetail(null);
                  }}
                >
                  📢 Send Reminder to {selectedCellDetail.teacher.fullName || 'Teacher'}
                </button>
              )}

              <button
                type="button"
                className="cancel-btn"
                onClick={() => setSelectedCellDetail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyComplianceMatrix;
