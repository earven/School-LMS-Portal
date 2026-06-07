import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import './TeacherToolsHub.css';

const TeacherToolsHub = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);

  const tools = [
    {
      id: 'submission-tracker',
      title: 'Submission Tracker',
      description: 'Track student/teacher submissions and check status.',
      icon: '📝',
      path: '/teacher-tools/submissions',
      color: '#4e73df'
    },
    {
      id: 'teacher-attendance',
      title: isAdmin ? 'Teacher Attendance' : 'My Attendance Record',
      description: isAdmin 
        ? 'Log daily attendance, absence, and tardiness for teachers and staff.' 
        : 'View your personal monthly attendance logs and history.',
      icon: '🧑‍🏫',
      path: '/teacher-tools/teacher-attendance',
      color: '#9b59b6'
    },
    {
      id: 'teaching-load',
      title: 'Teaching Load',
      description: 'Manage subject assignments per school year (not stored in personnel profile).',
      icon: '📚',
      path: '/teacher-tools/teaching-load',
      color: '#36b9cc'
    },
    {
      id: 'teaching-load-generator',
      title: 'Load Generator',
      description: 'Auto-generate teaching schedules for all sections.',
      icon: '⚙️',
      path: '/teacher-tools/load-generator',
      color: '#f39c12',
      adminOnly: true
    },
    {
      id: 'e-filers',
      title: 'e-FILERS',
      description: 'Digital Filing System to upload and organize documents.',
      icon: '📂',
      path: '/teacher-tools/e-filers',
      color: '#1cc88a'
    },
    {
      id: 'attendance-tracker',
      title: 'Attendance Tracker',
      description: 'Manage and track student and teacher attendance records.',
      icon: '📅',
      path: '/teacher-tools/attendance',
      color: '#f6c23e'
    },
    {
      id: 'academic-records',
      title: 'Academic Records',
      description: 'Manage student grades, performance, and academic history.',
      icon: '📊',
      path: '/teacher-tools/data',
      color: '#e74a3b'
    },
    {
      id: 'inventory-tracker',
      title: 'Inventory Tracker',
      description: 'Track inventorable materials and consumables assigned to teachers.',
      icon: '📦',
      path: '/teacher-tools/inventory',
      color: '#8e44ad'
    },
    {
      id: 'enrolment-lister',
      title: 'Enrolment Lister',
      description: 'Manage student enrolments and documentation.',
      icon: '📝',
      path: '/teacher-tools/enrolment-lister',
      color: '#2c3e50'
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

  return (
    <div className="tools-hub-container">
      <div className="hub-header">
        <h1>Teacher Tools Hub</h1>
        <p>Access your digital classroom management modules.</p>
      </div>

      <div className="tools-grid">
        {tools.filter(tool => {
          if (tool.adminOnly) return isAdmin;
          if (isAdmin) return true;
          // For teachers, check if tool is visible
          return settings.teacherToolVisibilities?.[tool.id] !== false;
        }).map(tool => {
          const isVisible = settings.teacherToolVisibilities?.[tool.id] !== false;
          
          return (
            <div 
              key={tool.id} 
              className={`tool-card ${(!isVisible && !tool.adminOnly) ? 'tool-hidden-preview' : ''}`}
              onClick={() => navigate(tool.path)}
              style={{ '--accent-color': tool.color, opacity: (!isVisible && !tool.adminOnly) ? 0.7 : 1 }}
            >
              <div className="tool-icon">{tool.icon}</div>
              <div className="tool-info">
                <h3>
                  {tool.title}
                  {tool.adminOnly && (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: '#e74a3b',
                      color: '#fff',
                      marginLeft: '8px',
                      verticalAlign: 'middle'
                    }}>
                      Admin
                    </span>
                  )}
                  {isAdmin && !tool.adminOnly && !isVisible && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: '#6b7280',
                      color: '#fff',
                      marginLeft: '8px',
                      verticalAlign: 'middle'
                    }}>
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
        })}
      </div>
    </div>
  );
};

export default TeacherToolsHub;
