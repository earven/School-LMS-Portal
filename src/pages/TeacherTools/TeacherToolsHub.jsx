import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useNotifications } from '../../context/NotificationContext';
import { db } from '../../firebase';
import { writeBatch, doc } from 'firebase/firestore';
import './TeacherToolsHub.css';

const isNotificationForTool = (notif, tool) => {
  if (notif.read) return false;
  
  // Match by link path
  if (notif.link && notif.link.toLowerCase().startsWith(tool.path.toLowerCase())) {
    return true;
  }
  
  // Match by keywords/type (for fallback or extra robustness)
  const title = (notif.title || '').toLowerCase();
  const message = (notif.message || '').toLowerCase();
  const type = (notif.type || '').toLowerCase();
  
  if (tool.id === 'submission-tracker') {
    if (type.includes('submission') || type === 'task' || title.includes('submission') || title.includes('task')) {
      return true;
    }
  }
  if (tool.id === 'teacher-attendance' || tool.id === 'attendance-tracker') {
    const isTeacher = title.includes('teacher') || message.includes('teacher') || type.includes('teacher');
    const isStudent = title.includes('student') || message.includes('student') || type.includes('student') || title.includes('sf2') || message.includes('sf2') || type.includes('sf2');
    if (title.includes('attendance') || message.includes('attendance') || title.includes('sf2') || message.includes('sf2') || type.includes('sf2')) {
      if (tool.id === 'teacher-attendance' && isTeacher && !isStudent) return true;
      if (tool.id === 'attendance-tracker') return true;
    }
  }
  if (tool.id === 'teaching-load' || tool.id === 'teaching-load-generator') {
    if (title.includes('load') || message.includes('load') || title.includes('teaching schedule') || message.includes('teaching schedule')) {
      if (tool.id === 'teaching-load-generator' && (title.includes('generate') || message.includes('generator'))) return true;
      if (tool.id === 'teaching-load' && !(title.includes('generate') || message.includes('generator'))) return true;
    }
  }
  if (tool.id === 'e-filers') {
    if (title.includes('filer') || message.includes('filer') || title.includes('document') || message.includes('document')) return true;
  }
  if (tool.id === 'academic-record-tracker') {
    if (title.includes('grade') || message.includes('grade') || title.includes('academic') || message.includes('academic') || title.includes('record') || message.includes('record')) return true;
  }
  if (tool.id === 'inventory-tracker') {
    if (title.includes('inventory') || message.includes('inventory') || title.includes('material') || message.includes('material')) return true;
  }
  if (tool.id === 'enrolment-lister') {
    if (title.includes('enrolment') || message.includes('enrolment') || title.includes('enrollment') || message.includes('enrollment')) return true;
  }
  if (tool.id === 'learning-resources') {
    if (title.includes('resource') || message.includes('resource') || title.includes('onedrive') || message.includes('onedrive')) return true;
  }
  
  if (tool.id === 'memo-stocker') {
    if (type === 'memo' || title.includes('memo') || message.includes('memo')) return true;
  }

  if (tool.id === 'computer-lab-log') {
    if (title.includes('lab') || message.includes('lab') || title.includes('visitor') || message.includes('visitor')) return true;
  }
  
  return false;
};

const getUnreadCountForTool = (tool, notifications) => {
  if (!notifications) return 0;
  return notifications.filter(notif => isNotificationForTool(notif, tool)).length;
};

const CATEGORIES = [
  { id: 'all', title: 'All Modules', icon: '⚡', description: 'Overview of all available digital tools.' },
  { id: 'classroom', title: 'Classroom Operations', icon: '🏫', description: 'Student attendance, assignments, and enrolments.' },
  { id: 'academic', title: 'Academic Planning', icon: '📚', description: 'Curriculum, loads, schedules, and learning resources.' },
  { id: 'admin-logistics', title: 'Admin & Logistics', icon: '🗄️', description: 'Digital filing, inventories, transmittals, and school memos.' },
  { id: 'personnel', title: 'Personnel Records', icon: '🧑‍🏫', description: 'Teacher attendance and personal logs.' }
];

