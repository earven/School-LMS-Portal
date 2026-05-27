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
  const { tasks, responses, createTask, updateTask, submitResponse, deleteTask } = useSubmissions();
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

  const isAdmin = ['admin', 'system_admin'].includes(user?.role);

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
        alert('Submission task updated successfully!');
      } else {
        await createTask(newTask);
        alert('Submission task created and sent to teachers!');
      }
      setShowCreateModal(false);
      setNewTask({ title: '', description: '', deadline: '', recipients: [], folderLink: '', linkType: 'onedrive' });
      setEditTaskId(null);
      setIsEditingTask(false);
    } catch (err) {
      alert(`Failed to ${isEditingTask ? 'update' : 'create'} task: ${err?.message || 'Please check Firestore rules and permissions.'}`);
    }
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    try {
      await submitResponse(selectedTask.id, responseForm);
      setShowDetailModal(false);
      setResponseForm({ remarks: '', link: '' });
      alert('Report submitted successfully!');
    } catch (err) {
      alert('Failed to submit report.');
    }
  };

  const getStatus = (taskId) => {
    const response = responses.find(r => r.submissionId === taskId && r.userId === user.uid);
    return response ? response.status : 'Pending';
  };

  const getAdminStats = (task) => {
    const taskResponses = responses.filter(r => r.submissionId === task.id);
    const allTeachers = personnel.filter(p => p.role === 'teacher');
    
    let totalCount = allTeachers.length;
    
    if (task.recipients === 'advisers' || task.recipients === 'non-advisers') {
      if (task.recipients === 'advisers') {
        totalCount = allTeachers.filter(t => adviserIds.has(t.id)).length;
      } else {
        totalCount = allTeachers.filter(t => !adviserIds.has(t.id)).length;
      }
    } else if (typeof task.recipients === 'string' && task.recipients.startsWith('subject:')) {
      const sub = task.recipients.replace('subject:', '');
      totalCount = allTeachers.filter(t => (t.subjects || []).includes(sub)).length;
    } else if (task.recipients !== 'all') {
      // Individual teacher
      totalCount = 1;
    }
    
    return {
      count: taskResponses.length,
      total: totalCount
    };
  };

  const handleExportResponses = () => {
    if (!selectedTask) return;
    const taskResponses = responses.filter(r => r.submissionId === selectedTask.id);
    const headers = ['Teacher', 'Date Submitted', 'Link', 'Remarks', 'Status'];
    const csvContent = [
      headers.join(','),
      ...taskResponses.map(r => {
        const personnelName = personnel.find(p => p.id === r.userId)?.fullName || r.userName || 'Unknown';
        return [
          `"${personnelName}"`,
          `"${formatDateTime(r.submittedAt)}"`,
          `"${r.link || ''}"`,
          `"${r.remarks || ''}"`,
          `"${r.status || 'Submitted'}"`
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

      <div className="task-grid">
        {tasks
          .filter(task => {
            if (isAdmin) return true;
            if (task.recipients === 'all') return true;
            if (task.recipients === 'advisers') return isTeacherAdviser;
            if (task.recipients === 'non-advisers') return !isTeacherAdviser;
            if (typeof task.recipients === 'string' && task.recipients.startsWith('subject:')) {
              const sub = task.recipients.replace('subject:', '');
              return (user?.subjects || []).includes(sub);
            }
            return task.recipients === user?.uid;
          })
          .map(task => {
            const status = isAdmin ? 'Admin' : getStatus(task.id);
            const stats = isAdmin ? getAdminStats(task) : null;
            const isOverdue = new Date(task.deadline) < new Date() && status === 'Pending';
            
            const isTargeted = task.recipients !== 'all';
            const targetPerson = isTargeted ? personnel.find(p => p.id === task.recipients) : null;

            return (
              <div 
                key={task.id} 
                className={`task-card ${status.toLowerCase()} ${isOverdue ? 'overdue' : ''}`}
                onClick={() => {
                  setSelectedTask(task);
                  setShowDetailModal(true);
                }}
              >
                <div className="task-card-header">
                  <span className={`status-badge ${status.toLowerCase()}`}>
                    {isAdmin ? `${stats.count} / ${stats.total} Submitted` : status}
                  </span>
                  <span className="deadline-tag">Due: {formatDate(task.deadline)}</span>
                </div>
                <h3>{task.title}</h3>
                {isAdmin && task.recipients !== 'all' && (
                  <p className="task-target-badge">
                    {task.recipients === 'advisers' && '🎯 Target: Advisers Only'}
                    {task.recipients === 'non-advisers' && '🎯 Target: Non-Advisers Only'}
                    {typeof task.recipients === 'string' && task.recipients.startsWith('subject:') && `🎯 Target: ${task.recipients.replace('subject:', '').toUpperCase()} Teachers Only`}
                    {targetPerson && `🎯 Target: ${targetPerson.fullName || targetPerson.email}`}
                  </p>
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
        })}
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
              <button className="close-x" onClick={() => setShowDetailModal(false)}>✕</button>
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
                <div className="admin-responses">
                  <div className="admin-responses-header">
                    <h3>Submission List</h3>
                    <button className="export-csv-btn" onClick={handleExportResponses}>
                      📥 Export CSV
                    </button>
                  </div>
                  <div className="responses-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Teacher</th>
                          <th>Date Submitted</th>
                          <th>Link/Remarks</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {responses.filter(r => r.submissionId === selectedTask.id).map(r => {
                          const personnelName = personnel.find(p => p.id === r.userId)?.fullName || r.userName || 'Unknown';
                          return (
                            <tr key={r.id}>
                              <td>{personnelName}</td>
                              <td>{formatDateTime(r.submittedAt)}</td>
                              <td>
                                {r.link && <a href={r.link} target="_blank" rel="noreferrer">View Link</a>}
                                <p className="mini-remarks">{r.remarks}</p>
                              </td>
                              <td><span className="status-pill submitted">Submitted</span></td>
                            </tr>
                          );
                        })}
                        {responses.filter(r => r.submissionId === selectedTask.id).length === 0 && (
                          <tr><td colSpan="4" className="empty-row">No submissions yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="teacher-submit-form">
                  {(() => {
                    const banner = getBannerProps(selectedTask);
                    return (
                      <div className={`onedrive-banner ${(selectedTask.linkType || detectLinkType(selectedTask.folderLink))}-banner-type`}>
                        <div className="onedrive-icon">{banner.icon}</div>
                        <div className="onedrive-text">
                          <strong>{banner.title}</strong>
                          <p>{banner.text}</p>
                        </div>
                      </div>
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
    </div>
  );
};

export default SubmissionTracker;
