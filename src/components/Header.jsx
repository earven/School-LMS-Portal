import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import './Header.css';

const Header = ({ onToggleMobileMenu }) => {
  const { settings, sessionAcademicYear, setSessionAcademicYear, isReadOnly } = useSettings();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, setSelectedNotification } = useNotifications();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'unread'
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
      const toolName = tool.charAt(0).toUpperCase() + tool.slice(1).replace(/-/g, ' ');
      return [base, { label: 'Teacher Tools', path: '/teacher-tools' }, { label: toolName, path: path }];
    }
    if (path === '/settings') return [base, { label: 'System Settings', path: '/settings' }];
    if (path === '/sections') return [base, { label: 'Section Management', path: '/sections' }];
    if (path === '/calendar') return [base, { label: 'Calendar & Schedule', path: '/calendar' }];
    if (path === '/messages') return [base, { label: 'Messaging Hub', path: '/messages' }];
    if (path === '/profile') return [base, { label: 'My Profile', path: '/profile' }];
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

  const filteredNotifications = notifFilter === 'unread' 
    ? notifications.filter(n => !n.read) 
    : notifications;

  return (
    <header className="main-header">
      <div className="header-left">
        <button 
          type="button" 
          className="mobile-hamburger-btn" 
          onClick={onToggleMobileMenu}
          aria-label="Open navigation menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <nav className="breadcrumb-nav" aria-label="Breadcrumb">
          <ol className="breadcrumb-list">
            {getBreadcrumbs().map((crumb, index, array) => (
              <li key={index} className="breadcrumb-item">
                {index > 0 && (
                  <svg className="breadcrumb-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                )}
                {index === array.length - 1 ? (
                  <span className="breadcrumb-current" aria-current="page">{crumb.label}</span>
                ) : (
                  <Link to={crumb.path} className="breadcrumb-link">{crumb.label}</Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="header-right">
        {/* Real-time Notifications Bell */}
        <div className="notifications-wrapper" ref={dropdownRef}>
          <button 
            className={`notifications-bell-btn ${showDropdown ? 'active' : ''}`} 
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label="Toggle notifications"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {unreadCount > 0 && (
              <span className="notifications-badge animate-pulse">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          {showDropdown && (
            <div className="notifications-dropdown">
              <div className="notifications-dropdown-header">
                <div className="notif-header-title">
                  <h3>Notifications</h3>
                  {unreadCount > 0 && <span className="badge badge-primary">{unreadCount} new</span>}
                </div>
                {unreadCount > 0 && (
                  <button className="mark-all-read-btn" onClick={markAllAsRead}>
                    Mark all read
                  </button>
                )}
              </div>

              <div className="notif-filter-tabs">
                <button 
                  className={`notif-tab ${notifFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setNotifFilter('all')}
                >
                  All ({notifications.length})
                </button>
                <button 
                  className={`notif-tab ${notifFilter === 'unread' ? 'active' : ''}`}
                  onClick={() => setNotifFilter('unread')}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              <div className="notifications-dropdown-list">
                {filteredNotifications.length === 0 ? (
                  <div className="notifications-empty">
                    <div className="empty-bell-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </svg>
                    </div>
                    <p>{notifFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
                  </div>
                ) : (
                  filteredNotifications.map(notif => (
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
                          aria-label="Dismiss notification"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
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

        {/* Academic Year Selector Pill */}
        <div className="academic-year-selector">
          {isReadOnly && (
            <span className="read-only-badge">
              READ-ONLY
            </span>
          )}
          <svg className="calendar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <select 
            value={sessionAcademicYear} 
            onChange={(e) => setSessionAcademicYear(e.target.value)}
            className="academic-year-select"
            aria-label="Select Academic Year"
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