const TeacherToolsHub = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { notifications } = useNotifications();
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const tools = [
    {
      id: 'submission-tracker',
      title: 'Submission Tracker',
      description: 'Track student/teacher submissions and check status.',
      icon: '📝',
      path: '/teacher-tools/submissions',
      color: '#4e73df',
      category: 'classroom'
    },
    {
      id: 'teacher-attendance',
      title: isAdmin ? 'Teacher Attendance' : 'My Attendance Record',
      description: isAdmin 
        ? 'Log daily attendance, absence, and tardiness for teachers and staff.' 
        : 'View your personal monthly attendance logs and history.',
      icon: '🧑‍🏫',
      path: '/teacher-tools/teacher-attendance',
      color: '#9b59b6',
      category: 'personnel'
    },
    {
      id: 'teaching-load',
      title: 'Teaching Load',
      description: 'Manage subject assignments per school year (not stored in personnel profile).',
      icon: '📚',
      path: '/teacher-tools/teaching-load',
      color: '#36b9cc',
      category: 'academic'
    },
    {
      id: 'teaching-load-generator',
      title: 'Load Generator',
      description: 'Auto-generate teaching schedules for all sections.',
      icon: '⚙️',
      path: '/teacher-tools/load-generator',
      color: '#f39c12',
      adminOnly: true,
      category: 'academic'
    },
    {
      id: 'e-filers',
      title: 'e-FILERS',
      description: 'Digital Filing System to upload and organize documents.',
      icon: '📂',
      path: '/teacher-tools/e-filers',
      color: '#1cc88a',
      category: 'admin-logistics'
    },
    {
      id: 'attendance-tracker',
      title: 'Student Attendance & SF2',
      description: 'Manage daily classroom attendance, view monthly logs, and generate official DepEd SF2/SF4 Excel reports.',
      icon: '📅',
      path: '/teacher-tools/attendance',
      color: '#10b981',
      category: 'classroom'
    },
    {
      id: 'academic-record-tracker',
      title: 'Academic Record Tracker',
      description: 'Record and track the transmittals (ins and outs) of student academic documents.',
      icon: '📂',
      path: '/teacher-tools/academic-record-tracker',
      color: '#e74a3b',
      adminOnly: true,
      category: 'admin-logistics'
    },
    {
      id: 'inventory-tracker',
      title: 'Inventory Tracker',
      description: 'Track inventorable materials and consumables assigned to teachers.',
      icon: '📦',
      path: '/teacher-tools/inventory',
      color: '#8e44ad',
      category: 'admin-logistics'
    },
    {
      id: 'enrolment-lister',
      title: 'Enrolment Lister',
      description: 'Manage student enrolments and documentation.',
      icon: '📝',
      path: '/teacher-tools/enrolment-lister',
      color: '#2c3e50',
      category: 'classroom'
    },
    {
      id: 'learning-resources',
      title: 'Learning Resources Hub',
      description: 'Access, manage, and share classroom learning materials using DepEd OneDrive.',
      icon: '📂',
      path: '/teacher-tools/learning-resources',
      color: '#0078d4',
      category: 'academic'
    },
    {
      id: 'memo-stocker',
      title: 'Memo Stocker',
      description: 'Centralized repository for all official school and DepEd memos with Google Drive viewer.',
      icon: '📌',
      path: '/teacher-tools/memo-stocker',
      color: '#e11d48',
      category: 'admin-logistics'
    },
    {
      id: 'computer-lab-log',
      title: 'Computer Lab Logbook',
      description: 'Log laboratory visitors by LRN, monitor daily computer lab attendance, and export official logbook reports.',
      icon: '💻',
      path: '/teacher-tools/computer-lab-log',
      color: '#0284c7',
      category: 'classroom'
    }
  ];

  const handleToggleVisibility = async (e, toolId, currentVisibility) => {
    e.stopPropagation(); // Prevent navigating
    const newVisibility = !currentVisibility;
    await updateSettings({
      teacherToolVisibilities: {
        ...(settings.teacherToolVisibilities || {}),
        [toolId]: newVisibility
      }
    });
  };

  const handleMarkToolNotificationsRead = async (e, tool) => {
    e.stopPropagation(); // Prevent navigating
    try {
      const toolNotifs = notifications.filter(notif => isNotificationForTool(notif, tool));
      if (toolNotifs.length === 0) return;

      const batch = writeBatch(db);
      toolNotifs.forEach(n => {
        const notifRef = doc(db, 'notifications', n.id);
        batch.update(notifRef, { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error("Error clearing notifications for tool:", err);
    }
  };

  // Helper to count unread notifications for a whole category
  const getCategoryUnreadCount = (categoryId) => {
    if (!notifications) return 0;
    return tools
      .filter(tool => {
        if (tool.adminOnly && !isAdmin) return false;
        if (!isAdmin && settings.teacherToolVisibilities?.[tool.id] === false) return false;
        return categoryId === 'all' || tool.category === categoryId;
      })
      .reduce((sum, tool) => sum + getUnreadCountForTool(tool, notifications), 0);
  };

  // Filter tools based on user roles, tool visibilities, search input, and category tab
  const filteredTools = tools.filter(tool => {
    // 1. Role check
    if (tool.adminOnly && !isAdmin) return false;
    
    // 2. Visibility check for teachers
    if (!isAdmin && settings.teacherToolVisibilities?.[tool.id] === false) return false;
    
    // 3. Search query check
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const titleMatch = tool.title.toLowerCase().includes(q);
      const descMatch = tool.description.toLowerCase().includes(q);
      if (!titleMatch && !descMatch) return false;
    }
    
    // 4. Tab selection check
    if (activeTab !== 'all' && tool.category !== activeTab) return false;
    
    return true;
  });

  const renderToolCard = (tool) => {
    const isVisible = settings.teacherToolVisibilities?.[tool.id] !== false;
    const unreadCount = getUnreadCountForTool(tool, notifications);
    
    return (
      <div 
        key={tool.id} 
        className={`tool-card ${(!isVisible && !tool.adminOnly) ? 'tool-hidden-preview' : ''}`}
        onClick={() => navigate(tool.path)}
        style={{ '--accent-color': tool.color, opacity: (!isVisible && !tool.adminOnly) ? 0.7 : 1 }}
      >
        {unreadCount > 0 && (
          <div 
            className="tool-card-badge" 
            onClick={(e) => handleMarkToolNotificationsRead(e, tool)}
            title="Mark all notifications for this tool as read"
          >
            <span className="badge-count">{unreadCount}</span>
            <span className="badge-check">✓</span>
          </div>
        )}
        <div className="tool-icon">{tool.icon}</div>
        <div className="tool-info">
          <h3>
            {tool.title}
            {tool.adminOnly && (
              <span className="admin-badge-indicator">
                Admin
              </span>
            )}
            {isAdmin && !tool.adminOnly && !isVisible && (
              <span className="hidden-badge-indicator">
                Hidden from Teachers
              </span>
            )}
          </h3>
          <p>{tool.description}</p>
        </div>
        <div className="tool-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span>Open Module →</span>
          {isAdmin && !tool.adminOnly && (
            <label 
              className="switch-container" 
              onClick={(e) => e.stopPropagation()} 
              style={{ margin: 0, scale: '0.8' }}
              title={isVisible ? "Hide from teachers" : "Show to teachers"}
            >
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => handleToggleVisibility(e, tool.id, isVisible)}
              />
              <span className="custom-switch-slider"></span>
            </label>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="tools-hub-container">
      <div className="hub-header">
        <h1>Teacher Tools Hub</h1>
        <p>Access your digital classroom management modules.</p>
      </div>

      {/* Sleek Toolbar for Search and Category Filtering */}
      <div className="hub-toolbar">
        <div className="search-box-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="tool-search-input"
            placeholder="Search tools by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')} title="Clear search">
              ×
            </button>
          )}
        </div>

        <div className="category-tabs">
          {CATEGORIES.map(cat => {
            const count = getCategoryUnreadCount(cat.id);
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                className={`category-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(cat.id)}
              >
                <span className="tab-icon">{cat.icon}</span>
                <span className="tab-title">{cat.title}</span>
                {count > 0 && <span className="tab-badge">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Categorized and Filtered List */}
      {filteredTools.length === 0 ? (
        <div className="no-tools-found">
          <div className="no-results-icon">🔍</div>
          <h3>No modules found</h3>
          <p>No tools matched your search query or role permissions in this category.</p>
          <button 
            type="button" 
            className="reset-filter-btn" 
            onClick={() => { setSearchQuery(''); setActiveTab('all'); }}
          >
            Reset Filters
          </button>
        </div>
      ) : activeTab === 'all' ? (
        // Grouped sections for 'All Tools'
        <div className="grouped-categories-container">
          {CATEGORIES.filter(cat => cat.id !== 'all').map(cat => {
            const catTools = filteredTools.filter(t => t.category === cat.id);
            if (catTools.length === 0) return null;

            return (
              <div key={cat.id} className="category-section">
                <div className="category-section-header">
                  <div className="category-section-title-wrapper">
                    <span className="category-section-icon">{cat.icon}</span>
                    <div>
                      <h2>{cat.title}</h2>
                      <p>{cat.description}</p>
                    </div>
                  </div>
                  <span className="category-tool-count">
                    {catTools.length} {catTools.length === 1 ? 'module' : 'modules'}
                  </span>
                </div>
                <div className="tools-grid">
                  {catTools.map(tool => renderToolCard(tool))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Single category grid
        <div className="category-section">
          {(() => {
            const cat = CATEGORIES.find(c => c.id === activeTab);
            return (
              <div className="category-section-header">
                <div className="category-section-title-wrapper">
                  <span className="category-section-icon">{cat?.icon}</span>
                  <div>
                    <h2>{cat?.title}</h2>
                    <p>{cat?.description}</p>
                  </div>
                </div>
                <span className="category-tool-count">
                  {filteredTools.length} {filteredTools.length === 1 ? 'module' : 'modules'}
                </span>
              </div>
            );
          })()}
          <div className="tools-grid">
            {filteredTools.map(tool => renderToolCard(tool))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherToolsHub;
