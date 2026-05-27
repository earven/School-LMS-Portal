import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import './Header.css';

const Header = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
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

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Portal / Dashboard';
    if (path === '/students') return 'Portal / Student Management';
    if (path === '/personnel') return 'Portal / Personnel Management';
    if (path === '/personnel/configure-fields') return 'Portal / Personnel Management / Configure Fields';
    if (path === '/personnel/new') return 'Portal / Personnel Management / Add New';
    if (path.match(/^\/personnel\/[^/]+\/edit$/)) return 'Portal / Personnel Management / Edit Record';
    if (path.startsWith('/personnel/')) return 'Portal / Personnel Management / Profile';
    if (path === '/teacher-tools') return 'Portal / Teacher Tools';
    if (path === '/teacher-tools/teaching-load') return 'Portal / Teacher Tools / Teaching Load';
    if (path.startsWith('/teacher-tools/')) {
      const tool = path.split('/').pop();
      const toolName = tool.charAt(0).toUpperCase() + tool.slice(1).replace('-', ' ');
      return `Portal / Teacher Tools / ${toolName}`;
    }
    if (path === '/settings') return 'Portal / System Settings';
    if (path === '/sections') return 'Portal / Section Management';
    return 'Portal';
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
        <span className="breadcrumb">{getBreadcrumb()}</span>
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

        <div className="academic-year-badge">
          AY {settings.academicYear}
        </div>
      </div>
    </header>
  );
};

export default Header;
