import React from 'react';

const defaultSchedule = {
  days: [], // ['Monday', 'Tuesday']
  startTime: '',
  endTime: ''
};

export const parseSchedule = (sched) => {
  if (!sched || typeof sched === 'string') {
    return JSON.parse(JSON.stringify(defaultSchedule));
  }
  // Convert old format to new format if needed
  if (!Array.isArray(sched.days)) {
    const days = [];
    let startTime = '';
    let endTime = '';
    Object.entries(sched).forEach(([day, data]) => {
      if (data?.active) {
        days.push(day);
        if (!startTime) startTime = data.startTime;
        if (!endTime) endTime = data.endTime;
      }
    });
    return { days, startTime, endTime };
  }
  return sched;
};

export const formatTime = (timeStr) => {
  if (!timeStr) return '--:--';
  const [hours, minutes] = timeStr.split(':');
  if (!hours || !minutes) return timeStr;
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // '0' should be '12'
  return `${h}:${minutes} ${ampm}`;
};

export const hasTimeOverlap = (schedA, schedB) => {
  const parsedA = parseSchedule(schedA);
  const parsedB = parseSchedule(schedB);
  
  if (!parsedA.days || !parsedA.startTime || !parsedA.endTime) return false;
  if (!parsedB.days || !parsedB.startTime || !parsedB.endTime) return false;

  const sharedDays = parsedA.days.filter(d => parsedB.days.includes(d));
  if (sharedDays.length === 0) return false;

  const [startAH, startAM] = parsedA.startTime.split(':').map(Number);
  const [endAH, endAM] = parsedA.endTime.split(':').map(Number);
  const startAMins = startAH * 60 + startAM;
  const endAMins = endAH * 60 + endAM;

  const [startBH, startBM] = parsedB.startTime.split(':').map(Number);
  const [endBH, endBM] = parsedB.endTime.split(':').map(Number);
  const startBMins = startBH * 60 + startBM;
  const endBMins = endBH * 60 + endBM;

  return (startAMins < endBMins) && (endAMins > startBMins);
};

