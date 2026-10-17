import React from 'react';
import EmptyState from '../../../components/EmptyState';

const DailyAttendanceView = ({
  activeSection,
  selectedDate,
  sectionStudents = [],
  allSuspendedDates = [],
  monthlyState = {},
  remarksState = {},
  dirtyCells = new Set(),
  loading = false,
  canEdit = false,
  onStatusToggle,
  onRemarkChange,
  onMarkAll,
  onSaveBatch
}) => {
  if (!activeSection) {
    return (
      <EmptyState
        icon="🏫"
        title="No Section Selected"
        description="Please choose an advisory section from the dropdown above to manage daily classroom roll call."
      />
    );
  }

  const isWeekend = new Date(selectedDate).getDay() === 0 || new Date(selectedDate).getDay() === 6;
  const isSuspended = allSuspendedDates.some(sd => sd.date === selectedDate);
  const isDisabled = isWeekend || isSuspended;

  const boys = sectionStudents.filter(s => s.gender === 'Male');
  const girls = sectionStudents.filter(s => s.gender === 'Female');

  const renderRow = (stu, i) => {
    const status = (monthlyState[stu.id] && monthlyState[stu.id][selectedDate]) || 'Present';
    const remark = (remarksState[stu.id] && remarksState[stu.id][selectedDate]) || '';

    return (
      <div key={stu.id} className="daily-student-row">
        <div className="student-name-col">
          <span className="student-idx">{i + 1}.</span> 
          <span 
            className="student-name" 
            style={{ 
              textDecoration: (stu.status && stu.status !== 'Active' && stu.status !== 'Transferred In') ? 'line-through' : 'none', 
              opacity: (stu.status && stu.status !== 'Active') ? 0.7 : 1 
            }}
          >
            {stu.lastName}, {stu.firstName}
          </span>
        </div>
        <div className="status-toggles-col">
          <button 
            type="button"
            className={`status-toggle btn-present ${status === 'Present' ? 'active' : ''}`}
            disabled={!canEdit || isDisabled}
            onClick={() => onStatusToggle(stu.id, selectedDate, 'Present')}
          >
            Present
          </button>
          <button 
            type="button"
            className={`status-toggle btn-absent ${status === 'Absent' ? 'active' : ''}`}
            disabled={!canEdit || isDisabled}
            onClick={() => onStatusToggle(stu.id, selectedDate, 'Absent')}
          >
            Absent
          </button>
          <button 
            type="button"
            className={`status-toggle btn-tardy ${status === 'Tardy' ? 'active' : ''}`}
            disabled={!canEdit || isDisabled}
            onClick={() => onStatusToggle(stu.id, selectedDate, 'Tardy')}
          >
            Late
          </button>
        </div>
        <div className="remarks-col" style={{ marginLeft: '1rem' }}>
          <input 
            type="text" 
            placeholder="Remarks..." 
            className="daily-remark-input"
            value={remark}
            disabled={!canEdit || isDisabled}
            onChange={(e) => onRemarkChange(stu.id, selectedDate, e.target.value)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="card daily-view-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>Daily Attendance: {activeSection.name} ({selectedDate})</h2>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {canEdit && !isDisabled && sectionStudents.length > 0 && (
            <div className="daily-quick-actions">
              <button 
                type="button"
                className="quick-action-btn btn-all-present" 
                onClick={() => onMarkAll('Present')}
                title="Mark all students Present for this date"
              >
                ⚡ Mark All Present
              </button>
              <button 
                type="button"
                className="quick-action-btn" 
                onClick={() => onMarkAll('Absent')}
                title="Mark all students Absent for this date"
              >
                Mark All Absent
              </button>
            </div>
          )}
          {canEdit ? (
            <button 
              type="button"
              className="primary-btn" 
              onClick={onSaveBatch} 
              disabled={loading || dirtyCells.size === 0 || isDisabled}
            >
              Save Changes {dirtyCells.size > 0 && `(${dirtyCells.size})`}
            </button>
          ) : (
            <span style={{ fontSize: '0.85rem', color: 'var(--blue)', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.4rem 0.8rem', borderRadius: '4px', fontWeight: 'bold' }}>
              👁️ View Only Mode
            </span>
          )}
        </div>
      </div>

      {isDisabled ? (
        <div className="daily-disabled-msg">
          Attendance is disabled for this date ({isWeekend ? 'Weekend' : 'Suspended/Holiday'}).
        </div>
      ) : (
        <div className="daily-student-list">
          <div className="daily-list-header">
            <div className="student-name-col">Learner's Name</div>
            <div className="status-toggles-col">Status</div>
          </div>
          
          <div className="daily-list-body">
            {boys.length > 0 && <div className="daily-gender-header">MALE</div>}
            {boys.map(renderRow)}
            
            {girls.length > 0 && <div className="daily-gender-header">FEMALE</div>}
            {girls.map(renderRow)}

            {boys.length === 0 && girls.length === 0 && (
              <EmptyState
                icon="👥"
                title="No Enrolled Learners"
                description={`There are currently no learners assigned to ${activeSection.gradeLevel} - ${activeSection.name}.`}
                compact
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyAttendanceView;
