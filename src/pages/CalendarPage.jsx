import React, { useState, useMemo } from 'react';
import { useCalendar } from '../context/CalendarContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import './CalendarPage.css';

const CalendarPage = () => {
  const { user } = useAuth();
  const { events, loading, addEvent, deleteEvent } = useCalendar();
  const { sendNotification } = useNotifications();
  
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [viewEventModal, setViewEventModal] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  
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
    if (!isAdmin) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setTitle('');
    setType('activity');
    setDescription('');
    setPostAnnouncement(false);
    setShowModal(true);
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!title.trim() || !selectedDate) return;

    await addEvent({
      title: title.trim(),
      date: selectedDate,
      type,
      description: description.trim(),
      createdBy: user.uid
    });
    
    if (postAnnouncement) {
      await sendNotification({
        title: `New School Event: ${title.trim()}`,
        message: `A new **${type}** event has been scheduled for **${selectedDate}**.\n\n${description.trim() ? `**Description:** ${description.trim()}` : ''}`,
        recipientId: 'all',
        type: 'info'
      });
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
        <div>
          <h1>School Calendar</h1>
          <p>Track holidays, exams, and school activities.</p>
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
                className={`calendar-cell ${isAdmin ? 'clickable' : ''} ${isToday ? 'is-today' : ''}`}
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
                      <span className="event-title">{evt.title}</span>
                      {isAdmin && (
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
              <h2>Add Event for {selectedDate}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddEvent}>
              <div className="form-group">
                <label>Event Title</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Independence Day" />
              </div>
              <div className="form-group">
                <label>Event Type</label>
                <select value={type} onChange={e => setType(e.target.value)}>
                  <option value="activity">Activity / Event</option>
                  <option value="holiday">Holiday / Classes Suspended</option>
                  <option value="exam">Exam Week</option>
                </select>
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
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                <input 
                  type="checkbox" 
                  id="postAnnouncement" 
                  checked={postAnnouncement} 
                  onChange={e => setPostAnnouncement(e.target.checked)} 
                  style={{ width: 'auto', margin: 0 }}
                />
                <label htmlFor="postAnnouncement" style={{ margin: 0, fontWeight: 'normal', cursor: 'pointer' }}>
                  Also post this as a School Announcement
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Event</button>
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
              <h3 style={{ fontSize: '1.25rem', color: 'var(--color-heading)', marginBottom: '0.5rem' }}>{viewEventModal.title}</h3>
              <p style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', color: 'white', backgroundColor: viewEventModal.type === 'holiday' ? 'var(--color-danger)' : viewEventModal.type === 'exam' ? 'var(--color-info)' : 'var(--color-success)', marginBottom: '1rem' }}>
                {viewEventModal.type.toUpperCase()}
              </p>
              <p style={{ color: 'var(--gray-600)', marginBottom: '0.5rem' }}><strong>Date:</strong> {viewEventModal.date}</p>
              {viewEventModal.description && (
                <p style={{ color: 'var(--gray-700)', marginTop: '1rem', whiteSpace: 'pre-wrap' }}>{viewEventModal.description}</p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="secondary-btn" onClick={() => setViewEventModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
