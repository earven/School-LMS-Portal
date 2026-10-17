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
  const { settings, sessionAcademicYear } = useSettings();
  const { students, loading: studentsLoading } = useStudents();
  const { sections, loading: sectionsLoading } = useSections();
  const { personnel, loading: personnelLoading } = usePersonnel();
  const isDataLoading = Boolean(studentsLoading || sectionsLoading || personnelLoading);
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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const stats = [
    { 
      label: isAdmin ? 'Total Students' : 'My Students', 
      value: displayedStudentCount, 
      color: '#2563eb', 
      badge: 'Enrolled',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
        </svg>
      ),
      link: '/students'
    },
    { 
      label: isAdmin ? 'Active Personnel' : 'Active Teachers', 
      value: personnel.length, 
      color: '#10b981', 
      badge: 'Faculty & Staff',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      link: '/personnel'
    },
    { 
      label: 'Active Modules', 
      value: Object.values(settings.enabledModules || {}).filter(v => v).length, 
      color: '#f59e0b', 
      badge: 'System Ready',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        </svg>
      ),
      link: isAdmin ? '/settings' : '/teacher-tools'
    },
    { 
      label: isAdmin ? 'Total Sections' : 'My Sections', 
      value: displayedSectionCount, 
      color: '#8b5cf6', 
      badge: 'Classrooms',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      ),
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
      const notifResult = await sendNotification({
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
          createdBy: user.uid,
          isPrivate: false,
          announcementGroupId: notifResult?.groupId || null
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
    } catch {
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

  const getBadgeClassForType = (type) => {
    switch (type) {
      case 'urgent': return 'badge-danger';
      case 'event': return 'badge-purple';
      case 'success': return 'badge-success';
      default: return 'badge-info';
    }
  };

  return (
    <div className="dashboard-wrapper">
      <section className="dashboard-welcome-banner">
        {settings.heroBackground && (
          <img src={settings.heroBackground} alt="Hero Background" className="hero-bg-cover" />
        )}
        <div className="welcome-banner-content">
          <div className="welcome-header-meta">
            <span className="badge badge-neutral welcome-date-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="badge badge-primary welcome-sy-pill">
              SY {sessionAcademicYear || settings.academicYear}
            </span>
          </div>

          <h1 className="welcome-title">
            {greeting}, {user?.fullName || user?.username || 'Educator'}! 👋
          </h1>
          <p className="welcome-subtitle">
            {settings.motto || `Welcome to ${settings.schoolName || 'the School LMS Portal'}. Here's your daily summary and updates.`}
          </p>

          <div className="welcome-quick-actions">
            {settings.enabledModules?.studentManagement !== false && (
              <button 
                className="quick-action-pill" 
                onClick={() => navigate('/students')}
                title="Manage Students"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
                </svg>
                <span>Students</span>
              </button>
            )}

            {settings.enabledModules?.teacherTools !== false && (
              <button 
                className="quick-action-pill" 
                onClick={() => navigate('/teacher-tools/attendance')}
                title="Class Attendance"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                <span>Take Attendance</span>
              </button>
            )}

            {isAdmin && (
              <button 
                className="quick-action-pill highlight" 
                onClick={() => setIsComposeModalOpen(true)}
                title="Post Announcement"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span>+ Post Announcement</span>
              </button>
            )}

            <button 
              className="quick-action-pill" 
              onClick={() => navigate('/messages')}
              title="Messaging Hub"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span>Messages</span>
            </button>
          </div>
        </div>
      </section>

      <section className="stats-cards-row">
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            className="stat-card-modern surface-card surface-card-hover" 
            style={{ '--accent-color': stat.color }}
            onClick={() => stat.link && navigate(stat.link)}
            title={`Click to view ${stat.label}`}
          >
            <div className="stat-card-header">
              <div className="stat-icon-wrapper" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                {stat.icon}
              </div>
              <span className="stat-badge">{stat.badge}</span>
            </div>
            <div className="stat-card-body">
              <span className="stat-card-value">
                {isDataLoading ? (
                  <span className="skeleton" style={{ display: 'inline-block', width: '42px', height: '28px', borderRadius: '4px' }} />
                ) : (
                  stat.value
                )}
              </span>
              <span className="stat-card-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </section>

      <div className="dashboard-content-grid">
        <section className="announcements-card surface-card">
          <div className="section-card-header">
            <div className="section-title-group">
              <div className="section-icon-pill">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <h2>Recent Announcements</h2>
            </div>
            {isAdmin && (
              <button className="primary-btn btn-sm" onClick={() => setIsComposeModalOpen(true)}>
                + New Post
              </button>
            )}
          </div>

          <div className="announcements-feed-container">
            {displayNotifications.length === 0 ? (
              <div className="empty-announcements-state">
                <div className="empty-state-svg">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/>
                  </svg>
                </div>
                <h3>No Announcements</h3>
                <p>You are all caught up! No unread announcements or updates at this time.</p>
              </div>
            ) : (
              displayNotifications.slice(0, 3).map(notif => (
                <article 
                  key={notif.id} 
                  className={`feed-article ${!notif.read ? 'unread' : ''}`}
                  onClick={() => {
                    if (!notif.read) markAsRead(notif.id);
                    setSelectedNotification(notif);
                  }}
                >
                  <div className="article-header">
                    <div className="author-meta">
                      <div className="author-avatar">
                        {(notif.senderName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="author-text">
                        <span className="author-name">{notif.senderName}</span>
                        <span className="article-time">{formatNotifTime(notif.createdAt)}</span>
                      </div>
                    </div>
                    {notif.type && (
                      <span className={`badge ${getBadgeClassForType(notif.type)}`}>
                        {notif.type.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <h3 className="article-title">{notif.title}</h3>
                  
                  <div className="article-content markdown-content">
                    <ReactMarkdown>{notif.message}</ReactMarkdown>
                  </div>

                  {notif.link && (
                    <div className="article-link-box">
                      <a 
                        href={notif.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="article-external-link" 
                        onClick={e => e.stopPropagation()}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/>
                          <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                        <span>Open Attached Link</span>
                      </a>
                    </div>
                  )}

                  <div className="article-footer-actions">
                    {!notif.acknowledged && notif.senderId !== user?.uid && (
                      <button 
                        className="ack-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          acknowledgeNotification(notif.id);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Acknowledge
                      </button>
                    )}

                    {notif.senderId === user?.uid && notif.groupId && (
                      <AnnouncementStats groupId={notif.groupId} senderId={user?.uid} />
                    )}

                    {isAdmin && (
                      <button 
                        className="del-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this announcement?')) {
                            if (notif.groupId) {
                              deleteAnnouncementGroup(notif.groupId);
                            } else {
                              deleteNotification(notif.id);
                            }
                          }
                        }}
                        title="Delete announcement"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}

            <div className="announcements-footer-bar">
              <button 
                onClick={() => navigate('/announcements')}
                className="view-history-btn"
              >
                <span>View Full Announcements History</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          </div>
        </section>

        <section className="portal-overview-card surface-card">
          <div className="section-card-header">
            <div className="section-title-group">
              <div className="section-icon-pill" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <h2>Portal Modules & Tools</h2>
            </div>
          </div>

          <div className="modules-quick-list">
            <div className="module-item-row" onClick={() => navigate('/students')}>
              <div className="module-icon-box" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
                </svg>
              </div>
              <div className="module-text-info">
                <h4>Learner Information</h4>
                <p>Enrollment, SF2 Attendance, Records</p>
              </div>
              <svg className="row-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>

            <div className="module-item-row" onClick={() => navigate('/teacher-tools')}>
              <div className="module-icon-box" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
              </div>
              <div className="module-text-info">
                <h4>Teacher Tools Hub</h4>
                <p>Grading, Inventory, Schedules, Memos</p>
              </div>
              <svg className="row-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>

            <div className="module-item-row" onClick={() => navigate('/calendar')}>
              <div className="module-icon-box" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div className="module-text-info">
                <h4>School Calendar</h4>
                <p>Events, Holidays, Academic Milestones</p>
              </div>
              <svg className="row-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>

            <div className="module-item-row" onClick={() => navigate('/messages')}>
              <div className="module-icon-box" style={{ backgroundColor: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div className="module-text-info">
                <h4>Faculty & Admin Chat</h4>
                <p>Real-time Direct & Group Messaging</p>
              </div>
              <svg className="row-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        </section>
      </div>

      {isComposeModalOpen && isAdmin && createPortal(
        <div className="dashboard-modal-overlay">
          <div className="dashboard-modal-content">
            <div className="dashboard-modal-header">
              <h2>Post an Announcement</h2>
              <button className="dashboard-close-btn" onClick={() => setIsComposeModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form className="message-form" onSubmit={handleSendMessage}>
              <div className="form-group">
                <label>Recipient:</label>
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
              <div className="form-group-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Subject / Title:</label>
                  <input 
                    type="text" 
                    placeholder="Enter announcement title" 
                    value={messageForm.title}
                    onChange={(e) => setMessageForm({...messageForm, title: e.target.value})}
                    maxLength={100}
                    required
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
                  placeholder="Write your announcement details here... Markdown like **bold**, *italic*, lists are supported."
                  value={messageForm.message}
                  onChange={(e) => setMessageForm({...messageForm, message: e.target.value})}
                  maxLength={2000}
                  rows={4}
                  required
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

              <div className="calendar-sync-box">
                <input 
                  type="checkbox" 
                  id="createEventCheck" 
                  checked={messageForm.createEvent} 
                  onChange={e => setMessageForm({...messageForm, createEvent: e.target.checked})} 
                />
                <label htmlFor="createEventCheck">
                  Also schedule this on the School Calendar
                </label>
              </div>

              {messageForm.createEvent && (
                <div className="form-group-row calendar-sync-fields">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Event Date:</label>
                    <input 
                      type="date" 
                      required={messageForm.createEvent}
                      value={messageForm.eventDate}
                      onChange={(e) => setMessageForm({...messageForm, eventDate: e.target.value})}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Event Type:</label>
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
                <button type="button" className="secondary-btn" onClick={() => setIsComposeModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={isSending}>
                  {isSending ? 'Posting...' : 'Post Announcement'}
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
