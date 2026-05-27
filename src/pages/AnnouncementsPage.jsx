import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import './AnnouncementsPage.css';
import { useNavigate } from 'react-router-dom';
import AnnouncementStats from '../components/AnnouncementStats';

const AnnouncementsPage = () => {
  const { notifications, acknowledgeNotification, deleteAnnouncementGroup, deleteNotification } = useNotifications();
  const { user } = useAuth();
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);
  const navigate = useNavigate();

  const formatNotifTime = (timestamp) => {
    if (!timestamp) return '';
    let date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="announcements-page">
      <div className="announcements-page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          &larr; Back
        </button>
        <h1>Announcements History</h1>
        <p>Review past and active announcements sent to your portal.</p>
      </div>

      <div className="announcements-history-list">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📫</div>
            <p>No announcements found.</p>
          </div>
        ) : (
          notifications.map(notif => {
            const isAcknowledged = notif.acknowledged || (notif.readBy && notif.readBy.includes(user?.uid));
            return (
              <div 
                key={notif.id} 
                className={`history-item card type-${notif.type || 'info'} ${isAcknowledged ? 'acknowledged-item' : 'unread-item'}`}
              >
                <div className="feed-item-header">
                  <div className="feed-sender">
                    <div className="sender-avatar">
                      {(notif.senderName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="sender-info">
                      <span className="sender-name">{notif.senderName}</span>
                      <span className="feed-time">{formatNotifTime(notif.createdAt)}</span>
                    </div>
                  </div>
                  {notif.type && notif.type !== 'info' && (
                    <div className={`feed-badge badge-${notif.type}`}>
                      {notif.type.toUpperCase()}
                    </div>
                  )}
                </div>
                
                <h3 className="feed-title">{notif.title}</h3>
                
                <div className="feed-body markdown-content">
                  <ReactMarkdown>{notif.message}</ReactMarkdown>
                </div>
                
                {notif.link && (
                  <div className="feed-link-container">
                    <a href={notif.link} target="_blank" rel="noopener noreferrer" className="feed-external-link" onClick={e => e.stopPropagation()}>
                      🔗 View Attached Link
                    </a>
                  </div>
                )}

                <div className="feed-actions">
                  {!isAcknowledged && notif.senderId !== user?.uid && (
                    <button 
                      className="ack-btn"
                      onClick={() => acknowledgeNotification(notif.id)}
                    >
                      👍 Acknowledge
                    </button>
                  )}
                  {isAcknowledged && notif.senderId !== user?.uid && (
                    <span className="ack-status">✓ Acknowledged</span>
                  )}
                  {notif.senderId === user?.uid && notif.groupId ? (
                    <AnnouncementStats groupId={notif.groupId} senderId={user?.uid} />
                  ) : null}
                  {isAdmin && (
                    <button 
                      className="del-btn"
                      onClick={() => {
                        if(window.confirm('Delete this announcement?')) {
                          if (notif.groupId) {
                            deleteAnnouncementGroup(notif.groupId);
                          } else {
                            deleteNotification(notif.id);
                          }
                        }
                      }}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AnnouncementsPage;
