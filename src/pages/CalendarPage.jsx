import React, { useState } from 'react';
import { useCalendar } from '../context/CalendarContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import './CalendarPage.css';

const CalendarPage = () => {
  const { user } = useAuth();
  const { events, loading, addEvent, updateEvent, deleteEvent } = useCalendar();
  const { sendNotification } = useNotifications();
  
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [viewEventModal, setViewEventModal] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  
  // Event Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState('activity');
  const [description, setDescription] = useState('');
  const [postAnnouncement, setPostAnnouncement] = useState(false);

  // Calendar Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const handleDayClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setTitle('');
    setType(isAdmin ? 'activity' : 'appointment');
    setDescription('');
    setPostAnnouncement(false);
    setEditingEventId(null);
    setShowModal(true);
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!title.trim() || !selectedDate) return;

    const isPrivateEvent = !isAdmin || type === 'appointment' || type === 'reminder';

    const eventData = {
      title: title.trim(),
      date: selectedDate,
      type,
      description: description.trim(),
      createdBy: user.uid,
      isPrivate: isPrivateEvent
    };

    if (editingEventId) {
      await updateEvent(editingEventId, eventData);
    } else {
      await addEvent(eventData);
      
      if (postAnnouncement && !isPrivateEvent) {
        await sendNotification({
          title: `New School Event: ${title.trim()}`,
          message: `A new **${type}** event has been scheduled for **${selectedDate}**.\n\n${description.trim() ? `**Description:** ${description.trim()}` : ''}`,
          recipientId: 'all',
          type: 'info'
        });
      }
    }
    
    setShowModal(false);
  };

  const handleDeleteEvent = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Delete this event?")) {
      await deleteEvent(id);
    }
  };

  // Build grid cells
  const blanks = Array(firstDayOfMonth).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="calendar-page">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1>School Calendar</h1>
            <p>Track holidays, exams, and school activities.</p>
          </div>
          {user && (
            <button 
              type="button" 
              className="primary-btn"
              onClick={() => {
                const todayStr = new Date().toISOString().split('T')[0];
                setSelectedDate(todayStr);
                setTitle('');
                setType(isAdmin ? 'activity' : 'appointment');
                setDescription('');
                setPostAnnouncement(false);
                setEditingEventId(null);
                setShowModal(true);
              }}
            >
              + Add Event
            </button>
          )}
        </div>
      </div>

      <div className="calendar-card card">
        {loading && <div className="loading-spinner"></div>}
        
        <div className="calendar-toolbar">
          <button className="secondary-btn" onClick={prevMonth}>&lt; Prev</button>
          <h2>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="secondary-btn" onClick={goToday}>Today</button>
            <button className="secondary-btn" onClick={nextMonth}>Next &gt;</button>
          </div>
        </div>

        <div className="calendar-legend">
          <span className="legend-item"><span className="dot dot-holiday"></span> Holiday / Suspended</span>
          <span className="legend-item"><span className="dot dot-exam"></span> Exam Week</span>
          <span className="legend-item"><span className="dot dot-activity"></span> Activity / Event</span>
          <span className="legend-item"><span className="dot dot-appointment"></span> Private Appointment</span>
          <span className="legend-item"><span className="dot dot-reminder"></span> Personal Reminder</span>
        </div>

        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="calendar-day-header">{d}</div>
          ))}
          
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="calendar-cell blank"></div>
          ))}

          {days.map(day => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            return (
              <div 
                key={day} 
                className={`calendar-cell clickable ${isToday ? 'is-today' : ''}`}
                onClick={() => handleDayClick(day)}
              >
                <div className="cell-date">{day}</div>
                <div className="cell-events">
                  {dayEvents.map(evt => (
                    <div 
                      key={evt.id} 
                      className={`calendar-event type-${evt.type}`} 
                      title={evt.description}
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewEventModal(evt);
                      }}
                    >
                      <span className="event-title">{evt.isPrivate ? `🔒 ${evt.title}` : evt.title}</span>
                      {(isAdmin || evt.createdBy === user?.uid) && (
                        <button className="del-evt-btn" onClick={(e) => handleDeleteEvent(e, evt.id)}>&times;</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingEventId ? 'Edit Event' : `Add Event for ${selectedDate}`}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddEvent}>
              <div className="form-group">
                <label>Event Date</label>
                <input 
                  required 
                  type="date" 
                  value={selectedDate || ''} 
                  onChange={e => setSelectedDate(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Event Title</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Independence Day" />
              </div>
              <div className="form-group">
                <label>Event Type</label>
                {isAdmin ? (
                  <select value={type} onChange={e => setType(e.target.value)}>
                    <option value="activity">Activity / Event</option>
                    <option value="holiday">Holiday / Classes Suspended</option>
                    <option value="exam">Exam Week</option>
                    <option value="appointment">Private Appointment</option>
                    <option value="reminder">Personal Reminder</option>
                  </select>
                ) : (
                  <select value={type} onChange={e => setType(e.target.value)}>
                    <option value="appointment">Private Appointment</option>
                    <option value="reminder">Personal Reminder</option>
                  </select>
                )}
                {type === 'holiday' && (
                  <p className="help-text" style={{ color: 'var(--color-danger)', marginTop: '0.25rem', fontSize: '0.85rem' }}>
                    ⚠️ Note: Holidays will automatically be suspended in the Teachers' Attendance Trackers!
                  </p>
                )}
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows="3"></textarea>
              </div>
              {!editingEventId && isAdmin && (
                <div className="checkbox-group-inline">
                  <input 
                    type="checkbox" 
                    id="postAnnouncement" 
                    checked={postAnnouncement} 
                    onChange={e => setPostAnnouncement(e.target.checked)} 
                  />
                  <label htmlFor="postAnnouncement">
                    Also post this as a School Announcement
                  </label>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">{editingEventId ? 'Save Changes' : 'Save Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewEventModal && (
        <div className="modal-overlay" onClick={() => setViewEventModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Event Details</h2>
              <button className="close-btn" onClick={() => setViewEventModal(null)}>&times;</button>
            </div>
            <div style={{ padding: '1rem 0' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--color-heading)', marginBottom: '0.5rem' }}>
                {viewEventModal.isPrivate ? '🔒 ' : ''}{viewEventModal.title}
              </h3>
              <p style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', color: 'white', backgroundColor: viewEventModal.type === 'holiday' ? 'var(--color-danger)' : viewEventModal.type === 'exam' ? 'var(--color-info)' : viewEventModal.type === 'appointment' ? '#8b5cf6' : viewEventModal.type === 'reminder' ? '#ec4899' : 'var(--color-success)', marginBottom: '1rem' }}>
                {viewEventModal.type.toUpperCase()}
              </p>
              <p style={{ color: 'var(--gray-600)', marginBottom: '0.5rem' }}><strong>Date:</strong> {viewEventModal.date}</p>
              {viewEventModal.description && (
                <p style={{ color: 'var(--gray-700)', marginTop: '1rem', whiteSpace: 'pre-wrap' }}>{viewEventModal.description}</p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              {(isAdmin || viewEventModal.createdBy === user?.uid) && (
                <button 
                  className="primary-btn" 
                  onClick={() => {
                    setEditingEventId(viewEventModal.id);
                    setSelectedDate(viewEventModal.date);
                    setTitle(viewEventModal.title);
                    setType(viewEventModal.type);
                    setDescription(viewEventModal.description || '');
                    setPostAnnouncement(false);
                    setViewEventModal(null);
                    setShowModal(true);
                  }}
                >
                  Edit Event
                </button>
              )}
              <button className="secondary-btn" onClick={() => setViewEventModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