export const getColorFromName = (name) => {
  if (!name) return 'hsl(0, 0%, 60%)';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 45%)`;
};

const CalendarScheduleView = ({ loads, sections, selectedDay, openEdit, handleDelete, isAdmin, currentUserId, breaks = [], readOnly = false }) => {
  let startHour = 7; // default 7 AM
  let endHour = 17; // default 5 PM
  
  // Dynamically expand hours if schedule goes outside 7-17
  const expandHours = (startTime, endTime) => {
    if (startTime) startHour = Math.min(startHour, parseInt(startTime.split(':')[0]));
    if (endTime) {
      let endH = parseInt(endTime.split(':')[0]);
      if (parseInt(endTime.split(':')[1]) > 0) endH++; // round up if there are minutes
      endHour = Math.max(endHour, endH);
    }
  };

  loads.forEach(l => {
    const p = parseSchedule(l.schedule);
    expandHours(p.startTime, p.endTime);
  });
  breaks.forEach(b => expandHours(b.startTime, b.endTime));

  const totalMinutes = (endHour - startHour) * 60;
  const pixelsPerMinute = 1.2; // scale factor
  const containerHeight = totalMinutes * pixelsPerMinute;
  
  const timeSlots = [];
  for(let i = startHour; i <= endHour; i++) {
    const ampm = i >= 12 ? 'PM' : 'AM';
    const displayHour = i > 12 ? i - 12 : (i === 0 ? 12 : i);
    timeSlots.push(`${displayHour}:00 ${ampm}`);
    if (i < endHour) {
      timeSlots.push(`${displayHour}:30 ${ampm}`);
    }
  }

  // Filter loads for the selectedDay
  const dayLoads = loads.filter(load => {
    const parsed = parseSchedule(load.schedule);
    return parsed.days && parsed.days.includes(selectedDay);
  });

  // Assign visually distinct colors to each unique teacher using Golden Ratio
  const uniqueTeachers = [...new Set(loads.map(l => l.teacherName || 'Unknown'))].sort();
  const colorMap = {};
  const PHI = 0.618033988749895; 
  let currentHue = 0.1;
  uniqueTeachers.forEach(name => {
    colorMap[name] = `hsl(${Math.floor(currentHue * 360)}, 65%, 45%)`;
    currentHue += PHI;
    currentHue %= 1;
  });

  const minGridWidth = Math.max(800, 70 + (sections.length * 180));

  return (
    <div className="calendar-grid-wrapper" style={{ paddingBottom: '10px' }}>
      <div className="calendar-grid" style={{ 
        gridTemplateColumns: `70px repeat(${Math.max(1, sections.length)}, minmax(180px, 1fr))`,
        minWidth: `${minGridWidth}px`
      }}>
        <div className="calendar-time-col">
          <div className="calendar-day-header">Time</div>
          {timeSlots.map((time, idx) => (
            <div key={idx} className="time-label" style={{ height: `${30 * pixelsPerMinute}px` }}>{time}</div>
          ))}
        </div>
        
        {sections.length === 0 && (
          <div className="calendar-day-col">
            <div className="calendar-day-header">No Sections</div>
            <div className="calendar-day-content" style={{ height: `${containerHeight}px` }}></div>
          </div>
        )}

        {sections.map(section => {
          // Find loads for this section
          const sectionLoads = dayLoads.filter(l => l.sectionId === section.id.toString() || l.sectionId === section.id);
          
          return (
            <div key={section.id} className="calendar-day-col">
              <div className="calendar-day-header" title={`${section.gradeLevel || ''} - ${section.name}`}>
                {(section.gradeLevel ? section.gradeLevel.replace('Grade ', 'G') + ' - ' : '')} {section.name}
              </div>
              <div className="calendar-day-content" style={{ height: `${containerHeight}px`, position: 'relative' }}>
                {/* Render time slot lines */}
                {timeSlots.map((_, idx) => (
                  <div key={`line-${idx}`} className="hour-grid-line" style={{ top: `${idx * 30 * pixelsPerMinute}px` }} />
                ))}
                {/* Render Breaks */}
                {breaks.map(b => {
                  if (!b.startTime || !b.endTime) return null;
                  const [startH, startM] = b.startTime.split(':').map(Number);
                  const [endH, endM] = b.endTime.split(':').map(Number);
                  
                  const startMins = (startH * 60 + startM) - (startHour * 60);
                  const endMins = (endH * 60 + endM) - (startHour * 60);
                  
                  if (startMins < 0 || startMins >= totalMinutes) return null;
                  
                  const top = startMins * pixelsPerMinute;
                  const height = Math.max(20, (endMins - startMins) * pixelsPerMinute);
                  
                  return (
                    <div 
                      key={b.id || b.name} 
                      className="calendar-break-block"
                      style={{ 
                        top: `${top}px`, 
                        height: `${height}px`,
                      }}
                      title={b.name}
                    >
                      <div className="break-inner">
                        <span className="break-name">{b.name}</span>
                        <span className="break-time">{formatTime(b.startTime)} - {formatTime(b.endTime)}</span>
                      </div>
                    </div>
                  );
                })}
                {sectionLoads.map(load => {
                  const parsed = parseSchedule(load.schedule);
                  if (!parsed.startTime || !parsed.endTime) return null;
                  
                  const [startH, startM] = parsed.startTime.split(':').map(Number);
                  const [endH, endM] = parsed.endTime.split(':').map(Number);
                  
                  const startMins = (startH * 60 + startM) - (startHour * 60);
                  const endMins = (endH * 60 + endM) - (startHour * 60);
                  
                  if (startMins < 0 || startMins >= totalMinutes) return null;
                  
                  const top = startMins * pixelsPerMinute;
                  const height = Math.max(20, (endMins - startMins) * pixelsPerMinute);
                  
                  const canEdit = !readOnly && (isAdmin || load.teacherId === currentUserId);
                  
                  return (
                    <div 
                      key={load.id} 
                      className="calendar-block"
                      style={{ 
                        top: `${top}px`, 
                        height: `${height}px`,
                        backgroundColor: colorMap[load.teacherName || 'Unknown'],
                        cursor: canEdit ? 'pointer' : 'default'
                      }}
                      onClick={() => canEdit && openEdit && openEdit(load)}
                      title={canEdit ? `Edit ${load.subject}` : load.subject}
                    >
                      <div className="block-inner">
                        <div className="block-subject">{load.subject}</div>
                        <div className="block-teacher">{load.teacherName}</div>
                        <div className="block-time">{formatTime(parsed.startTime)} - {formatTime(parsed.endTime)}</div>
                      </div>
                      {canEdit && handleDelete && (
                        <button 
                          type="button" 
                          className="block-delete-btn"
                          onClick={(e) => { e.stopPropagation(); handleDelete(load.id); }}
                          title="Delete Assignment"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarScheduleView;
