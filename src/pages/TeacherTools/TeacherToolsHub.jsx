import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TeacherToolsHub.css';

const TeacherToolsHub = () => {
  const navigate = useNavigate();

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
      id: 'teaching-load',
      title: 'Teaching Load',
      description: 'Manage subject assignments per school year (not stored in personnel profile).',
      icon: '📚',
      path: '/teacher-tools/teaching-load',
      color: '#36b9cc'
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
    }
  ];

  return (
    <div className="tools-hub-container">
      <div className="hub-header">
        <h1>Teacher Tools Hub</h1>
        <p>Access your digital classroom management modules.</p>
      </div>

      <div className="tools-grid">
        {tools.map(tool => (
          <div 
            key={tool.id} 
            className="tool-card" 
            onClick={() => navigate(tool.path)}
            style={{ '--accent-color': tool.color }}
          >
            <div className="tool-icon">{tool.icon}</div>
            <div className="tool-info">
              <h3>{tool.title}</h3>
              <p>{tool.description}</p>
            </div>
            <div className="tool-footer">
              <span>Open Module →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherToolsHub;
