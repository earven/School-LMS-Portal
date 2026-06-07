import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import './Header.css';

const Header = () => {
  const { user } = useAuth();
  const { settings, updateSettings, sessionAcademicYear, setSessionAcademicYear, isReadOnly } = useSettings();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, setSelectedNotification } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const base = { label: 'Portal', path: '/dashboard' };

    if (path === '/dashboard') return [base, { label: 'Dashboard', path: '/dashboard' }];
    if (path === '/students') return [base, { label: 'Student Management', path: '/students' }];
    if (path === '/personnel') return [base, { label: 'Personnel Management', path: '/personnel' }];
    if (path === '/personnel/configure-fields') return [base, { label: 'Personnel Management', path: '/personnel' }, { label: 'Configure Fields', path: '/personnel/configure-fields' }];
    if (path === '/personnel/new') return [base, { label: 'Personnel Management', path: '/personnel' }, { label: 'Add New', path: '/personnel/new' }];
    if (path.match(/^\/personnel\/[^/]+\/edit$/)) return [base, { label: 'Personnel Management', path: '/personnel' }, { label: 'Edit Record', path: path }];
    if (path.startsWith('/personnel/')) return [base, { label: 'Personnel Management', path: '/personnel' }, { label: 'Profile', path: path }];
    if (path === '/teacher-tools') return [base, { label: 'Teacher Tools', path: '/teacher-tools' }];
    if (path === '/teacher-tools/teaching-load') return [base, { label: 'Teacher Tools', path: '/teacher-tools' }, { label: 'Teaching Load', path: '/teacher-tools/teaching-load' }];
    if (path.startsWith('/teacher-tools/')) {
      const tool = path.split('/').pop();
      const toolName = tool.charAt(0).toUpperCase() + tool.slice(1).replace('-', ' ');
      return [base, { label: 'Teacher Tools', path: '/teacher-tools' }, { label: toolName, path: path }];
    }
    if (path === '/settings') return [base, { label: 'System Settings', path: '/settings' }];
    if (path === '/sections') return [base, { label: 'Section Management', path: '/sections' }];
    return [base];
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) await markAsRead(notif.id);
    setShowDropdown(false);
    setSelectedNotification(notif);
  };

  const formatNotifTime = (timestamp) => {
    if (!timestamp) return '';
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    if (isNaN(date.getTime())) return 'N/A';
    
    // Relative time
    const diffMs = new Date() - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <header className="main-header">
      <div className="header-left">
        <span className="breadcrumb">
          {getBreadcrumbs().map((crumb, index, array) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="breadcrumb-separator"> / </span>}
              {index === array.length - 1 ? (
                <span className="breadcrumb-current">{crumb.label}</span>
              ) : (
                <Link to={crumb.path} className="breadcrumb-link">{crumb.label}</Link>
              )}
            </React.Fragment>
          ))}
        </span>
      </div>
      <div className="header-right">
        {/* Real-time Notifications Bell */}
        <div className="notifications-wrapper" ref={dropdownRef}>
          <button 
            className={`notifications-bell-btn ${showDropdown ? 'active' : ''}`} 
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label="Toggle notifications"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {unreadCount > 0 && (
              <span className="notifications-badge animate-pulse">{unreadCount}</span>
            )}
          </button>

          {showDropdown && (
            <div className="notifications-dropdown">
              <div className="notifications-dropdown-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && (
                  <button className="mark-all-read-btn" onClick={markAllAsRead}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="notifications-dropdown-list">
                {notifications.length === 0 ? (
                  <div className="notifications-empty">
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`notification-item ${!notif.read ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="notif-content">
                        <div className="notif-header">
                          <span className="notif-title">{notif.title}</span>
                          <span className="notif-time">{formatNotifTime(notif.createdAt)}</span>
                        </div>
                        <p className="notif-message">{notif.message}</p>
                      </div>
                      <div className="notif-actions">
                        <button 
                          className="notif-delete-btn" 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          title="Dismiss"
                        >
                          ✕
                        </button>
                        {!notif.read && <span className="unread-dot"></span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="academic-year-selector">
          {isReadOnly && (
            <span className="read-only-badge" style={{ 
              backgroundColor: '#fee2e2', 
              color: '#ef4444', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '0.75rem', 
              fontWeight: '600',
              marginRight: '8px'
            }}>
              READ-ONLY
            </span>
          )}
          <span className="calendar-icon">📅</span>
          <select 
            value={sessionAcademicYear} 
            onChange={(e) => setSessionAcademicYear(e.target.value)}
            className="academic-year-select"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const start = 2024 + i;
              const sy = `${start}-${start + 1}`;
              let label = `SY ${sy}`;
              if (sy === settings.academicYear) {
                label += settings.academicYearStatus === 'locked' ? ' (Locked)' : ' (Active)';
              }
              return (
                <option key={sy} value={sy}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>
      </div>
    </header>
  );
};

export default Header;
