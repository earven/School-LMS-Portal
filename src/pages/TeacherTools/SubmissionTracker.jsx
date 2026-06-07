import React, { useState } from 'react';
import { useSubmissions } from '../../context/SubmissionContext';
import { useAuth } from '../../context/AuthContext';
import { usePersonnel } from '../../context/PersonnelContext';
import { useSections } from '../../context/SectionContext';
import './SubmissionTracker.css';

const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  
  let date;
  if (dateInput && typeof dateInput.toDate === 'function') {
    date = dateInput.toDate();
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    if (typeof dateInput === 'string' && dateInput.includes('-')) {
      const parts = dateInput.split('-');
      if (parts.length === 3) {
        date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    if (!date) {
      date = new Date(dateInput);
    }
  }
  
  if (isNaN(date.getTime())) return 'N/A';
  
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const y = date.getFullYear();
  return `${m}-${d}-${y}`;
};

const formatDateTime = (dateInput) => {
  if (!dateInput) return 'N/A';
  let date = (dateInput && typeof dateInput.toDate === 'function') ? dateInput.toDate() : new Date(dateInput);
  if (isNaN(date.getTime())) return 'N/A';
  
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const y = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strTime = `${hours}:${minutes} ${ampm}`;
  
  return `${m}-${d}-${y}, ${strTime}`;
};

const detectLinkType = (url) => {
  if (!url) return 'onedrive';
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('docs.google.com/forms') || lowerUrl.includes('forms.gle') || lowerUrl.includes('jotform.com') || lowerUrl.includes('cognitoforms.com') || lowerUrl.includes('form')) {
    return 'form';
  }
  if (lowerUrl.includes('survey') || lowerUrl.includes('typeform.com') || lowerUrl.includes('survey-monkey') || lowerUrl.includes('surveymonkey.com')) {
    return 'survey';
  }
  if (lowerUrl.includes('drive.google.com') || lowerUrl.includes('google.com/drive')) {
    return 'googledrive';
  }
  if (lowerUrl.includes('onedrive') || lowerUrl.includes('sharepoint.com') || lowerUrl.includes('dropbox.com')) {
    return 'onedrive';
  }
  return 'general';
};

const getLinkIndicator = (task) => {
  const type = task.linkType || detectLinkType(task.folderLink);
  switch (type) {
    case 'form':
      return { label: 'Form Link Attached', icon: '📝' };
    case 'survey':
      return { label: 'Survey Link Attached', icon: '📋' };
    case 'onedrive':
      return { label: 'Shared Folder Attached', icon: '📂' };
    case 'googledrive':
      return { label: 'Google Drive Attached', icon: '📁' };
    default:
      return { label: 'External Link Attached', icon: '🔗' };
  }
};

const getLinkButtonProps = (task) => {
  const type = task.linkType || detectLinkType(task.folderLink);
  switch (type) {
    case 'form':
      return { label: 'Fill out Google Form', icon: '📝' };
    case 'survey':
      return { label: 'Open Survey Link', icon: '📋' };
    case 'onedrive':
      return { label: 'Open OneDrive Submission Folder', icon: '📁' };
    case 'googledrive':
      return { label: 'Open Google Drive Folder', icon: '📁' };
    default:
      return { label: 'Open External Link', icon: '🔗' };
  }
};

const getBannerProps = (task) => {
  const type = task.linkType || detectLinkType(task.folderLink);
  switch (type) {
    case 'form':
      return {
        title: 'External Form Submission',
        text: 'Please open the form link above and fill it out, then confirm your submission details below if needed.',
        icon: '📝'
      };
    case 'survey':
      return {
        title: 'Survey Participation',
        text: 'Please click the survey link above to complete the survey, then document any details below.',
        icon: '📋'
      };
    case 'onedrive':
      return {
        title: 'OneDrive Upload',
        text: task.folderLink 
          ? "Please upload your report to the designated OneDrive folder above, then paste your file's specific sharing link below."
          : "Upload your report to OneDrive and paste the shared link below.",
        icon: '☁️'
      };
    case 'googledrive':
      return {
        title: 'Google Drive Upload',
        text: task.folderLink 
          ? "Please upload your report to the designated Google Drive folder above, then paste your file's specific sharing link below."
          : "Upload your report to Google Drive and paste the shared link below.",
        icon: '📁'
      };
    default:
      return {
        title: 'External Link Submission',
        text: 'Follow the link above to submit your report or information, then paste the submission proof or link below.',
        icon: '🔗'
      };
  }
};

