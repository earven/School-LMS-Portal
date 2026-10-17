import React, { useState, useEffect } from 'react';
import { DEPED_TASK_TEMPLATES, TASK_CATEGORIES, detectLinkType } from './submissionUtils';

const defaultTaskState = {
  title: '',
  description: '',
  category: 'DepEd Form',
  deadline: '',
  recipients: 'all',
  folderLink: '',
  linkType: 'onedrive'
};

const SubmissionCreateModal = ({
  isOpen,
  onClose,
  isEditing = false,
  initialTask = null,
  personnel = [],
  adviserIds = new Set(),
  onSubmit
}) => {
  const [taskData, setTaskData] = useState(defaultTaskState);

  useEffect(() => {
    if (initialTask) {
      setTaskData({
        title: initialTask.title || '',
        description: initialTask.description || '',
        category: initialTask.category || 'General',
        deadline: initialTask.deadline || '',
        recipients: initialTask.recipients || 'all',
        folderLink: initialTask.folderLink || '',
        linkType: initialTask.linkType || detectLinkType(initialTask.folderLink)
      });
    } else {
      const allTeacherIds = personnel
        .filter(p => ['teacher', 'admin', 'system_admin'].includes(p.role))
        .map(p => p.id);
      setTaskData({
        ...defaultTaskState,
        recipients: allTeacherIds
      });
    }
  }, [initialTask, personnel, isOpen]);

  if (!isOpen) return null;

  const applyTemplate = (template) => {
    const allTeacherIds = personnel
      .filter(p => ['teacher', 'admin', 'system_admin'].includes(p.role))
      .map(p => p.id);
    let assignedRecipients = allTeacherIds;

    if (template.recipients === 'advisers') {
      assignedRecipients = personnel.filter(p => adviserIds.has(p.id)).map(p => p.id);
    } else if (template.recipients === 'non-advisers') {
      assignedRecipients = personnel.filter(p => !adviserIds.has(p.id)).map(p => p.id);
    }

    setTaskData(prev => ({
      ...prev,
      title: template.title,
      description: template.description,
      category: template.category || 'DepEd Form',
      recipients: assignedRecipients,
      linkType: template.linkType
    }));
  };

  const handleQuickSelect = (type) => {
    const allTeachers = personnel.filter(p => ['teacher', 'admin', 'system_admin'].includes(p.role));
    if (type === 'all') {
      setTaskData(prev => ({ ...prev, recipients: allTeachers.map(t => t.id) }));
    } else if (type === 'none') {
      setTaskData(prev => ({ ...prev, recipients: [] }));
    } else if (type === 'advisers') {
      const targeted = allTeachers.filter(t => adviserIds.has(t.id)).map(t => t.id);
      setTaskData(prev => ({ ...prev, recipients: targeted }));
    } else if (type === 'non-advisers') {
      const targeted = allTeachers.filter(t => !adviserIds.has(t.id)).map(t => t.id);
      setTaskData(prev => ({ ...prev, recipients: targeted }));
    } else if (type.startsWith('subject:')) {
      const sub = type.replace('subject:', '');
      const targeted = allTeachers.filter(t => (t.subjects || []).includes(sub)).map(t => t.id);
      setTaskData(prev => ({ ...prev, recipients: targeted }));
    }
  };

  const handleTeacherCheckboxChange = (teacherId, checked) => {
    const allTeachers = personnel.filter(p => ['teacher', 'admin', 'system_admin'].includes(p.role));
    let currentRecipients = [];
    
    if (Array.isArray(taskData.recipients)) {
      currentRecipients = [...taskData.recipients];
    } else if (taskData.recipients === 'all') {
      currentRecipients = allTeachers.map(t => t.id);
    } else if (taskData.recipients === 'advisers') {
      currentRecipients = allTeachers.filter(t => adviserIds.has(t.id)).map(t => t.id);
    } else if (taskData.recipients === 'non-advisers') {
      currentRecipients = allTeachers.filter(t => !adviserIds.has(t.id)).map(t => t.id);
    } else if (typeof taskData.recipients === 'string' && taskData.recipients.startsWith('subject:')) {
      const sub = taskData.recipients.replace('subject:', '');
      currentRecipients = allTeachers.filter(t => (t.subjects || []).includes(sub)).map(t => t.id);
    } else if (taskData.recipients) {
      currentRecipients = [taskData.recipients];
    }
    
    if (checked) {
      if (!currentRecipients.includes(teacherId)) {
        currentRecipients.push(teacherId);
      }
    } else {
      currentRecipients = currentRecipients.filter(id => id !== teacherId);
    }
    
    setTaskData(prev => ({ ...prev, recipients: currentRecipients }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(taskData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Submission Request' : 'Create Submission Request'}</h2>
          <button type="button" className="close-x" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body-scroll">
            {/* DepEd Quick Templates */}
            {!isEditing && (
              <div className="form-group template-picker-group">
                <label className="template-picker-label">⚡ DepEd Standard Form Templates (Click to apply)</label>
                <div className="templates-scroll-row">
                  {DEPED_TASK_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="template-chip-btn"
                      onClick={() => applyTemplate(tmpl)}
                    >
                      <span className="tmpl-cat">{tmpl.category}</span>
                      <span className="tmpl-name">{tmpl.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Task Title *</label>
              <input 
                type="text" 
                placeholder="e.g. SF2 Monthly Attendance" 
                required 
                value={taskData.title}
                onChange={e => setTaskData({ ...taskData, title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Instructions / Description *</label>
              <textarea 
                placeholder="Provide details and instructions about the report..." 
                required
                rows={3}
                value={taskData.description}
                onChange={e => setTaskData({ ...taskData, description: e.target.value })}
              ></textarea>
            </div>
            <div className="form-group">
              <label>Submission Link / Cloud Folder (Optional)</label>
              <input 
                type="url" 
                placeholder="Paste OneDrive folder, Google Drive, or Google Form link here..." 
                value={taskData.folderLink}
                onChange={e => {
                  const url = e.target.value;
                  setTaskData(prev => ({
                    ...prev,
                    folderLink: url,
                    linkType: detectLinkType(url)
                  }));
                }}
              />
              <p className="field-hint">Paste OneDrive folders, Google Forms, Google Drive links, etc. The platform will auto-detect the provider.</p>
            </div>
            <div className="form-group">
              <label>Link Type</label>
              <select
                value={taskData.linkType || 'onedrive'}
                onChange={e => setTaskData({ ...taskData, linkType: e.target.value })}
              >
                <option value="onedrive">OneDrive Folder</option>
                <option value="googledrive">Google Drive Folder</option>
                <option value="form">Google Form / Form</option>
                <option value="survey">Survey Link</option>
                <option value="general">General URL</option>
              </select>
            </div>
            <div className="form-row-2col">
              <div className="form-group">
                <label>Category *</label>
                <select
                  value={taskData.category || 'DepEd Form'}
                  onChange={e => setTaskData({ ...taskData, category: e.target.value })}
                >
                  {TASK_CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Deadline *</label>
                <div className={`date-input-wrapper ${taskData.deadline ? 'has-value' : ''}`}>
                  <input 
                    type="date" 
                    required 
                    value={taskData.deadline}
                    onChange={e => setTaskData({ ...taskData, deadline: e.target.value })}
                  />
                  <span className="date-placeholder">MM-DD-YYYY</span>
                </div>
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
                  {personnel.filter(p => ['teacher', 'admin', 'system_admin'].includes(p.role)).map(p => {
                    const isChecked = Array.isArray(taskData.recipients) 
                      ? taskData.recipients.includes(p.id)
                      : (taskData.recipients === 'all' || 
                         (taskData.recipients === 'advisers' && adviserIds.has(p.id)) ||
                         (taskData.recipients === 'non-advisers' && !adviserIds.has(p.id)) ||
                         (typeof taskData.recipients === 'string' && taskData.recipients.startsWith('subject:') && (p.subjects || []).includes(taskData.recipients.replace('subject:', ''))) ||
                         taskData.recipients === p.id);
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
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-btn">{isEditing ? 'Save Changes' : 'Send Request'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmissionCreateModal;
