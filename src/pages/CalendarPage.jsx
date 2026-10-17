import React, { useState, useMemo } from 'react';
import { useCalendar } from '../context/CalendarContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useNotifications } from '../context/NotificationContext';
import { isDateInEventRange, exportEventsToICS } from '../utils/calendarUtils';
import EmptyState from '../components/EmptyState';
import './CalendarPage.css';

const CalendarPage = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { events, loading, addEvent, updateEvent, deleteEvent } = useCalendar();
  const { sendNotification } = useNotifications();
  
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);
  
  // View Modes: 'month' | 'agenda'
  const [viewMode, setViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [showModal, setShowModal] = useState(false);
  const [viewEventModal, setViewEventModal] = useState(null);
  const [showDayEventsModal, setShowDayEventsModal] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [editingEventId, setEditingEventId] = useState(null);
  
  // Event Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState('activity');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
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

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'holiday' && evt.type !== 'holiday') return false;
        if (selectedCategory === 'exam' && evt.type !== 'exam') return false;
        if (selectedCategory === 'activity' && evt.type !== 'activity') return false;
        if (selectedCategory === 'appointment' && evt.type !== 'appointment') return false;
        if (selectedCategory === 'reminder' && evt.type !== 'reminder') return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (evt.title || '').toLowerCase().includes(q);
        const descMatch = (evt.description || '').toLowerCase().includes(q);
        const locMatch = (evt.location || '').toLowerCase().includes(q);
        return titleMatch || descMatch || locMatch;
      }
      return true;
    });
  }, [events, selectedCategory, searchQuery]);

  // Compute school days in current viewed month (excluding weekends and holidays)
  const monthlySchoolDaysCount = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const totalDays = new Date(y, m + 1, 0).getDate();
    let count = 0;
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(y, m, day);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip Saturday & Sunday

      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isHoliday = events.some(e => e.type === 'holiday' && isDateInEventRange(dateStr, e));
      if (!isHoliday) {
        count++;
      }
    }
    return count;
  }, [currentDate, events]);

  const handleDayClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setShowDayEventsModal(true);
  };

  const openAddEventModal = (initialDate = null) => {
    const defaultDate = initialDate || new Date().toISOString().split('T')[0];
    setSelectedDate(defaultDate);
    setStartDate(defaultDate);
    setEndDate(defaultDate);
    setIsMultiDay(false);
    setTitle('');
    setType(isAdmin ? 'activity' : 'appointment');
    setStartTime('');
    setEndTime('');
    setLocation('');
    setDescription('');
    setPostAnnouncement(false);
    setEditingEventId(null);
    setShowModal(true);
  };

  const openEditEventModal = (evt) => {
    setEditingEventId(evt.id);
    const start = evt.startDate || evt.date;
    const end = evt.endDate || start;
    setStartDate(start);
    setEndDate(end);
    setIsMultiDay(start !== end);
    setSelectedDate(start);
    setTitle(evt.title);
    setType(evt.type);
    setStartTime(evt.startTime || '');
    setEndTime(evt.endTime || '');
    setLocation(evt.location || '');
    setDescription(evt.description || '');
    setPostAnnouncement(false);
    setViewEventModal(null);
    setShowDayEventsModal(false);
    setShowModal(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!title.trim() || !startDate) return;

    const finalEndDate = isMultiDay && endDate ? endDate : startDate;
    const isPrivateEvent = !isAdmin || type === 'appointment' || type === 'reminder';

    const eventData = {
      title: title.trim(),
      startDate: startDate,
      endDate: finalEndDate,
      date: startDate,
      startTime: startTime || null,
      endTime: endTime || null,
      location: location.trim() || null,
      type,
      description: description.trim(),
      createdBy: user.uid,
      isPrivate: isPrivateEvent
    };

    if (editingEventId) {
      await updateEvent(editingEventId, eventData);
    } else {
      let annGroupId = null;
      if (postAnnouncement && !isPrivateEvent) {
        const dateDisplay = startDate === finalEndDate ? startDate : `${startDate} to ${finalEndDate}`;
        const notifResult = await sendNotification({
          title: `New School Event: ${title.trim()}`,
          message: `A new **${type}** event has been scheduled for **${dateDisplay}**.\n\n${location.trim() ? `**Venue:** ${location.trim()}\n` : ''}${description.trim() ? `**Details:** ${description.trim()}` : ''}`,
          recipientId: 'all',
          type: 'info'
        });
        annGroupId = notifResult?.groupId || null;
      }
      await addEvent({
        ...eventData,
        announcementGroupId: annGroupId
      });
    }
    
    setShowModal(false);
  };

  const handleDeleteEvent = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this event?")) {
      await deleteEvent(id);
    }
  };

  const handleExportICS = () => {
    const schoolName = settings?.schoolName || 'School LMS Portal';
    const success = exportEventsToICS(events, schoolName);
    if (!success) {
      alert('No events available to export.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper for Relative Countdown
  const getRelativeDateLabel = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { label: 'Today', class: 'countdown-today' };
    if (diffDays === 1) return { label: 'Tomorrow', class: 'countdown-tomorrow' };
    if (diffDays > 1 && diffDays <= 7) return { label: `In ${diffDays} days`, class: 'countdown-week' };
    if (diffDays > 7) return { label: `In ${Math.ceil(diffDays / 7)} weeks`, class: 'countdown-future' };
    return { label: 'Past', class: 'countdown-past' };
  };

  // Agenda list grouped by Month
  const agendaGroupedEvents = useMemo(() => {
    const groups = {};
    for (const evt of filteredEvents) {
      const start = evt.startDate || evt.date;
      if (!start) continue;
      const parts = start.split('-');
      if (parts.length < 2) continue;
      const groupKey = `${parts[0]}-${parts[1]}`; // YYYY-MM
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(evt);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEvents]);

  // Build grid cells
  const blanks = Array(firstDayOfMonth).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="calendar-page">
      {/* Header */}
      <div className="page-header no-print">
        <div className="calendar-header-main">
          <div>
            <h1>School Calendar of Activities</h1>
            <p>Encode and manage school milestones, periodic exams, activities, holidays, and meetings.</p>
          </div>

          <div className="calendar-header-actions">
            {/* View Mode Toggle */}
            <div className="view-mode-toggle">
              <button 
                type="button" 
                className={`btn-toggle-view ${viewMode === 'month' ? 'active' : ''}`}
                onClick={() => setViewMode('month')}
              >
                Month Grid
              </button>
              <button 
                type="button" 
                className={`btn-toggle-view ${viewMode === 'agenda' ? 'active' : ''}`}
                onClick={() => setViewMode('agenda')}
              >
                Agenda List
              </button>
            </div>

            {/* Action Buttons */}
            <button 
              type="button" 
              className="btn-cal-action btn-sync-ics"
              onClick={handleExportICS}
              title="Download iCal (.ics) file to sync with Google Calendar or mobile phone"
            >
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Sync / Export .ICS
            </button>

            <button 
              type="button" 
              className="btn-cal-action btn-print-cal"
              onClick={handlePrint}
              title="Print Monthly Bulletin Calendar"
            >
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print
            </button>

            {user && (
              <button 
                type="button" 
                className="primary-btn"
                onClick={() => openAddEventModal()}
              >
                + Add Event
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="calendar-filter-bar no-print">
        <div className="filter-chips">
          <button 
            type="button" 
            className={`chip ${selectedCategory === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('ALL')}
          >
            All Activities ({events.length})
          </button>
          <button 
            type="button" 
            className={`chip chip-activity ${selectedCategory === 'activity' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('activity')}
          >
            ⚡ School Activities
          </button>
          <button 
            type="button" 
            className={`chip chip-exam ${selectedCategory === 'exam' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('exam')}
          >
            📝 Exam Weeks
          </button>
          <button 
            type="button" 
            className={`chip chip-holiday ${selectedCategory === 'holiday' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('holiday')}
          >
            🇵🇭 Holidays & Breaks
          </button>
          <button 
            type="button" 
            className={`chip chip-appointment ${selectedCategory === 'appointment' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('appointment')}
          >
            🔒 Appointments
          </button>
          <button 
            type="button" 
            className={`chip chip-reminder ${selectedCategory === 'reminder' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('reminder')}
          >
            📌 Reminders
          </button>
        </div>

        <div className="calendar-search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search activities, exams, or venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>&times;</button>
          )}
        </div>
      </div>

      {/* Main Calendar Content Card */}
      <div className="calendar-card card">
        {loading && <div className="loading-spinner"></div>}
        
        {/* Month Toolbar */}
        <div className="calendar-toolbar">
          <button className="secondary-btn no-print" onClick={prevMonth}>&lt; Prev</button>
          <div className="toolbar-center">
            <h2>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
            <span className="school-days-badge" title="Computed total school days excluding weekends & declared holidays">
              📋 {monthlySchoolDaysCount} School Days
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }} className="no-print">
            <button className="secondary-btn" onClick={goToday}>Today</button>
            <button className="secondary-btn" onClick={nextMonth}>Next &gt;</button>
          </div>
        </div>

        {/* Legend */}
        <div className="calendar-legend">
          <span className="legend-item"><span className="dot dot-activity"></span> Activity / Event</span>
          <span className="legend-item"><span className="dot dot-exam"></span> Exam Week</span>
          <span className="legend-item"><span className="dot dot-holiday"></span> Holiday / Suspended</span>
          <span className="legend-item"><span className="dot dot-appointment"></span> Private Appointment</span>
          <span className="legend-item"><span className="dot dot-reminder"></span> Personal Reminder</span>
        </div>

        {/* MONTH GRID VIEW */}
        {viewMode === 'month' && (
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="calendar-day-header">{d}</div>
            ))}
            
            {blanks.map((_, i) => (
              <div key={`blank-${i}`} className="calendar-cell blank"></div>
            ))}

            {days.map(day => {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = filteredEvents.filter(e => isDateInEventRange(dateStr, e));
              
              // Sort dayEvents with highest priority to holidays & exams:
              // holiday (1) -> exam (2) -> activity (3) -> appointment (4) -> reminder (5)
              const sortedDayEvents = [...dayEvents].sort((a, b) => {
                const priority = { holiday: 1, exam: 2, activity: 3, appointment: 4, reminder: 5 };
                return (priority[a.type] || 99) - (priority[b.type] || 99);
              });

              const holidayEvent = dayEvents.find(e => e.type === 'holiday');
              const isHoliday = !!holidayEvent;
              const isToday = new Date().toISOString().split('T')[0] === dateStr;
              const isSelected = selectedDate === dateStr;

              return (
                <div 
                  key={day} 
                  className={`calendar-cell clickable ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''} ${isHoliday ? 'is-holiday-day' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="cell-header">
                    {isHoliday ? (
                      <span className="cell-holiday-tag" title={holidayEvent.title}>
                        🇵🇭 Holiday
                      </span>
                    ) : <span />}
                    <div className={`cell-date ${isHoliday ? 'holiday-date' : ''}`}>{day}</div>
                  </div>
                  <div className="cell-events">
                    {sortedDayEvents.slice(0, 3).map(evt => {
                      const isMulti = evt.startDate && evt.endDate && evt.startDate !== evt.endDate;
                      return (
                        <div 
                          key={`${evt.id}-${day}`} 
                          className={`calendar-event type-${evt.type} ${isMulti ? 'is-range-event' : ''}`} 
                          title={`${evt.title}${evt.location ? ` @ ${evt.location}` : ''}${evt.description ? ` - ${evt.description}` : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewEventModal(evt);
                          }}
                        >
                          <span className="event-title">
                            {evt.isPrivate ? `🔒 ` : ''}{evt.title}
                          </span>
                          {!evt.isExternal && (isAdmin || evt.createdBy === user?.uid) && (
                            <button className="del-evt-btn no-print" onClick={(e) => handleDeleteEvent(e, evt.id)}>&times;</button>
                          )}
                        </div>
                      );
                    })}
                    {sortedDayEvents.length > 3 && (
                      <div className="more-events-indicator">
                        + {sortedDayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* AGENDA / LIST VIEW */}
        {viewMode === 'agenda' && (
          <div className="agenda-view-container">
            {agendaGroupedEvents.length === 0 ? (
              <EmptyState
                icon="📅"
                title="No Events Found"
                description={
                  searchQuery || selectedCategory !== 'ALL'
                    ? "No scheduled activities match your category or search query."
                    : "No school activities or academic dates have been posted for this period."
                }
                actionLabel={
                  searchQuery || selectedCategory !== 'ALL'
                    ? "Clear Filters"
                    : isAdmin
                    ? "+ Schedule Event"
                    : undefined
                }
                onAction={
                  searchQuery || selectedCategory !== 'ALL'
                    ? () => {
                        setSearchQuery('');
                        setSelectedCategory('ALL');
                      }
                    : isAdmin
                    ? () => {
                        resetForm();
                        setShowModal(true);
                      }
                    : undefined
                }
              />
            ) : (
              agendaGroupedEvents.map(([monthKey, monthEvents]) => {
                const [mYear, mMonth] = monthKey.split('-');
                const monthDate = new Date(parseInt(mYear), parseInt(mMonth) - 1, 1);
                const monthLabel = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

                return (
                  <div key={monthKey} className="agenda-month-group">
                    <h3 className="agenda-month-title">{monthLabel}</h3>
                    <div className="agenda-cards-grid">
                      {monthEvents.map(evt => {
                        const start = evt.startDate || evt.date;
                        const end = evt.endDate || start;
                        const isMulti = start !== end;
                        const countdown = getRelativeDateLabel(start);

                        return (
                          <div 
                            key={evt.id} 
                            className={`agenda-card border-type-${evt.type}`}
                            onClick={() => setViewEventModal(evt)}
                          >
                            <div className="agenda-card-header">
                              <div className="agenda-badges">
                                <span className={`day-event-badge badge-type-${evt.type}`}>
                                  {evt.type.toUpperCase()}
                                </span>
                                <span className={`countdown-chip ${countdown.class}`}>
                                  {countdown.label}
                                </span>
                                {evt.isPrivate && <span className="private-badge">🔒 Private</span>}
                                {evt.isExternal && <span className="external-badge">National Holiday</span>}
                              </div>
                              <div className="agenda-card-date">
                                📅 {isMulti ? `${start} → ${end}` : start}
                              </div>
                            </div>

                            <h4 className="agenda-card-title">{evt.title}</h4>

                            {(evt.startTime || evt.location) && (
                              <div className="agenda-meta-row">
                                {evt.startTime && (
                                  <span className="agenda-meta-item">
                                    ⏱️ {evt.startTime}{evt.endTime ? ` - ${evt.endTime}` : ''}
                                  </span>
                                )}
                                {evt.location && (
                                  <span className="agenda-meta-item">
                                    📍 {evt.location}
                                  </span>
                                )}
                              </div>
                            )}

                            {evt.description && (
                              <p className="agenda-card-description">{evt.description}</p>
                            )}

                            <div className="agenda-card-actions no-print" onClick={(e) => e.stopPropagation()}>
                              {!evt.isExternal && (isAdmin || evt.createdBy === user?.uid) && (
                                <>
                                  <button 
                                    className="edit-day-evt-btn"
                                    onClick={() => openEditEventModal(evt)}
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    className="del-day-evt-btn" 
                                    onClick={(e) => handleDeleteEvent(e, evt.id)}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Day Events Popup Modal */}
      {showDayEventsModal && selectedDate && (
        <div className="modal-overlay" onClick={() => setShowDayEventsModal(false)}>
          <div className="modal-content day-events-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                Events for {(() => {
                  const parts = selectedDate.split('-');
                  if (parts.length === 3) {
                    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    return d.toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                  }
                  return selectedDate;
                })()}
              </h2>
              <button className="close-btn" onClick={() => setShowDayEventsModal(false)}>&times;</button>
            </div>

            <div className="modal-event-list">
              {events.filter(e => isDateInEventRange(selectedDate, e)).length === 0 ? (
                <p className="no-events-text">No events scheduled for this day.</p>
              ) : (
                events.filter(e => isDateInEventRange(selectedDate, e)).map(evt => (
                  <div 
                    key={evt.id} 
                    className={`modal-event-card border-type-${evt.type}`} 
                    onClick={() => setViewEventModal(evt)}
                  >
                    <div className="day-event-content">
                      <div className="day-event-meta">
                        <span className={`day-event-badge badge-type-${evt.type}`}>
                          {evt.type.toUpperCase()}
                        </span>
                        {evt.isPrivate && <span className="private-badge">🔒 Private</span>}
                        {evt.isExternal && <span className="external-badge">National Holiday</span>}
                        {evt.location && <span className="location-chip">📍 {evt.location}</span>}
                      </div>
                      <h4 className="day-event-title">{evt.title}</h4>
                      {(evt.startDate !== evt.endDate) && (
                        <p className="event-date-range">Date Range: {evt.startDate} to {evt.endDate}</p>
                      )}
                      {evt.description && <p className="day-event-description">{evt.description}</p>}
                    </div>
                    <div className="day-event-actions" onClick={e => e.stopPropagation()}>
                      {!evt.isExternal && (isAdmin || evt.createdBy === user?.uid) && (
                        <>
                          <button 
                            className="edit-day-evt-btn"
                            onClick={() => openEditEventModal(evt)}
                          >
                            Edit
                          </button>
                          <button 
                            className="del-day-evt-btn" 
                            onClick={async (e) => {
                              await handleDeleteEvent(e, evt.id);
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border-subtle, #e2e8f0)' }}>
              {user && (
                <button 
                  type="button" 
                  className="primary-btn"
                  style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem', minHeight: '36px' }}
                  onClick={() => {
                    setShowDayEventsModal(false);
                    openAddEventModal(selectedDate);
                  }}
                >
                  + Add Event
                </button>
              )}
              <button 
                className="secondary-btn" 
                style={{ fontSize: '0.9rem', padding: '0.4rem 0.8rem', minHeight: '36px' }} 
                onClick={() => setShowDayEventsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Event Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>{editingEventId ? 'Edit Activity / Event' : 'Encode Activity / Event'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveEvent}>
              <div className="form-group">
                <label>Activity / Event Title *</label>
                <input 
                  required 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="e.g., First Periodic Examination / INSET Capacity Building" 
                />
              </div>

              <div className="form-group">
                <label>Event Category / Type *</label>
                {isAdmin ? (
                  <select value={type} onChange={e => setType(e.target.value)}>
                    <option value="activity">School Activity / Event</option>
                    <option value="exam">Periodic Examination Week</option>
                    <option value="holiday">Holiday / Classes Suspended</option>
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
                  <p className="help-text" style={{ color: 'var(--color-danger, #ef4444)', marginTop: '0.25rem', fontSize: '0.85rem' }}>
                    ⚠️ Note: Declared holidays/suspensions will automatically exclude school days from the Teachers' Attendance Tracker.
                  </p>
                )}
              </div>

              {/* Multi-day Toggle */}
              <div className="checkbox-group-inline margin-bottom-sm">
                <input 
                  type="checkbox" 
                  id="isMultiDay" 
                  checked={isMultiDay} 
                  onChange={e => {
                    setIsMultiDay(e.target.checked);
                    if (!e.target.checked) setEndDate(startDate);
                  }} 
                />
                <label htmlFor="isMultiDay">
                  Multi-day Event / Date Range (e.g., Exam Week, INSET, Break)
                </label>
              </div>

              {/* Date Inputs */}
              <div className="form-row-2">
                <div className="form-group">
                  <label>{isMultiDay ? 'Start Date *' : 'Event Date *'}</label>
                  <input 
                    required 
                    type="date" 
                    value={startDate || ''} 
                    onChange={e => {
                      setStartDate(e.target.value);
                      if (!isMultiDay) setEndDate(e.target.value);
                    }} 
                  />
                </div>
                {isMultiDay && (
                  <div className="form-group">
                    <label>End Date *</label>
                    <input 
                      required 
                      type="date" 
                      min={startDate}
                      value={endDate || ''} 
                      onChange={e => setEndDate(e.target.value)} 
                    />
                  </div>
                )}
              </div>

              {/* Time Inputs */}
              <div className="form-row-2">
                <div className="form-group">
                  <label>Start Time (Optional)</label>
                  <input 
                    type="time" 
                    value={startTime} 
                    onChange={e => setStartTime(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label>End Time (Optional)</label>
                  <input 
                    type="time" 
                    value={endTime} 
                    onChange={e => setEndTime(e.target.value)} 
                  />
                </div>
              </div>

              {/* Venue / Location */}
              <div className="form-group">
                <label>Venue / Location (Optional)</label>
                <input 
                  type="text" 
                  value={location} 
                  onChange={e => setLocation(e.target.value)} 
                  placeholder="e.g., School Gymnasium, AVR, Classroom 101" 
                />
              </div>

              <div className="form-group">
                <label>Description & Agenda Notes (Optional)</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  rows="3"
                  placeholder="Additional details, instructions, or agenda for faculty/parents..."
                ></textarea>
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
                    Also broadcast this as a School Announcement
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

      {/* Event Details Inspector Modal */}
      {viewEventModal && (
        <div className="modal-overlay" onClick={() => setViewEventModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>Event Details</h2>
              <button className="close-btn" onClick={() => setViewEventModal(null)}>&times;</button>
            </div>
            <div style={{ padding: '1rem 0' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--color-heading, #0f172a)', marginBottom: '0.5rem' }}>
                {viewEventModal.isPrivate ? '🔒 ' : ''}{viewEventModal.title}
              </h3>
              
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span className={`day-event-badge badge-type-${viewEventModal.type}`}>
                  {viewEventModal.type.toUpperCase()}
                </span>
                {viewEventModal.isPrivate && <span className="private-badge">🔒 Private</span>}
                {viewEventModal.isExternal && <span className="external-badge">National Holiday</span>}
              </div>

              <div className="event-detail-rows">
                <p><strong>📅 Date:</strong> {viewEventModal.startDate && viewEventModal.endDate && viewEventModal.startDate !== viewEventModal.endDate ? `${viewEventModal.startDate} to ${viewEventModal.endDate}` : (viewEventModal.startDate || viewEventModal.date)}</p>
                {viewEventModal.startTime && (
                  <p><strong>⏱️ Time:</strong> {viewEventModal.startTime}{viewEventModal.endTime ? ` - ${viewEventModal.endTime}` : ''}</p>
                )}
                {viewEventModal.location && (
                  <p><strong>📍 Venue:</strong> {viewEventModal.location}</p>
                )}
              </div>

              {viewEventModal.description && (
                <div className="event-detail-description">
                  <p><strong>Details:</strong></p>
                  <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary, #475569)' }}>{viewEventModal.description}</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              {!viewEventModal.isExternal && (isAdmin || viewEventModal.createdBy === user?.uid) && (
                <button 
                  className="primary-btn" 
                  onClick={() => openEditEventModal(viewEventModal)}
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
