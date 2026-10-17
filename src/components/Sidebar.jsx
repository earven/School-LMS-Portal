import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useMessaging } from '../context/MessagingContext.jsx';
import './Sidebar.css';

// Modern Crisp Sidebar Icons
const Icons = {
  Dashboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  Sections: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  Students: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
    </svg>
  ),
  Personnel: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Tools: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Logout: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Menu: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  Collapse: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  Messages: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
};

const routePreloaders = {
  '/dashboard': () => import('../pages/DashboardPage'),
  '/calendar': () => import('../pages/CalendarPage.jsx'),
  '/messages': () => import('../pages/MessagingPage'),
  '/students': () => import('../pages/StudentsPage'),
  '/personnel': () => import('../pages/PersonnelPage'),
  '/sections': () => import('../pages/TeacherTools/SectionsPage'),
  '/teacher-tools': () => import('../pages/TeacherTools/TeacherToolsHub'),
  '/settings': () => import('../pages/SettingsPage'),
};

const Sidebar = ({ isCollapsed, toggleSidebar, isMobileOpen, closeMobileMenu }) => {
  const { logout, user } = useAuth();
  const { settings } = useSettings();
  const { totalUnreadCount } = useMessaging();
  
  const sidebarItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <Icons.Dashboard />, enabled: true },
    { path: '/calendar', label: 'Calendar', icon: <Icons.Calendar />, enabled: settings.enabledModules?.calendar !== false },
    { path: '/messages', label: 'Messages', icon: <Icons.Messages />, enabled: true, badge: totalUnreadCount },
    { path: '/students', label: 'Students', icon: <Icons.Students />, enabled: settings.enabledModules?.studentManagement !== false },
    { path: '/personnel', label: 'Personnel', icon: <Icons.Personnel />, enabled: settings.enabledModules?.personnelManagement !== false },
    { path: '/sections', label: 'Sections', icon: <Icons.Sections />, enabled: settings.enabledModules?.sections !== false && ['admin', 'system_admin', 'teacher'].includes(user?.role) },
    { path: '/teacher-tools', label: 'Teacher Tools', icon: <Icons.Tools />, enabled: settings.enabledModules?.teacherTools !== false },
    { path: '/settings', label: 'Settings', icon: <Icons.Settings />, enabled: ['admin', 'system_admin'].includes(user?.role) },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'open' : ''}`}>
      <div className={`sidebar-header ${settings.logoPosition || 'left'}`}>
        {!isCollapsed && (
          <div className="logo-section">
            {settings.schoolLogo ? (
              <img src={settings.schoolLogo} alt="Logo" className="sidebar-logo" />
            ) : (
              <div className="logo-placeholder">
                {(settings.schoolName || 'SL').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="sidebar-brand">
              <h2>{settings.schoolName || 'School Portal'}</h2>
              <span className="portal-tag">
                <span className="online-indicator-dot"></span>
                {['admin', 'system_admin'].includes(user?.role) ? 'Admin Portal' : 'Teacher Portal'}
              </span>
            </div>
          </div>
        )}
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={() => toggleSidebar()}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <Icons.Menu /> : <Icons.Collapse />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {sidebarItems.filter(item => item.enabled).map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                title={isCollapsed ? item.label : ''}
                onMouseEnter={() => {
                  try { routePreloaders[item.path]?.(); } catch {}
                }}
                onFocus={() => {
                  try { routePreloaders[item.path]?.(); } catch {}
                }}
                onClick={() => {
                  if (closeMobileMenu) closeMobileMenu();
                }}
              >
                <span className="nav-icon">
                  {item.icon}
                  {isCollapsed && item.badge > 0 && (
                    <span className="collapsed-badge">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
                {!isCollapsed && item.badge > 0 && (
                  <span className="nav-badge-pill">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <NavLink 
          to={isCollapsed ? '#' : '/profile'} 
          className="user-profile-summary" 
          title={isCollapsed ? 'Expand Sidebar' : 'My Profile'}
          onClick={(e) => {
            if (isCollapsed) {
              e.preventDefault();
              toggleSidebar();
            } else {
              if (closeMobileMenu) closeMobileMenu();
            }
          }}
        >
          <div className="user-avatar">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" className="avatar-img" />
            ) : (
              (user?.fullName || user?.username || 'U').charAt(0).toUpperCase()
            )}
          </div>
          {!isCollapsed && (
            <div className="user-info">
              <span className="user-name">{user?.fullName || user?.username}</span>
              <span className="user-role">{(user?.role || 'User').replace(/_/g, ' ')}</span>
            </div>
          )}
        </NavLink>
        {!isCollapsed && (
          <div className="sidebar-links-minor">
            <NavLink to="/privacy-policy" className="minor-link">
              Privacy Policy & Terms
            </NavLink>
          </div>
        )}
        <button onClick={logout} className="logout-btn" title={isCollapsed ? 'Sign Out' : ''}>
          <Icons.Logout />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

