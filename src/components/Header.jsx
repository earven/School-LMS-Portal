import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import './Header.css';

const Header = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Portal / Dashboard';
    if (path === '/students') return 'Portal / Student Management';
    if (path === '/personnel') return 'Portal / Personnel Management';
    if (path === '/teacher-tools') return 'Portal / Teacher Tools';
    if (path.startsWith('/teacher-tools/')) {
      const tool = path.split('/').pop();
      const toolName = tool.charAt(0).toUpperCase() + tool.slice(1).replace('-', ' ');
      return `Portal / Teacher Tools / ${toolName}`;
    }
    if (path === '/settings') return 'Portal / System Settings';
    if (path === '/sections') return 'Portal / Section Management';
    return 'Portal';
  };

  return (
    <header className="main-header">
      <div className="header-left">
        <span className="breadcrumb">{getBreadcrumb()}</span>
      </div>
      <div className="header-right">
        <div className="academic-year-badge">
          AY {settings.academicYear}
        </div>
        <div className="user-profile-summary">
          <div className="user-info">
            <span className="user-name">{user?.username}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <div className="user-avatar">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
