import React, { useState, useMemo, useCallback } from 'react';
import { useSubmissions } from '../../context/SubmissionContext';
import { useAuth } from '../../context/AuthContext';
import { usePersonnel } from '../../context/PersonnelContext';
import { useSections } from '../../context/SectionContext';
import { useSettings } from '../../context/SettingsContext';

import { formatDateTime, getDeadlineCountdown, TASK_CATEGORIES } from './SubmissionComponents/submissionUtils';
import SubmissionCreateModal from './SubmissionComponents/SubmissionCreateModal';
import SubmissionDetailModal from './SubmissionComponents/SubmissionDetailModal';
import SubmissionPrintReportModal from './SubmissionComponents/SubmissionPrintReportModal';
import SubmissionTaskCard from './SubmissionComponents/SubmissionTaskCard';
import SubmissionTableView from './SubmissionComponents/SubmissionTableView';
import FacultyComplianceMatrix from './SubmissionComponents/FacultyComplianceMatrix';
import EmptyState from '../../components/EmptyState';
import CardSkeleton from '../../components/CardSkeleton';
import TableSkeleton from '../../components/TableSkeleton';

import './SubmissionTracker.css';

const SubmissionTracker = () => {
  const { 
    tasks, 
    responses, 
    loading,
    createTask, 
    updateTask, 
    submitResponse, 
    deleteTask, 
    toggleArchiveTask,
    reviewResponse, 
    batchReviewResponses, 
    sendTaskReminder 
  } = useSubmissions();
  const { user } = useAuth();
  const { personnel } = usePersonnel();
  const { sections } = useSections();
  const { settings } = useSettings();
  
  const adviserIds = useMemo(() => new Set(sections.map(s => s.adviserId).filter(Boolean)), [sections]);
  const isTeacherAdviser = adviserIds.has(user?.uid);
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const [showPrintReportModal, setShowPrintReportModal] = useState(false);

  // Tabs, Search, Category & Filter state
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'archived'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table' | 'matrix'
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('deadline-asc'); // 'deadline-asc' | 'deadline-desc' | 'created-desc' | 'title-asc' | 'compliance-asc' | 'compliance-desc'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'submitted' | 'overdue' | 'revision'
  const [sendingReminders, setSendingReminders] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToastMsg = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const getTargetTeachers = useCallback((task) => {
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
  }, [personnel, adviserIds]);

  const getStatus = (taskId) => {
    const response = responses.find(r => r.submissionId === taskId && r.userId === user?.uid);
    return response ? (response.status || 'Submitted') : 'Pending';
  };

  // Handlers
  const handleOpenCreateModal = () => {
    setIsEditingTask(false);
    setEditingTask(null);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (task, e) => {
    e.stopPropagation();
    setIsEditingTask(true);
    setEditingTask(task);
    setShowCreateModal(true);
  };

  const handleDeleteTask = async (taskId, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this submission task for all teachers?')) {
      try {
        await deleteTask(taskId);
        showToastMsg('Submission task deleted.', 'info');
      } catch (err) {
        showToastMsg('Failed to delete task: ' + err.message, 'error');
      }
    }
  };

  const handleCreateOrUpdateTask = async (taskData) => {
    try {
      if (isEditingTask && editingTask) {
        await updateTask(editingTask.id, taskData);
        showToastMsg('Submission task updated successfully!', 'success');
      } else {
        await createTask(taskData);
        showToastMsg('Submission task created and sent to teachers!', 'success');
      }
      setShowCreateModal(false);
      setEditingTask(null);
      setIsEditingTask(false);
    } catch (err) {
      showToastMsg(`Failed to ${isEditingTask ? 'update' : 'create'} task: ${err?.message || 'Please check permissions.'}`, 'error');
    }
  };

  const handleTeacherSubmit = async (formData) => {
    try {
      await submitResponse(selectedTask.id, formData);
      setShowDetailModal(false);
      showToastMsg('Report submitted successfully!', 'success');
    } catch (err) {
      showToastMsg('Failed to submit report: ' + err.message, 'error');
    }
  };

  const handleAdminReview = async (responseId, reviewData) => {
    try {
      await reviewResponse(responseId, reviewData);
      showToastMsg('Submission reviewed successfully!', 'success');
    } catch (err) {
      showToastMsg('Failed to save review: ' + err.message, 'error');
    }
  };

  const handleBatchApprove = async (selectedResponseIds) => {
    try {
      await batchReviewResponses(selectedResponseIds, {
        status: 'Approved',
        feedback: 'Batch approved by Administrator'
      });
      showToastMsg(`Successfully approved ${selectedResponseIds.length} submissions!`, 'success');
    } catch (err) {
      showToastMsg('Failed to batch approve: ' + err.message, 'error');
    }
  };

  const handleSendReminders = async () => {
    if (!selectedTask) return;
    const targets = getTargetTeachers(selectedTask);
    const taskResponses = responses.filter(r => r.submissionId === selectedTask.id);
    const submittedUserIds = new Set(taskResponses.map(r => r.userId));
    const pendingTargets = targets.filter(t => !submittedUserIds.has(t.id));
    const pendingIds = pendingTargets.map(t => t.id);

    if (pendingIds.length === 0) {
      showToastMsg('All targeted teachers have already submitted!', 'info');
      return;
    }

    setSendingReminders(true);
    try {
      const count = await sendTaskReminder(selectedTask.id, pendingIds);
      showToastMsg(`📢 Sent reminder notifications to ${count} pending teachers!`, 'success');
    } catch (err) {
      showToastMsg('Failed to send reminders: ' + err.message, 'error');
    } finally {
      setSendingReminders(false);
    }
  };

  const handleSendSingleReminder = async (taskId, userIds) => {
    try {
      const count = await sendTaskReminder(taskId, userIds);
      showToastMsg(`📢 Sent reminder notification to faculty member!`, 'success');
    } catch (err) {
      showToastMsg('Failed to send reminder: ' + err.message, 'error');
    }
  };

  const handleExportCSV = () => {
    if (!selectedTask) return;
    const targets = getTargetTeachers(selectedTask);
    const taskResponses = responses.filter(r => r.submissionId === selectedTask.id);
    const responseMap = new Map(taskResponses.map(r => [r.userId, r]));

    const headers = ['Teacher Name', 'Email', 'Role/Position', 'Status', 'Date Submitted', 'Link', 'Remarks', 'Admin Feedback'];
    const csvContent = [
      headers.join(','),
      ...targets.map(t => {
        const resp = responseMap.get(t.id);
        const isOverdue = new Date(selectedTask.deadline) < new Date() && !resp;
        const status = resp ? (resp.status || 'Submitted') : (isOverdue ? 'Overdue' : 'Pending');
        return [
          `"${t.fullName || 'Unknown'}"`,
          `"${t.email || ''}"`,
          `"${t.position || 'Teacher'}"`,
          `"${status}"`,
          `"${resp ? formatDateTime(resp.submittedAt) : 'N/A'}"`,
          `"${resp?.link || ''}"`,
          `"${(resp?.remarks || '').replace(/"/g, '""')}"`,
          `"${(resp?.feedback || '').replace(/"/g, '""')}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const linkObj = document.createElement('a');
    linkObj.href = URL.createObjectURL(blob);
    linkObj.download = `Submission_Report_${selectedTask.title.replace(/\s+/g, '_')}.csv`;
    linkObj.style.visibility = 'hidden';
    document.body.appendChild(linkObj);
    linkObj.click();
    document.body.removeChild(linkObj);
  };

  // Archive / Restore Handler
  const handleToggleArchive = async (taskId, isArchived, e) => {
    if (e) e.stopPropagation();
    try {
      await toggleArchiveTask(taskId, isArchived);
      showToastMsg(`Task successfully ${isArchived ? 'archived' : 'restored to active'}!`, 'success');
    } catch (err) {
      showToastMsg(`Failed to ${isArchived ? 'archive' : 'restore'} task: ` + err.message, 'error');
    }
  };

  // Determine user-accessible tasks first
  const accessibleTasks = useMemo(() => {
    return tasks.filter(task => {
      if (isAdmin) return true;
      if (task.recipients === 'all') return true;
      if (task.recipients === 'advisers') return isTeacherAdviser;
      if (task.recipients === 'non-advisers') return !isTeacherAdviser;
      if (typeof task.recipients === 'string' && task.recipients.startsWith('subject:')) {
        const sub = task.recipients.replace('subject:', '');
        return (user?.subjects || []).includes(sub);
      }
      if (Array.isArray(task.recipients)) {
        return task.recipients.includes(user?.uid);
      }
      return task.recipients === user?.uid;
    });
  }, [tasks, isAdmin, isTeacherAdviser, user]);

  const { activeTasksCount, archivedTasksCount } = useMemo(() => {
    let active = 0;
    let archived = 0;
    accessibleTasks.forEach(t => {
      if (t.isArchived) archived++;
      else active++;
    });
    return { activeTasksCount: active, archivedTasksCount: archived };
  }, [accessibleTasks]);

  // KPI Metrics calculation (only based on active tasks to prevent skewing)
  const kpiMetrics = useMemo(() => {
    const activeTasksList = accessibleTasks.filter(t => !t.isArchived);

    if (isAdmin) {
      let totalAssignedSlots = 0;
      let totalSubmittedSlots = 0;
      let totalApprovedSlots = 0;
      let totalPendingReview = 0;
      let totalOverdueSlots = 0;

      activeTasksList.forEach(t => {
        const targets = getTargetTeachers(t);
        const targetIds = new Set(targets.map(x => x.id));
        const tResponses = responses.filter(r => r.submissionId === t.id && targetIds.has(r.userId));
        const submittedUserIds = new Set(tResponses.map(r => r.userId));

        totalAssignedSlots += targets.length;
        totalSubmittedSlots += tResponses.length;
        totalApprovedSlots += tResponses.filter(r => r.status === 'Approved').length;
        totalPendingReview += tResponses.filter(r => !r.status || r.status === 'Submitted').length;

        const isTaskPastDeadline = new Date(t.deadline) < new Date();
        if (isTaskPastDeadline) {
          totalOverdueSlots += (targets.length - submittedUserIds.size);
        }
      });

      const overallCompliance = totalAssignedSlots > 0 ? Math.round((totalSubmittedSlots / totalAssignedSlots) * 100) : 100;

      return {
        activeTasks: activeTasksList.length,
        complianceRate: overallCompliance,
        totalSubmitted: totalSubmittedSlots,
        totalPending: Math.max(0, totalAssignedSlots - totalSubmittedSlots),
        pendingReview: totalPendingReview,
        overdue: totalOverdueSlots
      };
    } else {
      let pending = 0;
      let submitted = 0;
      let approved = 0;
      let needsRevision = 0;
      let overdue = 0;

      activeTasksList.forEach(t => {
        const resp = responses.find(r => r.submissionId === t.id && r.userId === user?.uid);
        const isPastDue = new Date(t.deadline) < new Date();

        if (!resp) {
          if (isPastDue) overdue++;
          else pending++;
        } else {
          if (resp.status === 'Approved') approved++;
          else if (resp.status === 'Needs Revision') needsRevision++;
          else submitted++;
        }
      });

      return {
        total: activeTasksList.length,
        pending,
        submitted: submitted + approved,
        approved,
        needsRevision,
        overdue
      };
    }
  }, [isAdmin, accessibleTasks, responses, user, getTargetTeachers]);

  // Filtered and Sorted tasks list
  const filteredAndSortedTasks = useMemo(() => {
    const list = accessibleTasks.filter(task => {
      // 1. Tab filter (active vs archived)
      const isArchived = Boolean(task.isArchived);
      if (activeTab === 'archived' && !isArchived) return false;
      if (activeTab === 'active' && isArchived) return false;

      // 2. Category filter
      if (categoryFilter !== 'All') {
        const cat = task.category || 'General';
        if (cat !== categoryFilter) return false;
      }

      // 3. Search query
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (task.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 4. Status filter
      const status = isAdmin ? 'Admin' : getStatus(task.id);
      const userResp = responses.find(r => r.submissionId === task.id && r.userId === user?.uid);
      const countdown = getDeadlineCountdown(task.deadline);
      const isOverdue = countdown.isOverdue && !userResp;
      
      let matchesStatus = true;
      if (statusFilter === 'pending') matchesStatus = status === 'Pending' && !isOverdue;
      else if (statusFilter === 'submitted') matchesStatus = status === 'Submitted' || status === 'Approved';
      else if (statusFilter === 'overdue') matchesStatus = isOverdue;
      else if (statusFilter === 'revision') matchesStatus = userResp?.status === 'Needs Revision';

      return matchesStatus;
    });

    // 5. Sorting
    list.sort((a, b) => {
      if (sortBy === 'deadline-asc') {
        return new Date(a.deadline || '9999-12-31') - new Date(b.deadline || '9999-12-31');
      }
      if (sortBy === 'deadline-desc') {
        return new Date(b.deadline || '1970-01-01') - new Date(a.deadline || '1970-01-01');
      }
      if (sortBy === 'created-desc') {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      }
      if (sortBy === 'title-asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'compliance-asc' || sortBy === 'compliance-desc') {
        const getRate = (t) => {
          const targets = getTargetTeachers(t);
          if (targets.length === 0) return 0;
          const targetIds = new Set(targets.map(x => x.id));
          const tResponses = responses.filter(r => r.submissionId === t.id && targetIds.has(r.userId));
          return tResponses.length / targets.length;
        };
        const rateA = getRate(a);
        const rateB = getRate(b);
        return sortBy === 'compliance-asc' ? rateA - rateB : rateB - rateA;
      }
      return 0;
    });

    return list;
  }, [accessibleTasks, activeTab, categoryFilter, searchQuery, statusFilter, sortBy, isAdmin, responses, user, getTargetTeachers]);

  return (
    <div className="submission-tracker-container">
      {/* HEADER */}
      <div className="tracker-header no-print">
        <div>
          <h1>Submission Tracker</h1>
          <p className="subtitle">Monitoring {isAdmin ? 'Department & Teacher' : 'Your Assigned'} Report Submissions</p>
        </div>
        {isAdmin && (
          <button type="button" className="create-task-btn" onClick={handleOpenCreateModal}>
            + Create New Submission Request
          </button>
        )}
      </div>

      {/* TOP CONTROLS: TABS + VIEW MODE SWITCHER */}
      <div className="tracker-top-controls no-print">
        <div className="tracker-tabs-bar">
          <button
            type="button"
            className={`tracker-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            📂 Active Deliverables <span className="tab-counter">{activeTasksCount}</span>
          </button>
          <button
            type="button"
            className={`tracker-tab-btn ${activeTab === 'archived' ? 'active' : ''}`}
            onClick={() => setActiveTab('archived')}
          >
            📦 Archived History <span className="tab-counter">{archivedTasksCount}</span>
          </button>
        </div>

        <div className="view-mode-switcher">
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
            title="Card Grid View"
          >
            🎴 Cards
          </button>
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Compact Table View"
          >
            📑 Table
          </button>
          {isAdmin && (
            <button
              type="button"
              className={`view-mode-btn matrix-mode-btn ${viewMode === 'matrix' ? 'active' : ''}`}
              onClick={() => setViewMode('matrix')}
              title="Faculty Compliance Cross-Tab Matrix"
            >
              📊 Compliance Matrix
            </button>
          )}
        </div>
      </div>

      {/* KPI METRICS OVERVIEW BAR */}
      {activeTab === 'active' ? (
        <div className="kpi-overview-bar no-print">
          {isAdmin ? (
            <>
              <div className="kpi-card" onClick={() => setStatusFilter('all')}>
                <div className="kpi-icon">📋</div>
                <div className="kpi-info">
                  <span className="kpi-value">{kpiMetrics.activeTasks}</span>
                  <span className="kpi-label">Active Tasks</span>
                </div>
              </div>
              <div className="kpi-card highlight-rate" onClick={() => setStatusFilter('all')}>
                <div className="kpi-icon">📈</div>
                <div className="kpi-info">
                  <span className="kpi-value">{kpiMetrics.complianceRate}%</span>
                  <span className="kpi-label">Faculty Compliance</span>
                </div>
              </div>
              <div className="kpi-card" onClick={() => setStatusFilter('pending')}>
                <div className="kpi-icon">⏳</div>
                <div className="kpi-info">
                  <span className="kpi-value">{kpiMetrics.totalPending}</span>
                  <span className="kpi-label">Pending Responses</span>
                </div>
              </div>
              <div className="kpi-card warning" onClick={() => setStatusFilter('overdue')}>
                <div className="kpi-icon">⚠️</div>
                <div className="kpi-info">
                  <span className="kpi-value">{kpiMetrics.overdue}</span>
                  <span className="kpi-label">Overdue Slots</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="kpi-card" onClick={() => setStatusFilter('all')}>
                <div className="kpi-icon">📋</div>
                <div className="kpi-info">
                  <span className="kpi-value">{kpiMetrics.total}</span>
                  <span className="kpi-label">Total Assigned</span>
                </div>
              </div>
              <div className="kpi-card" onClick={() => setStatusFilter('pending')}>
                <div className="kpi-icon">⏳</div>
                <div className="kpi-info">
                  <span className="kpi-value">{kpiMetrics.pending}</span>
                  <span className="kpi-label">Pending Action</span>
                </div>
              </div>
              <div className="kpi-card success" onClick={() => setStatusFilter('submitted')}>
                <div className="kpi-icon">✅</div>
                <div className="kpi-info">
                  <span className="kpi-value">{kpiMetrics.submitted}</span>
                  <span className="kpi-label">Submitted / Done</span>
                </div>
              </div>
              {kpiMetrics.needsRevision > 0 && (
                <div className="kpi-card alert-revision" onClick={() => setStatusFilter('revision')}>
                  <div className="kpi-icon">✏️</div>
                  <div className="kpi-info">
                    <span className="kpi-value">{kpiMetrics.needsRevision}</span>
                    <span className="kpi-label">Needs Revision</span>
                  </div>
                </div>
              )}
              <div className="kpi-card warning" onClick={() => setStatusFilter('overdue')}>
                <div className="kpi-icon">⚠️</div>
                <div className="kpi-info">
                  <span className="kpi-value">{kpiMetrics.overdue}</span>
                  <span className="kpi-label">Overdue Tasks</span>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="archived-info-banner no-print">
          <div className="archived-banner-icon">📦</div>
          <div className="archived-banner-text">
            <h4>Archived Deliverables Archive</h4>
            <p>You are viewing historical tasks and completed records. Active KPI metrics and reminders apply to active deliverables.</p>
          </div>
        </div>
      )}

      {/* SEARCH AND FILTERS BAR */}
      <div className="filters-bar no-print">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search tasks by title, instructions, or category..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="status-filters">
          <button 
            type="button"
            className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Status
          </button>
          <button 
            type="button"
            className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </button>
          <button 
            type="button"
            className={`filter-btn ${statusFilter === 'submitted' ? 'active' : ''}`}
            onClick={() => setStatusFilter('submitted')}
          >
            Submitted
          </button>
          <button 
            type="button"
            className={`filter-btn ${statusFilter === 'overdue' ? 'active' : ''}`}
            onClick={() => setStatusFilter('overdue')}
          >
            Overdue
          </button>
          {!isAdmin && kpiMetrics.needsRevision > 0 && (
            <button 
              type="button"
              className={`filter-btn revision-btn ${statusFilter === 'revision' ? 'active' : ''}`}
              onClick={() => setStatusFilter('revision')}
            >
              Needs Revision ({kpiMetrics.needsRevision})
            </button>
          )}
        </div>
      </div>

      {/* CATEGORY FILTER CHIPS & SORT DROPDOWN BAR */}
      <div className="category-and-sort-bar no-print">
        <div className="category-chips-list">
          <span className="cat-filter-label">Category:</span>
          {TASK_CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              className={`category-chip-btn ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'All' ? '🌟 All' : cat}
            </button>
          ))}
        </div>
        <div className="sort-wrapper">
          <label htmlFor="submission-sort-select" className="sort-label">Sort:</label>
          <select
            id="submission-sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="deadline-asc">⏳ Deadline (Soonest first)</option>
            <option value="deadline-desc">📅 Deadline (Furthest first)</option>
            <option value="created-desc">✨ Newest Created</option>
            <option value="title-asc">🔤 Title (A–Z)</option>
            {isAdmin && <option value="compliance-asc">📉 Compliance (Lowest first)</option>}
            {isAdmin && <option value="compliance-desc">📈 Compliance (Highest first)</option>}
          </select>
        </div>
      </div>

      {/* VIEW MODES: MATRIX vs TABLE vs CARDS */}
      {viewMode === 'matrix' && isAdmin ? (
        <FacultyComplianceMatrix
          tasks={filteredAndSortedTasks}
          personnel={personnel}
          responses={responses}
          sections={sections}
          adviserIds={adviserIds}
          onSelectTaskForReview={(t) => {
            setSelectedTask(t);
            setShowDetailModal(true);
          }}
          onSendSingleReminder={handleSendSingleReminder}
        />
      ) : loading ? (
        viewMode === 'table' ? (
          <div className="submission-table-wrapper card">
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
              <TableSkeleton rows={6} columns={6} />
            </table>
          </div>
        ) : (
          <CardSkeleton count={6} />
        )
      ) : viewMode === 'table' ? (
        filteredAndSortedTasks.length === 0 ? (
          <EmptyState
            icon={activeTab === 'archived' ? '📦' : '📋'}
            title={activeTab === 'archived' ? 'No Archived Deliverables' : 'No Submission Tasks Found'}
            description={
              activeTab === 'archived'
                ? 'Completed tasks that have been archived by administrators will appear here for compliance history.'
                : searchQuery || categoryFilter !== 'All' || statusFilter !== 'all'
                ? 'There are no deliverables matching your search or filter settings.'
                : 'No submission deliverables have been assigned yet.'
            }
            actionLabel={
              searchQuery || categoryFilter !== 'All' || statusFilter !== 'all'
                ? 'Clear Filters'
                : (isAdmin && activeTab !== 'archived')
                ? '+ Create Submission Request'
                : undefined
            }
            onAction={
              searchQuery || categoryFilter !== 'All' || statusFilter !== 'all'
                ? () => {
                    setSearchQuery('');
                    setCategoryFilter('All');
                    setStatusFilter('all');
                  }
                : (isAdmin && activeTab !== 'archived')
                ? handleOpenCreateModal
                : undefined
            }
          />
        ) : (
          <SubmissionTableView
            tasks={filteredAndSortedTasks}
            isAdmin={isAdmin}
            user={user}
            personnel={personnel}
            responses={responses}
            adviserIds={adviserIds}
            onSelectTask={(t) => {
              setSelectedTask(t);
              setShowDetailModal(true);
            }}
            onEditTask={handleOpenEditModal}
            onDeleteTask={handleDeleteTask}
            onToggleArchive={isAdmin ? handleToggleArchive : undefined}
          />
        )
      ) : (
        /* TASK CARDS GRID */
        filteredAndSortedTasks.length === 0 ? (
          <EmptyState
            icon={activeTab === 'archived' ? '📦' : '📋'}
            title={activeTab === 'archived' ? 'No Archived Deliverables' : 'No Submission Tasks Found'}
            description={
              activeTab === 'archived'
                ? 'Completed tasks that have been archived by administrators will appear here for compliance history.'
                : searchQuery || categoryFilter !== 'All' || statusFilter !== 'all'
                ? 'There are no deliverables matching your search or filter settings.'
                : 'No submission deliverables have been assigned yet.'
            }
            actionLabel={
              searchQuery || categoryFilter !== 'All' || statusFilter !== 'all'
                ? 'Clear Filters'
                : (isAdmin && activeTab !== 'archived')
                ? '+ Create Submission Request'
                : undefined
            }
            onAction={
              searchQuery || categoryFilter !== 'All' || statusFilter !== 'all'
                ? () => {
                    setSearchQuery('');
                    setCategoryFilter('All');
                    setStatusFilter('all');
                  }
                : (isAdmin && activeTab !== 'archived')
                ? handleOpenCreateModal
                : undefined
            }
          />
        ) : (
          <div className="task-grid">
            {filteredAndSortedTasks.map(task => (
              <SubmissionTaskCard
                key={task.id}
                task={task}
                isAdmin={isAdmin}
                user={user}
                personnel={personnel}
                responses={responses}
                adviserIds={adviserIds}
                onSelectTask={(t) => {
                  setSelectedTask(t);
                  setShowDetailModal(true);
                }}
                onEditTask={handleOpenEditModal}
                onDeleteTask={handleDeleteTask}
                onToggleArchive={isAdmin ? handleToggleArchive : undefined}
              />
            ))}
          </div>
        )
      )}

      {/* CREATE / EDIT TASK MODAL */}
      <SubmissionCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        isEditing={isEditingTask}
        initialTask={editingTask}
        personnel={personnel}
        adviserIds={adviserIds}
        onSubmit={handleCreateOrUpdateTask}
      />

      {/* DETAIL / SUBMISSION / REVIEW MODAL */}
      <SubmissionDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        task={selectedTask}
        isAdmin={isAdmin}
        user={user}
        personnel={personnel}
        responses={responses}
        adviserIds={adviserIds}
        onTeacherSubmit={handleTeacherSubmit}
        onAdminReview={handleAdminReview}
        onBatchApprove={handleBatchApprove}
        onSendReminders={handleSendReminders}
        onExportCSV={handleExportCSV}
        onOpenPrintReport={() => setShowPrintReportModal(true)}
        sendingReminders={sendingReminders}
      />

      {/* PRINTABLE COMPLIANCE REPORT MODAL */}
      <SubmissionPrintReportModal
        isOpen={showPrintReportModal}
        onClose={() => setShowPrintReportModal(false)}
        task={selectedTask}
        settings={settings}
        user={user}
        personnel={personnel}
        responses={responses}
        adviserIds={adviserIds}
      />

      {/* TOAST MESSAGE */}
      {toast && (
        <div className={`toast-message ${toast.type}`}>
          <span className="toast-icon">{toast.type === 'success' ? '✅' : '❌'}</span>
          <span className="toast-text">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default SubmissionTracker;
