import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { createPortal } from 'react-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { user } = useAuth();
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
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      <div className="content-wrapper">
        <Header />
        <main className="main-content">
          <Outlet />
        </main>
      </div>

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
            {!isAdmin && (
              <div className="notification-modal-footer">
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
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Layout;
