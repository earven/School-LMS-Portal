import React, { useState } from 'react';

const AttendanceHolidayModal = ({
  isOpen,
  onClose,
  selectedMonth,
  suspendedDates = [],
  onAddDate,
  onRemoveDate
}) => {
  const [holidayInput, setHolidayInput] = useState('');
  const [holidayReasonInput, setHolidayReasonInput] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!holidayInput) return;
    onAddDate(holidayInput, holidayReasonInput);
    setHolidayInput('');
    setHolidayReasonInput('');
  };

  const monthDates = suspendedDates.filter(sd => sd.date && sd.date.startsWith(selectedMonth));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Holidays & Suspensions</h2>
          <button type="button" className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: '1rem', color: 'var(--gray-600)', fontSize: '0.9rem' }}>
            Add dates below to automatically deduct them from the total days of classes for {selectedMonth}.
          </p>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <input 
              type="date" 
              value={holidayInput}
              onChange={(e) => setHolidayInput(e.target.value)} 
              style={{ width: '150px', padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <input 
              type="text" 
              placeholder="Reason (e.g. Typhoon, Holiday)"
              value={holidayReasonInput}
              onChange={(e) => setHolidayReasonInput(e.target.value)} 
              style={{ flexGrow: 1, padding: '0.6rem', borderRadius: '4px', border: '1px solid #ccc', minWidth: '150px' }}
            />
            <button 
              type="button"
              className="primary-btn"
              onClick={handleAdd}
              disabled={!holidayInput}
              style={{ padding: '0 1.5rem' }}
            >
              Add Date
            </button>
          </div>

          <div className="holiday-list" style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {monthDates.length === 0 ? (
              <p style={{ color: 'var(--gray-500)', textAlign: 'center', margin: '2rem 0' }}>No dates added for this month.</p>
            ) : (
              <table className="teaching-load-table" style={{ marginTop: 0 }}>
                <thead>
                  <tr>
                    <th>Date & Reason</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {monthDates.map(sd => {
                    const parts = sd.date.split('-');
                    const dateObj = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
                    return (
                      <tr key={sd.date}>
                        <td>
                          <div style={{ fontWeight: 500 }}>
                            {dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>
                            {sd.reason}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            type="button"
                            onClick={() => onRemoveDate(sd.date)}
                            style={{ 
                              background: '#fee2e2', 
                              color: '#991b1b', 
                              border: 'none', 
                              borderRadius: '4px', 
                              padding: '0.3rem 0.6rem', 
                              cursor: 'pointer', 
                              fontSize: '0.8rem', 
                              fontWeight: 600 
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="primary-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceHolidayModal;
