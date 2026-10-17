import React, { useState, Suspense } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import CommandPalette from '../components/CommandPalette';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import DpaConsentModal from './DpaConsentModal';
import './Layout.css';

const Layout = () => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user } = useAuth();
  const { settings } = useSettings();
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);
  const { selectedNotification, setSelectedNotification, acknowledgeNotification } = useNotifications();

  const toggleSidebar = (value) => {
    if (typeof value === 'boolean') {
      setIsCollapsed(value);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className={`app-container ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <CommandPalette />
      {isMobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileOpen(false)}></div>
      )}
      <Sidebar 
        isCollapsed={isCollapsed} 
        toggleSidebar={toggleSidebar} 
        isMobileOpen={isMobileOpen} 
        closeMobileMenu={() => setIsMobileOpen(false)} 
      />
      <div className="content-wrapper">
        <Header onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)} />
        <main className="main-content">
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
              <div className="spinner" style={{ border: '3px solid rgba(0,0,0,0.08)', width: '32px', height: '32px', borderRadius: '50%', borderLeftColor: '#0052cc', animation: 'spin 0.8s linear infinite' }}></div>
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>
      </div>


      {/* Bottom Navigation for Mobile PWA */}
      <nav className="mobile-bottom-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span>Dashboard</span>
        </NavLink>

        {settings.enabledModules.calendar && (
          <NavLink to="/calendar" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Calendar</span>
          </NavLink>
        )}

        {settings.enabledModules.teacherTools && (
          <NavLink to="/teacher-tools" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            <span>Tools</span>
          </NavLink>
        )}

        {settings.enabledModules.studentManagement && (
          <NavLink to="/students" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
            <span>Students</span>
          </NavLink>
        )}

        <NavLink to="/profile" className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>Profile</span>
        </NavLink>
      </nav>

      {selectedNotification && createPortal(
        <div className="notification-modal-overlay" onClick={() => setSelectedNotification(null)}>
          <div className="notification-modal-content" onClick={e => e.stopPropagation()}>
            <div className="notification-modal-header">
              <h2>{selectedNotification.title}</h2>
              <button className="close-modal-btn" onClick={() => setSelectedNotification(null)}>×</button>
            </div>
            <div className="notification-modal-meta">
              <span className="sender-badge">From: {selectedNotification.senderName}</span>
              <span className="time-badge">
                {selectedNotification.createdAt?.toDate ? selectedNotification.createdAt.toDate().toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date(selectedNotification.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="notification-modal-body">
              {selectedNotification.message?.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            {(selectedNotification.link || !isAdmin) && (
              <div className="notification-modal-footer">
                {selectedNotification.link && (
                  <button
                    className="modal-action-btn"
                    onClick={() => {
                      navigate(selectedNotification.link);
                      setSelectedNotification(null);
                    }}
                  >
                    🔗 Go to Page
                  </button>
                )}
                {!isAdmin && (
                  <button 
                    onClick={() => {
                      if (!selectedNotification.acknowledged) {
                        acknowledgeNotification(selectedNotification.id);
                        setSelectedNotification(prev => ({...prev, acknowledged: true}));
                      }
                    }}
                    disabled={selectedNotification.acknowledged}
                    className={`modal-ack-btn ${selectedNotification.acknowledged ? 'acknowledged' : ''}`}
                  >
                    {selectedNotification.acknowledged ? '👍 Acknowledged' : '👍 Acknowledge'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      <DpaConsentModal />
    </div>
  );
};

export default Layout;
