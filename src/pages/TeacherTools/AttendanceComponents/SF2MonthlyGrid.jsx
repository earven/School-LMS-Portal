import React from 'react';

const SF2MonthlyGrid = ({
  activeSection,
  selectedMonth,
  sectionStudents = [],
  allSuspendedDates = [],
  classesStartDate,
  onClassesStartDateChange,
  manualDaysOfClasses,
  onManualDaysOfClassesChange,
  monthlyState = {},
  dirtyCells = new Set(),
  loading = false,
  canEdit = false,
  studentAlerts = [],
  sf2Summary,
  onCellClick,
  onStatusChange,
  onSaveBatch,
  onDownloadSF2,
  onOpenHomeVisit
}) => {
  if (!sf2Summary || !activeSection) return null;

  const [year, month] = selectedMonth.split('-');
  const daysInMonthObj = new Date(year, month, 0);
  const numDays = daysInMonthObj.getDate();
  const daysArray = [];

  for (let d = 1; d <= numDays; d++) {
    const dateStr = `${year}-${month}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, parseInt(month, 10) - 1, d).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isSuspended = allSuspendedDates.some(sd => sd.date === dateStr);
    const isBeforeStart = dateStr < classesStartDate;
    daysArray.push({
      dateStr,
      dayNum: d,
      isDisabled: isWeekend || isSuspended || isBeforeStart
    });
  }

  const renderStudentRows = (studentsList) => {
    return studentsList.map((stu, i) => {
      const stuData = monthlyState[stu.id] || {};
      let absentCount = 0;
      let tardyCount = 0;
      Object.entries(stuData).forEach(([dateStr, st]) => {
        const isClassDay = dateStr >= classesStartDate && !allSuspendedDates.some(sd => sd.date === dateStr);
        if (isClassDay) {
          if (st === 'Absent') absentCount++;
          if (st === 'Tardy') tardyCount++;
        }
      });
      const presentCount = Math.max(0, sf2Summary.daysOfClasses - absentCount);

      return (
        <tr key={stu.id} style={{ opacity: (stu.status && stu.status !== 'Active') ? 0.7 : 1 }}>
          <td className="col-name">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ textDecoration: (stu.status && stu.status !== 'Active' && stu.status !== 'Transferred In') ? 'line-through' : 'none' }}>
                {i + 1}. {stu.lastName}, {stu.firstName}
              </span>
              {canEdit ? (
                <select 
                  value={stu.status || 'Active'} 
                  onChange={(e) => onStatusChange(stu, e.target.value)}
                  style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.1rem', 
                    border: '1px solid var(--gray-300)', 
                    borderRadius: '4px',
                    background: stu.status && stu.status !== 'Active' ? '#fef3c7' : 'white',
                    maxWidth: '100px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="Active">Active</option>
                  <option value="NLPA">NLPA</option>
                  <option value="Dropped Out">Dropped</option>
                  <option value="Transferred Out">T. Out</option>
                  <option value="Transferred In">T. In</option>
                </select>
              ) : (
                stu.status && stu.status !== 'Active' && (
                  <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.3rem', background: 'var(--gray-200)', borderRadius: '4px' }}>
                    {stu.status}
                  </span>
                )
              )}
            </div>
          </td>
          {daysArray.map(day => {
            const status = stuData[day.dateStr] || 'Present';
            let display = '';
            let cellClass = 'sf2-present';
            if (day.isDisabled) {
              cellClass = 'sf2-disabled';
            } else if (status === 'Absent') {
              display = 'X';
              cellClass = 'sf2-absent';
            } else if (status === 'Tardy') {
              display = 'T';
              cellClass = 'sf2-tardy';
            }
            return (
              <td key={day.dateStr}>
                <div 
                  className={`sf2-cell ${cellClass}`}
                  onClick={() => onCellClick(stu.id, day.dateStr, day.isDisabled)}
                >
                  {display}
                </div>
              </td>
            );
          })}
          <td className="col-total" style={{ color: 'var(--green)' }}>{presentCount}</td>
          <td className="col-total" style={{ color: 'var(--red)' }}>{absentCount}</td>
          <td className="col-total" style={{ color: 'var(--orange)' }}>{tardyCount}</td>
        </tr>
      );
    });
  };

  const boys = sectionStudents.filter(s => s.gender === 'Male');
  const girls = sectionStudents.filter(s => s.gender === 'Female');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Early Warning Alerts */}
      {studentAlerts.length > 0 && canEdit && (
        <div className="alerts-container card" style={{ backgroundColor: '#fffbeb', margin: 0 }}>
          <h3 style={{ color: 'var(--orange-dark)', marginTop: 0 }}>⚠️ Early Warning & Home Visitation Alerts</h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--gray-700)' }}>
            The following students require intervention based on their attendance this month:
          </p>
          <div className="attendance-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="teaching-load-table" style={{ margin: 0, minWidth: '600px' }}>
              <thead>
                <tr>
                   <th style={{ textAlign: 'left' }}>Learner's Name</th>
                   <th>Total Absences</th>
                   <th>Max Consecutive</th>
                   <th style={{ textAlign: 'left' }}>Trigger Reason</th>
                   <th>Action Needed</th>
                </tr>
              </thead>
              <tbody>
                {studentAlerts.map(alert => (
                  <tr key={alert.student.id}>
                     <td style={{ fontWeight: 500, textAlign: 'left' }}>{alert.student.lastName}, {alert.student.firstName}</td>
                     <td style={{ color: alert.isRedAlert ? 'var(--red)' : 'var(--orange-dark)', fontWeight: 'bold' }}>{alert.totalAbsences}</td>
                     <td style={{ color: alert.isRedAlert ? 'var(--red)' : 'var(--orange-dark)', fontWeight: 'bold' }}>{alert.maxConsecutive}</td>
                     <td style={{ textAlign: 'left' }}>
                       <span style={{ 
                         background: alert.isRedAlert ? '#fee2e2' : '#ffedd5', 
                         color: alert.isRedAlert ? '#991b1b' : '#9a3412',
                         padding: '0.2rem 0.5rem',
                         borderRadius: '4px',
                         fontSize: '0.85rem',
                         fontWeight: 600
                       }}>
                         {alert.reason}
                       </span>
                     </td>
                     <td>
                        <button 
                          type="button"
                          className="secondary-btn" 
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', border: '1px solid var(--orange)', color: 'var(--orange-dark)' }}
                          onClick={() => onOpenHomeVisit(alert)}
                        >
                          Generate Home Visit Form
                        </button>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SF2 Monthly Grid Table */}
      <div className="card sf2-summary-card printable-sf2" style={{ padding: '1rem', margin: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>SF2 Monthly Grid: {activeSection.name} ({selectedMonth})</h2>
          
          <div className="no-print" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button type="button" className="primary-btn" onClick={onDownloadSF2} style={{ padding: '0.4rem 0.8rem' }}>
              ⬇️ Generate SF2
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)', background: 'var(--gray-50)', padding: '0.4rem 0.8rem', borderRadius: '4px' }}>
              <strong>Blank</strong> = Present &nbsp;|&nbsp; <strong style={{ color: 'var(--red)' }}>X</strong> = Absent &nbsp;|&nbsp; <strong style={{ color: 'var(--orange)' }}>T</strong> = Tardy
            </span>
            {canEdit ? (
              <button 
                type="button"
                className="primary-btn" 
                onClick={onSaveBatch} 
                disabled={loading || dirtyCells.size === 0}
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
      
        <div className="sf2-grid-container">
          <table className="sf2-grid-table">
            <thead>
              <tr>
                <th className="col-name" rowSpan="2">Learner's Name</th>
                <th colSpan={daysArray.length}>Dates</th>
                <th colSpan="3">Total</th>
              </tr>
              <tr>
                {daysArray.map(day => (
                  <th key={day.dateStr} className="col-day" style={{ opacity: day.isDisabled ? 0.3 : 1 }}>
                    {day.dayNum}
                  </th>
                ))}
                <th className="col-total">P</th>
                <th className="col-total">A</th>
                <th className="col-total">T</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={daysArray.length + 4} className="sf2-gender-header">MALE</td>
              </tr>
              {renderStudentRows(boys)}
              <tr>
                <td colSpan={daysArray.length + 4} className="sf2-gender-header">FEMALE</td>
              </tr>
              {renderStudentRows(girls)}
            </tbody>
          </table>
        </div>

        {/* DepEd SF2 Summary Data Blocks */}
        <div className="summary-grid" style={{ marginTop: '2rem' }}>
          {/* Enrolment Data */}
          <div className="summary-box">
            <h3>Enrolment Data</h3>
            <table className="summary-compact-table">
              <tbody>
                <tr><td>Enrolment (1st Friday June)</td><td><strong>{sf2Summary.enrolledFriday}</strong></td></tr>
                <tr><td>Late Enrolment</td><td><strong>{sf2Summary.lateEnrolled}</strong></td></tr>
                <tr><td>Registered (End of Month)</td><td><strong>{sf2Summary.registeredEnd}</strong></td></tr>
                <tr><td>Percentage of Enrolment</td><td><strong>{sf2Summary.pctEnrolled}%</strong></td></tr>
              </tbody>
            </table>
          </div>
          
          {/* Attendance Calculations */}
          <div className="summary-box">
            <h3>Attendance Calculations</h3>
            <table className="summary-compact-table">
              <tbody>
                <tr>
                  <td>Classes Start Date</td>
                  <td>
                    <input 
                      type="date" 
                      className="days-input"
                      style={{ width: '130px', fontSize: '0.85rem' }}
                      value={classesStartDate} 
                      onChange={e => onClassesStartDateChange(e.target.value)} 
                    />
                  </td>
                </tr>
                <tr>
                  <td>No. of Days of Classes</td>
                  <td>
                    <input 
                      type="number" 
                      className="days-input"
                      value={manualDaysOfClasses} 
                      onChange={e => onManualDaysOfClassesChange(e.target.value)} 
                    />
                  </td>
                </tr>
                <tr><td>Average Daily Attendance (M)</td><td><strong>{sf2Summary.maleADA}</strong></td></tr>
                <tr><td>Average Daily Attendance (F)</td><td><strong>{sf2Summary.femaleADA}</strong></td></tr>
                <tr><td>Average Daily Attendance (Total)</td><td><strong>{sf2Summary.totalADA}</strong></td></tr>
                <tr><td>Percentage of Attendance (M)</td><td><strong>{sf2Summary.malePct}%</strong></td></tr>
                <tr><td>Percentage of Attendance (F)</td><td><strong>{sf2Summary.femalePct}%</strong></td></tr>
                <tr><td>Percentage of Attendance (Total)</td><td><strong>{sf2Summary.totalPct}%</strong></td></tr>
              </tbody>
            </table>
          </div>

          {/* Movement & Absences */}
          <div className="summary-box">
            <h3>Movement & Absences</h3>
            <table className="summary-compact-table">
              <tbody>
                <tr><td>Absent &gt; 5 Consecutive Days</td><td style={{ color: 'var(--red)', fontWeight: 'bold' }}>{sf2Summary.consecutive5Days}</td></tr>
                <tr><td>Dropped Out</td><td><strong>{sf2Summary.droppedOut}</strong></td></tr>
                <tr><td>Transferred Out</td><td><strong>{sf2Summary.transferredOut}</strong></td></tr>
                <tr><td>Transferred In</td><td><strong>{sf2Summary.transferredIn}</strong></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SF2MonthlyGrid;
