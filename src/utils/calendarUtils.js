/**
 * calendarUtils.js
 * Utilities for iCalendar (.ics) export and date range evaluations
 * for the School Calendar system.
 */

/**
 * Checks if a specific date (YYYY-MM-DD) falls within an event's single date or date range.
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {Object} event - { date, startDate, endDate }
 * @returns {boolean}
 */
export const isDateInEventRange = (dateStr, event) => {
  if (!event || !dateStr) return false;
  
  const start = event.startDate || event.date;
  const end = event.endDate || event.startDate || event.date;

  if (!start) return false;
  return dateStr >= start && dateStr <= end;
};

/**
 * Formats a date string 'YYYY-MM-DD' for iCalendar (RFC 5545).
 */
const formatICalDate = (dateStr) => {
  return (dateStr || '').replace(/-/g, '');
};

/**
 * Generates a valid RFC 5545 standard .ICS file string and triggers a browser download.
 * @param {Array<Object>} events 
 * @param {string} schoolName 
 * @returns {boolean}
 */
export const exportEventsToICS = (events, schoolName = 'School LMS Portal') => {
  if (!events || events.length === 0) return false;

  const sanitizeText = (str = '') => {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//School LMS Portal//Calendar System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${sanitizeText(schoolName)} - School Calendar`,
    'X-WR-TIMEZONE:Asia/Manila'
  ];

  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  for (const evt of events) {
    const start = evt.startDate || evt.date;
    if (!start) continue;

    const end = evt.endDate || evt.startDate || evt.date;
    
    // For all-day events in iCal, DTEND is exclusive so add 1 day
    const endDateObj = new Date(end);
    endDateObj.setDate(endDateObj.getDate() + 1);
    const nextDayStr = endDateObj.toISOString().split('T')[0];

    const uid = evt.id ? `event-${evt.id}@school-lms.edu` : `event-${Date.now()}-${Math.random()}@school-lms.edu`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${formatICalDate(start)}`);
    lines.push(`DTEND;VALUE=DATE:${formatICalDate(nextDayStr)}`);
    lines.push(`SUMMARY:${sanitizeText(evt.title || 'School Event')}`);
    
    if (evt.description) {
      lines.push(`DESCRIPTION:${sanitizeText(evt.description)}`);
    }
    if (evt.location) {
      lines.push(`LOCATION:${sanitizeText(evt.location)}`);
    }
    
    const category = evt.type ? evt.type.toUpperCase() : 'EVENT';
    lines.push(`CATEGORIES:${category}`);
    lines.push(`STATUS:CONFIRMED`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  const icsContent = lines.join('\r\n');
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const filename = `${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_Calendar.ics`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);

  return true;
};
