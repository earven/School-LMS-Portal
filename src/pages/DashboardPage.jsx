import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { useSettings } from '../context/SettingsContext';
import { useStudents } from '../context/StudentContext';
import { usePersonnel } from '../context/PersonnelContext';
import { useAuth } from '../context/AuthContext';
import { useSections } from '../context/SectionContext';
import { useNotifications } from '../context/NotificationContext';
import { useCalendar } from '../context/CalendarContext';
import AnnouncementStats from '../components/AnnouncementStats';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);
  const { settings } = useSettings();
  const { students } = useStudents();
  const { sections } = useSections();
  const { personnel } = usePersonnel();
  const [activeTab, setActiveTab] = useState('about');
  const navigate = useNavigate();
  const { notifications, sendNotification, acknowledgeNotification, markAsRead, setSelectedNotification, deleteAnnouncementGroup, deleteNotification } = useNotifications();
  const { addEvent } = useCalendar();

  const displayNotifications = useMemo(() => {
    return notifications.filter(notif => 
      !notif.acknowledged || (isAdmin && notif.senderId === user?.uid)
    );
  }, [notifications, isAdmin, user]);

  const [messageForm, setMessageForm] = useState({
    recipientId: isAdmin ? 'all_teachers' : 'all_admins',
    title: '',
    message: '',
    type: 'info',
    link: '',
    createEvent: false,
    eventDate: '',
    eventType: 'activity'
  });
  const [isSending, setIsSending] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);

  // ONE-TIME CLEANUP SCRIPT: Delete old test announcements that lack a groupId
  useEffect(() => {
    if (isAdmin) {
      const cleanOrphans = async () => {
        try {
          const snap = await getDocs(collection(db, 'notifications'));
          let deleted = 0;
          const deletePromises = [];
          snap.docs.forEach(d => {
            if (!d.data().groupId) {
              deletePromises.push(deleteDoc(d.ref));
              deleted++;
            }
          });
          await Promise.all(deletePromises);
          if (deleted > 0) {
            console.log(`Cleaned up ${deleted} orphaned test announcements.`);
          }
        } catch (e) {
          console.error("Cleanup error:", e);
        }
      };
      cleanOrphans();
    }
  }, [isAdmin]);

  const displayedStudentCount = useMemo(() => {
    if (isAdmin) return students.length;
    const assignedSectionIds = sections
      .filter(s => s.adviserId === user?.uid)
      .map(s => s.id);
    return students.filter(s => assignedSectionIds.includes(s.sectionId)).length;
  }, [students, sections, user, isAdmin]);

  const displayedSectionCount = useMemo(() => {
    if (isAdmin) return sections.length;
    return sections.filter(s => s.adviserId === user?.uid).length;
  }, [sections, user, isAdmin]);

  const stats = [
    { 
      label: isAdmin ? 'Total Enrolled Students' : 'My Enrolled Students', 
      value: displayedStudentCount, 
      color: '#4e73df', 
      icon: '👨‍🎓',
      link: '/students'
    },
    { 
      label: isAdmin ? 'Active Personnel' : 'Active Teachers', 
      value: personnel.length, 
      color: '#1cc88a', 
      icon: '👩‍🏫',
      link: '/personnel'
    },
    { 
      label: 'Modules Active', 
      value: Object.values(settings.enabledModules || {}).filter(v => v).length, 
      color: '#f6c23e', 
      icon: '⚙️',
      link: isAdmin ? '/settings' : '/teacher-tools'
    },
    { 
      label: isAdmin ? 'Total Sections' : 'My Sections', 
      value: displayedSectionCount, 
      color: '#e74a3b', 
      icon: '🏫',
      link: '/sections'
    }
  ];

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageForm.title || !messageForm.message) {
      alert('Please provide a title and a message.');
      return;
    }
    setIsSending(true);
    try {
      await sendNotification({
        title: messageForm.title,
        message: messageForm.message,
        recipientId: messageForm.recipientId,
        type: messageForm.type,
        link: messageForm.link
      });
      if (messageForm.createEvent && messageForm.eventDate) {
        await addEvent({
          title: messageForm.title,
          date: messageForm.eventDate,
          type: messageForm.eventType,
          description: messageForm.message.substring(0, 500),
          createdBy: user.uid
        });
      }

      alert('Message sent successfully!');
      setMessageForm({
        ...messageForm,
        title: '',
        message: '',
        type: 'info',
        link: '',
        createEvent: false,
        eventDate: '',
        eventType: 'activity'
      });
      setIsComposeModalOpen(false);
    } catch (err) {
      alert('Failed to send message.');
    }
    setIsSending(false);
  };

  const formatNotifTime = (timestamp) => {
    if (!timestamp) return '';
    let date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-top-row">
        <section className="hero-section">
          {settings.heroBackground && (
            <img src={settings.heroBackground} alt="Dashboard Background" className="hero-background-img" />
          )}
          <div className="hero-content">
            <h1 className="hero-title">Welcome to {settings.schoolName}</h1>
            <p className="hero-motto">{settings.motto}</p>
            <div className="hero-badge">Productivity Portal</div>
          </div>
        </section>

        <div className="dashboard-right-col" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', minWidth: 0 }}>
          <div className="dashboard-announcements-section" style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
            <div className="announcements-container" style={{ height: '100%' }}>
              <div className="feed-section card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="feed-header-row">
                  <h2>Recent Announcements</h2>
                {isAdmin && (
                  <button className="post-announcement-btn" onClick={() => setIsComposeModalOpen(true)}>
                    + Post Announcement
                  </button>
                )}
              </div>
              <div className="feed-list-full scrollable-feed">
                {displayNotifications.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📫</div>
                    <p>No announcements or messages at this time.</p>
                  </div>
                ) : (
                  displayNotifications.slice(0, 1).map(notif => (
                    <div 
                      key={notif.id} 
                      className={`feed-item-full ${!notif.read ? 'unread' : ''} type-${notif.type || 'info'}`}
                      onClick={() => {
                        if (!notif.read) markAsRead(notif.id);
                        setSelectedNotification(notif);
                      }}
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
                        {!notif.acknowledged && notif.senderId !== user?.uid && (
                          <button 
                            className="ack-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              acknowledgeNotification(notif.id);
                            }}
                          >
                            👍 Acknowledge
                          </button>
                        )}
                        {notif.senderId === user?.uid && notif.groupId ? (
                          <AnnouncementStats groupId={notif.groupId} senderId={user?.uid} />
                        ) : null}
                        {isAdmin && (
                          <button 
                            className="del-btn"
                            onClick={(e) => {
                              e.stopPropagation();
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
                  ))
                )}
                <div className="feed-footer-actions" style={{ textAlign: 'center', marginTop: '1rem' }}>
                  {displayNotifications.length > 1 && (
                    <div className="more-announcements-hint" style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      +{displayNotifications.length - 1} more unseen announcement(s). Acknowledge this one to see the next.
                    </div>
                  )}
                  <button 
                    onClick={() => navigate('/announcements')}
                    className="view-all-btn"
                    style={{ background: 'none', border: 'none', color: 'var(--primary-blue)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    View All Announcements History
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

          <div className="dashboard-overview-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0, minWidth: 0 }}>
            <div className="stats-grid" style={{ marginBottom: 0 }}>
              {stats.map((stat, idx) => (
                <div 
                  key={idx} 
                  className="stat-card-mini" 
                  style={{ '--accent': stat.color }}
                  onClick={() => {
                    if (stat.link) {
                      navigate(stat.link);
                    } else if (stat.action) {
                      stat.action();
                    }
                  }}
                  title={stat.link ? `Click to view ${stat.label}` : undefined}
                >
                  <div className="stat-icon">{stat.icon}</div>
                  <div className="stat-info">
                    <span className="stat-value">{stat.value}</span>
                    <span className="stat-label">{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Compose Announcement Modal */}
      {isComposeModalOpen && isAdmin && createPortal(
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal-content">
            <div className="dashboard-modal-header">
              <h2>Post an Announcement</h2>
              <button className="dashboard-close-btn" onClick={() => setIsComposeModalOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <form className="message-form" onSubmit={handleSendMessage}>
              <div className="form-group">
                <label>To:</label>
                <select 
                  value={messageForm.recipientId}
                  onChange={(e) => setMessageForm({...messageForm, recipientId: e.target.value})}
                >
                  <option value="all_teachers">All Teachers</option>
                  <option value="all_admins">All Admins</option>
                  <option value="all">Everyone</option>
                  <optgroup label="Specific Teacher">
                    {personnel.filter(p => p.role === 'teacher').map(p => (
                      <option key={p.uid} value={p.uid}>{p.fullName || p.username}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div className="form-group-row" style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Subject / Title:</label>
                  <input 
                    type="text" 
                    placeholder="Enter the announcement title" 
                    value={messageForm.title}
                    onChange={(e) => setMessageForm({...messageForm, title: e.target.value})}
                    maxLength={100}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Type:</label>
                  <select 
                    value={messageForm.type}
                    onChange={(e) => setMessageForm({...messageForm, type: e.target.value})}
                  >
                    <option value="info">Information</option>
                    <option value="urgent">Urgent</option>
                    <option value="event">Event</option>
                    <option value="success">Success / Shoutout</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Message (Markdown Supported):</label>
                <textarea 
                  placeholder="Write your announcement details here... You can use **bold**, *italic*, etc."
                  value={messageForm.message}
                  onChange={(e) => setMessageForm({...messageForm, message: e.target.value})}
                  maxLength={2000}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>External Link (Optional):</label>
                <input 
                  type="url" 
                  placeholder="https://example.com" 
                  value={messageForm.link}
                  onChange={(e) => setMessageForm({...messageForm, link: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <input 
                  type="checkbox" 
                  id="createEventCheck" 
                  checked={messageForm.createEvent} 
                  onChange={e => setMessageForm({...messageForm, createEvent: e.target.checked})} 
                  style={{ width: '14px', height: '14px', margin: 0, cursor: 'pointer' }}
                />
                <label htmlFor="createEventCheck" style={{ margin: 0, fontWeight: 'bold', cursor: 'pointer', color: '#1f2937', flex: 1, fontSize: '0.85rem' }}>
                  Also add this to the School Calendar
                </label>
              </div>

              {messageForm.createEvent && (
                <div className="form-group-row" style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>Calendar Event Date:</label>
                    <input 
                      type="date" 
                      required={messageForm.createEvent}
                      value={messageForm.eventDate}
                      onChange={(e) => setMessageForm({...messageForm, eventDate: e.target.value})}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>Calendar Event Type:</label>
                    <select 
                      value={messageForm.eventType}
                      onChange={(e) => setMessageForm({...messageForm, eventType: e.target.value})}
                    >
                      <option value="activity">Activity / Event</option>
                      <option value="holiday">Holiday / Classes Suspended</option>
                      <option value="exam">Exam Week</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="dashboard-modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsComposeModalOpen(false)}>Cancel</button>
                <button type="submit" className="send-btn" disabled={isSending}>
                  {isSending ? 'Sending...' : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default DashboardPage;