const SubmissionTracker = () => {
  const { tasks, responses, createTask, updateTask, submitResponse, deleteTask, reviewResponse } = useSubmissions();
  const { user } = useAuth();
  const { personnel } = usePersonnel(); // For selecting specific recipients
  const { sections } = useSections();
  
  const adviserIds = new Set(sections.map(s => s.adviserId).filter(Boolean));
  const isTeacherAdviser = adviserIds.has(user?.uid);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    deadline: '',
    recipients: 'all',
    folderLink: '',
    linkType: 'onedrive'
  });

  const [responseForm, setResponseForm] = useState({
    remarks: '',
    link: ''
  });

  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskId, setEditTaskId] = useState(null);

  // New Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [adminResponseFilter, setAdminResponseFilter] = useState('all'); // 'all', 'submitted', 'pending'

  // Admin submission review state
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    status: 'Approved',
    feedback: ''
  });

  // Toast state
  const [toast, setToast] = useState(null);

  const showToastMsg = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleSelectResponse = (row) => {
    if (!row.response) return; // Can't review what has not been submitted
    setSelectedResponse(row.response);
    setReviewForm({
      status: row.response.status || 'Approved',
      feedback: row.response.feedback || ''
    });
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    try {
      await reviewResponse(selectedResponse.id, reviewForm);
      setSelectedResponse(null);
      showToastMsg('Submission reviewed successfully!', 'success');
    } catch (err) {
      showToastMsg('Failed to save review: ' + err.message, 'error');
    }
  };

  const isAdmin = ['admin', 'system_admin'].includes(user?.role);

  const getTargetTeachers = (task) => {
    const allTeachers = personnel.filter(p => p.role === 'teacher');
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

  const openCreateModal = () => {
    setIsEditingTask(false);
    setEditTaskId(null);
    const allTeacherIds = personnel.filter(p => p.role === 'teacher').map(p => p.id);
    setNewTask({ 
      title: '', 
      description: '', 
      deadline: '', 
      recipients: allTeacherIds, 
      folderLink: '', 
      linkType: 'onedrive' 
    });
    setShowCreateModal(true);
  };

  const openEditModal = (task, e) => {
    e.stopPropagation();
    setIsEditingTask(true);
    setEditTaskId(task.id);
    setNewTask({
      title: task.title || '',
      description: task.description || '',
      deadline: task.deadline || '',
      recipients: task.recipients || 'all',
      folderLink: task.folderLink || '',
      linkType: task.linkType || detectLinkType(task.folderLink)
    });
    setShowCreateModal(true);
  };

  const handleQuickSelect = (type) => {
    const allTeachers = personnel.filter(p => p.role === 'teacher');
    if (type === 'all') {
      setNewTask(prev => ({ ...prev, recipients: allTeachers.map(t => t.id) }));
    } else if (type === 'none') {
      setNewTask(prev => ({ ...prev, recipients: [] }));
    } else if (type === 'advisers') {
      const targeted = allTeachers.filter(t => adviserIds.has(t.id)).map(t => t.id);
      setNewTask(prev => ({ ...prev, recipients: targeted }));
    } else if (type === 'non-advisers') {
      const targeted = allTeachers.filter(t => !adviserIds.has(t.id)).map(t => t.id);
      setNewTask(prev => ({ ...prev, recipients: targeted }));
    } else if (type.startsWith('subject:')) {
      const sub = type.replace('subject:', '');
      const targeted = allTeachers.filter(t => (t.subjects || []).includes(sub)).map(t => t.id);
      setNewTask(prev => ({ ...prev, recipients: targeted }));
    }
  };

  const handleTeacherCheckboxChange = (teacherId, checked) => {
    const allTeachers = personnel.filter(p => p.role === 'teacher');
    let currentRecipients = [];
    
    if (Array.isArray(newTask.recipients)) {
      currentRecipients = [...newTask.recipients];
    } else if (newTask.recipients === 'all') {
      currentRecipients = allTeachers.map(t => t.id);
    } else if (newTask.recipients === 'advisers') {
      currentRecipients = allTeachers.filter(t => adviserIds.has(t.id)).map(t => t.id);
    } else if (newTask.recipients === 'non-advisers') {
      currentRecipients = allTeachers.filter(t => !adviserIds.has(t.id)).map(t => t.id);
    } else if (typeof newTask.recipients === 'string' && newTask.recipients.startsWith('subject:')) {
      const sub = newTask.recipients.replace('subject:', '');
      currentRecipients = allTeachers.filter(t => (t.subjects || []).includes(sub)).map(t => t.id);
    } else if (newTask.recipients) {
      currentRecipients = [newTask.recipients];
    }
    
    if (checked) {
      if (!currentRecipients.includes(teacherId)) {
        currentRecipients.push(teacherId);
      }
    } else {
      currentRecipients = currentRecipients.filter(id => id !== teacherId);
    }
    
    setNewTask(prev => ({ ...prev, recipients: currentRecipients }));
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      if (isEditingTask) {
        await updateTask(editTaskId, newTask);
        showToastMsg('Submission task updated successfully!', 'success');
      } else {
        await createTask(newTask);
        showToastMsg('Submission task created and sent to teachers!', 'success');
      }
      setShowCreateModal(false);
      setNewTask({ title: '', description: '', deadline: '', recipients: [], folderLink: '', linkType: 'onedrive' });
      setEditTaskId(null);
      setIsEditingTask(false);
    } catch (err) {
      showToastMsg(`Failed to ${isEditingTask ? 'update' : 'create'} task: ${err?.message || 'Please check permissions.'}`, 'error');
    }
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    try {
      await submitResponse(selectedTask.id, responseForm);
      setShowDetailModal(false);
      setResponseForm({ remarks: '', link: '' });
      showToastMsg('Report submitted successfully!', 'success');
    } catch (err) {
      showToastMsg('Failed to submit report: ' + err.message, 'error');
    }
  };

  const getStatus = (taskId) => {
    const response = responses.find(r => r.submissionId === taskId && r.userId === user.uid);
    return response ? response.status : 'Pending';
  };

  const getAdminStats = (task) => {
    const targets = getTargetTeachers(task);
    const targetIds = new Set(targets.map(t => t.id));
    const submittedCount = responses.filter(r => r.submissionId === task.id && targetIds.has(r.userId)).length;
    
    return {
      count: submittedCount,
      total: targets.length
    };
  };

  const handleExportResponses = () => {
    if (!selectedTask) return;
    const targets = getTargetTeachers(selectedTask);
    const taskResponses = responses.filter(r => r.submissionId === selectedTask.id);
    const responseMap = new Map(taskResponses.map(r => [r.userId, r]));

    const headers = ['Teacher Name', 'Email', 'Role/Position', 'Status', 'Date Submitted', 'Link', 'Remarks'];
    const csvContent = [
      headers.join(','),
      ...targets.map(t => {
        const resp = responseMap.get(t.id);
        const isOverdue = new Date(selectedTask.deadline) < new Date() && !resp;
        const status = resp ? 'Submitted' : (isOverdue ? 'Overdue' : 'Pending');
        return [
          `"${t.fullName || 'Unknown'}"`,
          `"${t.email || ''}"`,
          `"${t.position || 'Teacher'}"`,
          `"${status}"`,
          `"${resp ? formatDateTime(resp.submittedAt) : 'N/A'}"`,
          `"${resp?.link || ''}"`,
          `"${(resp?.remarks || '').replace(/"/g, '""')}"`
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


  return (
    <div className="submission-tracker-container">
      <div className="tracker-header">
        <div>
          <h1>Submission Tracker</h1>
          <p className="subtitle">Monitoring {isAdmin ? 'Teacher' : 'Your'} Report Submissions</p>
        </div>
        {isAdmin && (
          <button className="create-task-btn" onClick={openCreateModal}>
            + Create New Submission Request
          </button>
        )}
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="filters-bar">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search tasks by title or details..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="status-filters">
          <button 
            className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Tasks
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'submitted' ? 'active' : ''}`}
            onClick={() => setStatusFilter('submitted')}
          >
            Submitted
          </button>
          <button 
            className={`filter-btn ${statusFilter === 'overdue' ? 'active' : ''}`}
            onClick={() => setStatusFilter('overdue')}
          >
            Overdue
          </button>
        </div>
      </div>

      <div className="task-grid">
        {(() => {
          const filteredTasks = tasks
            .filter(task => {
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
            })
            .filter(task => {
              const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                    task.description.toLowerCase().includes(searchQuery.toLowerCase());
              
              const status = isAdmin ? 'Admin' : getStatus(task.id);
              const isOverdue = new Date(task.deadline) < new Date() && status === 'Pending';
              
              let matchesStatus = true;
              if (statusFilter === 'pending') matchesStatus = status === 'Pending' && !isOverdue;
              else if (statusFilter === 'submitted') matchesStatus = status === 'Submitted';
              else if (statusFilter === 'overdue') matchesStatus = isOverdue;

              return matchesSearch && matchesStatus;
            });

          if (filteredTasks.length === 0) {
            return (
              <div className="empty-state-card">
                <div className="empty-state-icon">📋</div>
                <h3>No Submission Tasks Found</h3>
                <p>There are no tasks that match your search filters or target assignments.</p>
              </div>
            );
          }

          return filteredTasks.map(task => {
            const status = isAdmin ? 'Admin' : getStatus(task.id);
            const stats = isAdmin ? getAdminStats(task) : null;
            const isOverdue = new Date(task.deadline) < new Date() && status === 'Pending';
            
            const isTargeted = task.recipients !== 'all';
            const targetPerson = isTargeted && typeof task.recipients === 'string' ? personnel.find(p => p.id === task.recipients) : null;
            const targetCount = Array.isArray(task.recipients) ? task.recipients.length : null;

            return (
              <div 
                key={task.id} 
                className={`task-card ${status.toLowerCase().replace(/\s+/g, '-')} ${isOverdue ? 'overdue' : ''}`}
                onClick={() => {
                  setSelectedTask(task);
                  setAdminResponseFilter('all');
                  setSelectedResponse(null); // Reset review inspector
                  // Load response form values if teacher has already submitted
                  const existingResponse = responses.find(r => r.submissionId === task.id && r.userId === user.uid);
                  if (existingResponse) {
                    setResponseForm({
                      remarks: existingResponse.remarks || '',
                      link: existingResponse.link || ''
                    });
                  } else {
                    setResponseForm({ remarks: '', link: '' });
                  }
                  setShowDetailModal(true);
                }}
              >
                <div className="task-card-header">
                  <span className={`status-badge ${status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {isAdmin ? `${stats.count} / ${stats.total} Submitted` : status}
                  </span>
                  <span className="deadline-tag">Due: {formatDate(task.deadline)}</span>
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
                      <span>Completion Rate</span>
                      <span>{stats.total > 0 ? Math.round((stats.count / stats.total) * 100) : 0}%</span>
                    </div>
                    <div className="progress-track">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${stats.total > 0 ? (stats.count / stats.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {isOverdue && !isAdmin && <div className="overdue-warning-tag">⚠️ OVERDUE</div>}

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
                  <span className="created-at">Sent: {formatDate(task.createdAt)}</span>
                  {isAdmin && (
                    <div className="task-actions">
                      <button className="edit-task-icon" onClick={(e) => openEditModal(task, e)}>✏️</button>
                      <button className="delete-task-icon" onClick={(e) => {
                        e.stopPropagation();
                        if(window.confirm('Delete this task?')) deleteTask(task.id);
                      }}>🗑️</button>
                    </div>
                  )}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* CREATE TASK MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{isEditingTask ? 'Edit Submission Request' : 'Create Submission Request'}</h2>
              <button className="close-x" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="modal-body-scroll">
                <div className="form-group">
                  <label>Task Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. SF2 Monthly Attendance" 
                    required 
                    value={newTask.title}
                    onChange={e => setNewTask({...newTask, title: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Instructions / Description</label>
                  <textarea 
                    placeholder="Provide details about the report..." 
                    required
                    value={newTask.description}
                    onChange={e => setNewTask({...newTask, description: e.target.value})}
                  ></textarea>
                </div>
                <div className="form-group">
                  <label>Submission Link / External Link (Optional)</label>
                  <input 
                    type="url" 
                    placeholder="Paste OneDrive folder, Google Form, or survey link here..." 
                    value={newTask.folderLink}
                    onChange={e => {
                      const url = e.target.value;
                      setNewTask(prev => ({
                        ...prev,
                        folderLink: url,
                        linkType: detectLinkType(url)
                      }));
                    }}
                  />
                  <p className="field-hint">Paste OneDrive folders, Google Forms, survey links, etc. The link type will be auto-detected, but you can change it below.</p>
                </div>
                <div className="form-group">
                  <label>Link Type</label>
                  <select
                    value={newTask.linkType || 'onedrive'}
                    onChange={e => setNewTask({...newTask, linkType: e.target.value})}
                  >
                    <option value="onedrive">OneDrive Folder</option>
                    <option value="googledrive">Google Drive Folder</option>
                    <option value="form">Google Form / Form</option>
                    <option value="survey">Survey Link</option>
                    <option value="general">General URL</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Deadline</label>
                  <div className={`date-input-wrapper ${newTask.deadline ? 'has-value' : ''}`}>
                    <input 
                      type="date" 
                      required 
                      value={newTask.deadline}
                      onChange={e => setNewTask({...newTask, deadline: e.target.value})}
                    />
                    <span className="date-placeholder">MM-DD-YYYY</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Recipients Selection</label>
                  <div className="recipient-custom-selector">
                    <div className="quick-selectors">
                      <span className="qs-label">Quick Select:</span>
                      <button type="button" className="qs-btn" onClick={() => handleQuickSelect('all')}>All</button>
                      <button type="button" className="qs-btn" onClick={() => handleQuickSelect('none')}>None</button>
                      <button type="button" className="qs-btn" onClick={() => handleQuickSelect('advisers')}>Advisers</button>
                      <button type="button" className="qs-btn" onClick={() => handleQuickSelect('non-advisers')}>Non-Advisers</button>
                      <div className="qs-divider"></div>
                      <button type="button" className="qs-btn" onClick={() => handleQuickSelect('subject:ap')}>AP</button>
                      <button type="button" className="qs-btn" onClick={() => handleQuickSelect('subject:english')}>English</button>
                      <button type="button" className="qs-btn" onClick={() => handleQuickSelect('subject:filipino')}>Filipino</button>
                      <button type="button" className="qs-btn" onClick={() => handleQuickSelect('subject:math')}>Math</button>
                      <button type="button" className="qs-btn" onClick={() => handleQuickSelect('subject:science')}>Science</button>
                      <button type="button" className="qs-btn" onClick={() => handleQuickSelect('subject:mapeh')}>MAPEH</button>
                      <button type="button" className="qs-btn" onClick={() => handleQuickSelect('subject:tle')}>TLE</button>
                      <button type="button" className="qs-btn" onClick={() => handleQuickSelect('subject:esp')}>EsP</button>
                    </div>
                    
                    <div className="teachers-checkbox-grid">
                      {personnel.filter(p => p.role === 'teacher').map(p => {
                        const isChecked = Array.isArray(newTask.recipients) 
                          ? newTask.recipients.includes(p.id)
                          : (newTask.recipients === 'all' || 
                             (newTask.recipients === 'advisers' && adviserIds.has(p.id)) ||
                             (newTask.recipients === 'non-advisers' && !adviserIds.has(p.id)) ||
                             (typeof newTask.recipients === 'string' && newTask.recipients.startsWith('subject:') && (p.subjects || []).includes(newTask.recipients.replace('subject:', ''))) ||
                             newTask.recipients === p.id);
                        return (
                          <label key={p.id} className="teacher-checkbox-card">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleTeacherCheckboxChange(p.id, e.target.checked)}
                            />
                            <div className="teacher-checkbox-info">
                              <span className="tc-name">{p.fullName || p.email}</span>
                              <span className="tc-sub">{p.position || 'Teacher'} {adviserIds.has(p.id) ? '• Adviser' : ''}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn">{isEditingTask ? 'Save Changes' : 'Send Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL / SUBMIT MODAL */}
      {showDetailModal && selectedTask && (
        <div className="modal-overlay">
          <div className="modal-content detail-modal">
            <div className="modal-header">
              <h2>{selectedTask.title}</h2>
              <button className="close-x" onClick={() => {
                setSelectedResponse(null);
                setShowDetailModal(false);
              }}>✕</button>
            </div>
            
            <div className="modal-body-scroll">
              <div className="task-info">
                <p className="modal-desc">{selectedTask.description}</p>
                <div className="meta-grid">
                  <div className="meta-item">
                    <label>Deadline</label>
                    <span>{formatDate(selectedTask.deadline)}</span>
                  </div>
                  <div className="meta-item">
                    <label>Status</label>
                    <span className={`status-text ${getStatus(selectedTask.id).toLowerCase()}`}>
                      {getStatus(selectedTask.id)}
                    </span>
                  </div>
                </div>
                {selectedTask.folderLink && (() => {
                  const btnProps = getLinkButtonProps(selectedTask);
                  return (
                    <a 
                      href={selectedTask.folderLink} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="folder-access-btn"
                    >
                      {btnProps.icon} {btnProps.label}
                    </a>
                  );
                })()}
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
                    <h3>Review Submission</h3>
                    
                    <div className="review-teacher-card">
                      <strong>Teacher:</strong> {personnel.find(p => p.id === selectedResponse.userId)?.fullName || selectedResponse.userName || 'Unknown'}
                      <br />
                      <strong>Submitted At:</strong> {formatDateTime(selectedResponse.submittedAt)}
                    </div>

                    <div className="review-details">
                      <div className="review-detail-item" style={{ marginBottom: '1rem' }}>
                        <label>Submission Link / Proof</label>
                        {selectedResponse.link ? (
                          <a href={selectedResponse.link} target="_blank" rel="noreferrer" className="folder-access-btn inline">
                            🔗 Open Submitted Link
                          </a>
                        ) : (
                          <span className="no-link-text">No link attached</span>
                        )}
                      </div>

                      <div className="review-detail-item">
                        <label>Teacher's Remarks</label>
                        <p className="remarks-box">{selectedResponse.remarks || 'No remarks provided'}</p>
                      </div>
                    </div>

                    <form onSubmit={handleSaveReview} className="review-form">
                      <div className="form-group">
                        <label>Review Status</label>
                        <select
                          value={reviewForm.status}
                          onChange={e => setReviewForm({...reviewForm, status: e.target.value})}
                        >
                          <option value="Approved">Approved</option>
                          <option value="Needs Revision">Needs Revision</option>
                          <option value="Submitted">Pending Review / Submitted</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Feedback / Revision Instructions</label>
                        <textarea
                          placeholder="Provide feedback or instructions for revision..."
                          value={reviewForm.feedback}
                          onChange={e => setReviewForm({...reviewForm, feedback: e.target.value})}
                        ></textarea>
                      </div>

                      <div className="modal-actions no-pad">
                        <button type="button" className="cancel-btn" onClick={() => setSelectedResponse(null)}>Cancel</button>
                        <button type="submit" className="submit-btn">Save Review</button>
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
                        </select>
                        <button className="export-csv-btn" onClick={handleExportResponses}>
                          📥 Export CSV
                        </button>
                      </div>
                    </div>
                    <div className="responses-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Teacher</th>
                            <th>Status</th>
                            <th>Date Submitted</th>
                            <th>Submission Proof / Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const targets = getTargetTeachers(selectedTask);
                            const taskResponses = responses.filter(r => r.submissionId === selectedTask.id);
                            const responseMap = new Map(taskResponses.map(r => [r.userId, r]));

                            const rows = targets.map(t => {
                              const resp = responseMap.get(t.id);
                              const isOverdue = new Date(selectedTask.deadline) < new Date() && !resp;
                              const statusLabel = resp ? resp.status || 'Submitted' : (isOverdue ? 'Overdue' : 'Pending');
                              return { teacher: t, response: resp, status: statusLabel };
                            }).filter(row => {
                              if (adminResponseFilter === 'submitted') return !!row.response;
                              if (adminResponseFilter === 'pending') return !row.response;
                              return true;
                            });

                            if (rows.length === 0) {
                              return (
                                <tr>
                                  <td colSpan="4" className="empty-row">
                                    No matching targets found.
                                  </td>
                                </tr>
                              );
                            }

                            return rows.map(({ teacher, response, status }) => (
                              <tr 
                                key={teacher.id} 
                                className={`status-row-${status.toLowerCase().replace(/\s+/g, '-')} ${response ? 'clickable-row' : ''}`}
                                onClick={() => response && handleSelectResponse({ teacher, response, status })}
                              >
                                <td>
                                  <div className="table-teacher-info">
                                    <span className="table-teacher-name">{teacher.fullName || teacher.email}</span>
                                    <span className="table-teacher-sub">{teacher.position || 'Teacher'}</span>
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
                                    </div>
                                  ) : (
                                    <span className="pending-text-placeholder">Not submitted yet</span>
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
                    const banner = getBannerProps(selectedTask);
                    const userResponse = responses.find(r => r.submissionId === selectedTask.id && r.userId === user.uid);
                    return (
                      <>
                        {userResponse && userResponse.feedback && (
                          <div className={`review-feedback-banner ${userResponse.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            <strong>Review Status: {userResponse.status}</strong>
                            <p><strong>Admin Feedback:</strong> {userResponse.feedback}</p>
                          </div>
                        )}
                        <div className={`onedrive-banner ${(selectedTask.linkType || detectLinkType(selectedTask.folderLink))}-banner-type`}>
                          <div className="onedrive-icon">{banner.icon}</div>
                          <div className="onedrive-text">
                            <strong>{banner.title}</strong>
                            <p>{banner.text}</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                  <form onSubmit={handleSubmitResponse}>
                    <div className="form-group">
                      <label>Submission Link / Document URL (Optional)</label>
                      <input 
                        type="url" 
                        placeholder="Paste link here if you want to link the specific file or form response..." 
                        value={responseForm.link}
                        onChange={e => setResponseForm({...responseForm, link: e.target.value})}
                      />
                      <p className="field-hint">You can leave this blank if you submitted on the external link directly and do not need to attach a file link.</p>
                    </div>
                    <div className="form-group">
                      <label>Remarks / Notes</label>
                      <textarea 
                        placeholder="e.g., Done uploading my report."
                        value={responseForm.remarks}
                        onChange={e => setResponseForm({...responseForm, remarks: e.target.value})}
                      ></textarea>
                    </div>
                    <button type="submit" className="submit-btn full">
                      {getStatus(selectedTask.id) === 'Submitted' ? 'Update Submission' : 'Submit Report'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
