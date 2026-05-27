import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSections } from '../../context/SectionContext';
import { useStudents } from '../../context/StudentContext';
import { useAttendance } from '../../context/AttendanceContext';
import { useCalendar } from '../../context/CalendarContext';
import { useSettings } from '../../context/SettingsContext';
import './AttendanceTracker.css';

const AttendanceTracker = () => {
  const { user } = useAuth();
  const { sections } = useSections();
  const { students, updateStudent } = useStudents();
  const { fetchAttendance, fetchSchoolAttendance, saveBatchAttendance } = useAttendance();
  const { events } = useCalendar();
  const { settings } = useSettings();

  const isAdmin = ['admin', 'system_admin'].includes(user?.role);
  const mySections = useMemo(() => {
    if (isAdmin) return sections;
    return sections.filter(s => s.adviserId === user?.uid);
  }, [sections, user, isAdmin]);

  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  const [manualDaysOfClasses, setManualDaysOfClasses] = useState(22);

  const [suspendedDates, setSuspendedDates] = useState([]);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayInput, setHolidayInput] = useState('');
  const [holidayReasonInput, setHolidayReasonInput] = useState('');

  const allSuspendedDates = useMemo(() => {
    const manual = suspendedDates.map(sd => ({ date: sd.date, reason: sd.reason }));
    const calHolidays = (events || [])
      .filter(e => e.type === 'holiday')
      .map(e => ({ date: e.date, reason: `Calendar: ${e.title}` }));
    
    const merged = [...manual];
    calHolidays.forEach(ch => {
      if (!merged.find(m => m.date === ch.date)) merged.push(ch);
    });
    return merged;
  }, [suspendedDates, events]);

  // Auto-calculate weekdays when month changes
  useEffect(() => {
    if (!selectedMonth || !selectedMonth.includes('-')) return;
    const [year, month] = selectedMonth.split('-');
    if (!year || !month || isNaN(parseInt(month))) return;

    const daysInMonth = new Date(year, month, 0).getDate();
    let weekdays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${month}-${String(d).padStart(2, '0')}`;
      const day = new Date(year, parseInt(month) - 1, d).getDay();
      if (day !== 0 && day !== 6 && !allSuspendedDates.some(sd => sd.date === dateStr)) weekdays++;
    }
    setManualDaysOfClasses(weekdays);
  }, [selectedMonth, allSuspendedDates]);

  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [schoolAttendanceLogs, setSchoolAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [viewMode, setViewMode] = useState('daily'); // 'daily', 'sf2', 'sf4'
  const [monthlyState, setMonthlyState] = useState({});
  const [remarksState, setRemarksState] = useState({});
  const [dirtyCells, setDirtyCells] = useState(new Set());

  const activeSection = mySections.find(s => s.id === selectedSectionId);
  const isAdviser = activeSection && activeSection.adviserId === user?.uid;
  const canEdit = isAdviser; // Even admins can only view unless they are the assigned adviser

  const sectionStudents = useMemo(() => {
    if (!activeSection) return [];
    return students.filter(s => s.sectionId === activeSection.id)
      .sort((a,b) => {
        if (a.gender !== b.gender) return a.gender === 'Male' ? -1 : 1;
        return a.lastName.localeCompare(b.lastName);
      });
  }, [activeSection, students]);

  useEffect(() => {
    if (mySections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(mySections[0].id);
    }
  }, [mySections, selectedSectionId]);

  const loadMonthData = async () => {
    if (!selectedSectionId || !selectedMonth) return;
    setLoading(true);
    const res = await fetchAttendance(selectedSectionId, selectedMonth);
    if (res.success) {
      setAttendanceLogs(res.data);
      
      const newState = {};
      const newRemarks = {};
      res.data.forEach(log => {
        if (!newState[log.studentId]) newState[log.studentId] = {};
        if (!newRemarks[log.studentId]) newRemarks[log.studentId] = {};
        newState[log.studentId][log.date] = log.status;
        newRemarks[log.studentId][log.date] = log.remarks || '';
      });
      setMonthlyState(newState);
      setRemarksState(newRemarks);
      setDirtyCells(new Set());
    }
    setLoading(false);
  };

  const loadSchoolData = async () => {
    setLoading(true);
    const res = await fetchSchoolAttendance(selectedMonth);
    if (res.success) {
      setSchoolAttendanceLogs(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (viewMode === 'sf4') {
      loadSchoolData();
    } else {
      loadMonthData();
    }
  }, [selectedSectionId, selectedMonth, selectedDate, sectionStudents.length, viewMode]);

  const handleCellClick = (studentId, dateStr, isDisabled) => {
    if (isDisabled || !canEdit) return;
    
    setMonthlyState(prev => {
      const studentData = prev[studentId] || {};
      const currentStatus = studentData[dateStr] || 'Present';
      
      let newStatus = 'Present';
      if (currentStatus === 'Present') newStatus = 'Absent';
      else if (currentStatus === 'Absent') newStatus = 'Tardy';
      else if (currentStatus === 'Tardy') newStatus = 'Present';

      setDirtyCells(prevDirty => {
        const newSet = new Set(prevDirty);
        newSet.add(`${studentId}_${dateStr}`);
        return newSet;
      });

      return {
        ...prev,
        [studentId]: {
          ...studentData,
          [dateStr]: newStatus
        }
      };
    });
  };

  const saveBatch = async () => {
    if (dirtyCells.size === 0) return;
    
    const dataToSave = [];
    dirtyCells.forEach(key => {
      const [studentId, dateStr] = key.split('_');
      dataToSave.push({
        studentId,
        date: dateStr,
        status: monthlyState[studentId]?.[dateStr] || 'Present',
        remarks: remarksState[studentId]?.[dateStr] || ''
      });
    });

    setLoading(true);
    const res = await saveBatchAttendance(selectedSectionId, selectedMonth, dataToSave);
    if (res.success) {
      alert("Attendance saved successfully!");
      setDirtyCells(new Set());
      loadMonthData();
    } else {
      alert("Failed to save: " + res.error);
    }
    setLoading(false);
  };

  const handleStatusChange = async (student, newStatus) => {
    if (!canEdit) return;
    try {
      await updateStudent({ ...student, status: newStatus });
      // updateStudent automatically updates the context, so sectionStudents will re-calculate.
    } catch (e) {
      alert("Failed to update student status.");
    }
    setLoading(false);
  };

  const handleExportSF2CSV = () => {
    if (!activeSection) return;
    
    const [year, month] = selectedMonth.split('-');
    const daysInMonthObj = new Date(year, month, 0);
    const numDays = daysInMonthObj.getDate();
    const daysArray = [];
    for (let d = 1; d <= numDays; d++) {
      const dateStr = `${year}-${month}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, parseInt(month) - 1, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isSuspended = allSuspendedDates.some(sd => sd.date === dateStr);
      daysArray.push({
        dateStr,
        dayNum: d,
        isDisabled: isWeekend || isSuspended
      });
    }

    const headers = ['Learner Name'];
    daysArray.forEach(d => headers.push(`Day ${d.dayNum}`));
    headers.push('Total Present', 'Total Absent', 'Total Tardy');

    const csvRows = [headers.join(',')];

    const generateRow = (stu, index) => {
      const stuData = monthlyState[stu.id] || {};
      let absentCount = 0;
      let tardyCount = 0;
      Object.values(stuData).forEach(st => {
        if (st === 'Absent') absentCount++;
        if (st === 'Tardy') tardyCount++;
      });
      const presentCount = Math.max(0, sf2Summary.daysOfClasses - absentCount);

      const row = [`"${index + 1}. ${stu.lastName}, ${stu.firstName}"`];
      daysArray.forEach(day => {
        if (day.isDisabled) {
          row.push('');
        } else {
          const status = stuData[day.dateStr] || 'Present';
          if (status === 'Present') row.push('');
          else if (status === 'Absent') row.push('X');
          else if (status === 'Tardy') row.push('T');
        }
      });
      row.push(presentCount, absentCount, tardyCount);
      return row.join(',');
    };

    const boys = sectionStudents.filter(s => s.gender === 'Male');
    const girls = sectionStudents.filter(s => s.gender === 'Female');

    csvRows.push(',MALE');
    boys.forEach((stu, i) => csvRows.push(generateRow(stu, i)));
    
    csvRows.push(',FEMALE');
    girls.forEach((stu, i) => csvRows.push(generateRow(stu, i)));

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `SF2_${activeSection.name}_${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Early Warning Alerts Calculation ---
  const studentAlerts = useMemo(() => {
    if (viewMode !== 'sf2' || !activeSection) return [];
    
    const alerts = [];
    const [year, month] = selectedMonth.split('-');
    const daysInMonthObj = new Date(year, month, 0);
    const numDays = daysInMonthObj.getDate();
    
    // Create sorted array of all valid dates this month
    const validDates = [];
    for (let d = 1; d <= numDays; d++) {
      const dateStr = `${year}-${month}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, parseInt(month) - 1, d).getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !allSuspendedDates.some(sd => sd.date === dateStr)) {
        validDates.push(dateStr);
      }
    }

    sectionStudents.forEach(stu => {
      const stuData = monthlyState[stu.id] || {};
      let totalAbsences = 0;
      let maxConsecutive = 0;
      let currentConsecutive = 0;
      
      validDates.forEach(dateStr => {
        if (stuData[dateStr] === 'Absent') {
          totalAbsences++;
          currentConsecutive++;
          if (currentConsecutive > maxConsecutive) maxConsecutive = currentConsecutive;
        } else {
          currentConsecutive = 0;
        }
      });

      if (maxConsecutive >= 5 || totalAbsences >= 5) {
         alerts.push({
           student: stu,
           totalAbsences,
           maxConsecutive,
           isRedAlert: true,
           reason: maxConsecutive >= 5 ? '5 Consecutive Absences' : '5 Total Absences'
         });
      } else if (maxConsecutive >= 3 || totalAbsences >= 3) {
         alerts.push({
           student: stu,
           totalAbsences,
           maxConsecutive,
           isRedAlert: false,
           reason: maxConsecutive >= 3 ? '3 Consecutive Absences' : '3 Total Absences'
         });
      }
    });

    return alerts.sort((a, b) => b.totalAbsences - a.totalAbsences);
  }, [viewMode, activeSection, sectionStudents, monthlyState, selectedMonth, allSuspendedDates]);

  // --- Calculations for SF2 Summary ---
  const sf2Summary = useMemo(() => {
    if (viewMode !== 'sf2' || !activeSection) return null;
    
    let daysOfClasses = Number(manualDaysOfClasses) || 0; // Use manual override instead of unique log dates
    
    const boys = sectionStudents.filter(s => s.gender === 'Male');
    const girls = sectionStudents.filter(s => s.gender === 'Female');
    
    let maleTotalAbsences = 0;
    let femaleTotalAbsences = 0;
    sectionStudents.forEach(s => {
      const stuData = monthlyState[s.id] || {};
      Object.values(stuData).forEach(status => {
        if (status === 'Absent') {
          if (s.gender === 'Male') maleTotalAbsences++;
          else femaleTotalAbsences++;
        }
      });
    });

    const maleADA = daysOfClasses > 0 ? ((boys.length * daysOfClasses) - maleTotalAbsences) / daysOfClasses : 0;
    const femaleADA = daysOfClasses > 0 ? ((girls.length * daysOfClasses) - femaleTotalAbsences) / daysOfClasses : 0;
    const totalADA = maleADA + femaleADA;

    const maleAttendancePct = boys.length > 0 ? (maleADA / boys.length) * 100 : 0;
    const femaleAttendancePct = girls.length > 0 ? (femaleADA / girls.length) * 100 : 0;
    const totalAttendancePct = sectionStudents.length > 0 ? (totalADA / sectionStudents.length) * 100 : 0;

    // 5 consecutive days calculation now uses the real-time studentAlerts
    const consecutive5Days = studentAlerts.filter(a => a.maxConsecutive >= 5).length;

    // Student statuses (Dropped, Transferred) - Fallback to 0 if not tracked specifically in student profile
    const droppedOut = sectionStudents.filter(s => s.status === 'Dropped Out').length;
    const transferredOut = sectionStudents.filter(s => s.status === 'Transferred Out').length;
    const transferredIn = sectionStudents.filter(s => s.status === 'Transferred In').length;

    return {
      daysOfClasses,
      enrolledFriday: sectionStudents.length, // Placeholder assumption
      lateEnrolled: 0,
      registeredEnd: sectionStudents.length,
      pctEnrolled: 100,
      maleRegistered: boys.length,
      femaleRegistered: girls.length,
      totalRegistered: sectionStudents.length,
      maleADA: maleADA.toFixed(2),
      femaleADA: femaleADA.toFixed(2),
      totalADA: totalADA.toFixed(2),
      malePct: maleAttendancePct.toFixed(2),
      femalePct: femaleAttendancePct.toFixed(2),
      totalPct: totalAttendancePct.toFixed(2),
      consecutive5Days,
      droppedOut,
      transferredOut,
      transferredIn
    };
  }, [viewMode, activeSection, sectionStudents, monthlyState, manualDaysOfClasses, studentAlerts]);

  const renderSF2Grid = () => {
    if (!sf2Summary) return null;
    
    const [year, month] = selectedMonth.split('-');
    const daysInMonthObj = new Date(year, month, 0);
    const numDays = daysInMonthObj.getDate();
    const daysArray = [];
    for (let d = 1; d <= numDays; d++) {
      const dateStr = `${year}-${month}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, parseInt(month) - 1, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isSuspended = allSuspendedDates.some(sd => sd.date === dateStr);
      daysArray.push({
        dateStr,
        dayNum: d,
        isDisabled: isWeekend || isSuspended
      });
    }

    const renderStudentRows = (studentsList) => {
      return studentsList.map((stu, i) => {
        const stuData = monthlyState[stu.id] || {};
        let absentCount = 0;
        let tardyCount = 0;
        Object.values(stuData).forEach(st => {
          if (st === 'Absent') absentCount++;
          if (st === 'Tardy') tardyCount++;
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
                    onChange={(e) => handleStatusChange(stu, e.target.value)}
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
                    onClick={() => handleCellClick(stu.id, day.dateStr, day.isDisabled)}
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
                         <button className="secondary-btn" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', border: '1px solid var(--orange)' }}>
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

        <div className="card sf2-summary-card printable-sf2" style={{ padding: '1rem', margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>SF2 Monthly Grid: {activeSection.name} ({selectedMonth})</h2>
          
          <div className="no-print" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="secondary-btn" onClick={handleExportSF2CSV} style={{ padding: '0.4rem 0.8rem' }}>📥 Export CSV</button>
            <button className="secondary-btn" onClick={() => window.print()} style={{ padding: '0.4rem 0.8rem' }}>🖨️ Print / Save PDF</button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)', background: 'var(--gray-50)', padding: '0.4rem 0.8rem', borderRadius: '4px' }}>
              <strong>Blank</strong> = Present &nbsp;|&nbsp; <strong style={{color: 'var(--red)'}}>X</strong> = Absent &nbsp;|&nbsp; <strong style={{color: 'var(--orange)'}}>T</strong> = Tardy
            </span>
            {canEdit ? (
              <button 
                className="primary-btn" 
                onClick={saveBatch} 
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
                  <td>No. of Days of Classes</td>
                  <td>
                    <input 
                      type="number" 
                      className="days-input"
                      value={manualDaysOfClasses} 
                      onChange={e => setManualDaysOfClasses(e.target.value)} 
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

  const renderSF4Summary = () => {
    // Group all students by section
    const sf4Data = sections.map(sec => {
      const secStudents = students.filter(s => s.sectionId === sec.id);
      const secLogs = schoolAttendanceLogs.filter(l => l.sectionId === sec.id);
      
      const boys = secStudents.filter(s => s.gender === 'Male');
      const girls = secStudents.filter(s => s.gender === 'Female');
      
      let daysOfClasses = Number(manualDaysOfClasses) || 0; // override

      const maleAbsences = secLogs.filter(r => r.status === 'Absent' && students.find(s => s.id === r.studentId)?.gender === 'Male').length;
      const femaleAbsences = secLogs.filter(r => r.status === 'Absent' && students.find(s => s.id === r.studentId)?.gender === 'Female').length;

      const maleADA = daysOfClasses > 0 ? ((boys.length * daysOfClasses) - maleAbsences) / daysOfClasses : 0;
      const femaleADA = daysOfClasses > 0 ? ((girls.length * daysOfClasses) - femaleAbsences) / daysOfClasses : 0;
      
      const totalADA = maleADA + femaleADA;
      const totalPct = secStudents.length > 0 ? (totalADA / secStudents.length) * 100 : 0;

      return {
        id: sec.id,
        name: sec.name,
        grade: sec.gradeLevel,
        maleReg: boys.length,
        femaleReg: girls.length,
        totalReg: secStudents.length,
        maleADA: maleADA.toFixed(1),
        femaleADA: femaleADA.toFixed(1),
        totalADA: totalADA.toFixed(1),
        totalPct: totalPct.toFixed(1)
      };
    }).sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name));

    return (
      <div className="card printable-sf4">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>School Form 4 (SF4) Report: {selectedMonth}</h2>
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--gray-600)' }} className="no-print">
              <span>No. of Days of Classes: </span>
              <input 
                type="number" 
                style={{ width: '60px', textAlign: 'right', padding: '2px', border: '1px solid #ccc', borderRadius: '4px' }} 
                value={manualDaysOfClasses} 
                onChange={e => setManualDaysOfClasses(e.target.value)} 
              />
            </div>
          </div>
          <button className="primary-btn no-print" onClick={() => window.print()}>Print / Save PDF</button>
        </div>
        
        <table className="teaching-load-table sf4-table">
          <thead>
            <tr>
              <th rowSpan="2">Grade Level & Section</th>
              <th colSpan="3">Registered Learners</th>
              <th colSpan="3">Average Daily Attendance</th>
              <th rowSpan="2">Percentage of Attendance</th>
            </tr>
            <tr>
              <th>Male</th>
              <th>Female</th>
              <th>Total</th>
              <th>Male</th>
              <th>Female</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sf4Data.map(d => (
              <tr key={d.id}>
                <td>{d.grade} - {d.name}</td>
                <td>{d.maleReg}</td>
                <td>{d.femaleReg}</td>
                <td><strong>{d.totalReg}</strong></td>
                <td>{d.maleADA}</td>
                <td>{d.femaleADA}</td>
                <td><strong>{d.totalADA}</strong></td>
                <td><strong>{d.totalPct}%</strong></td>
              </tr>
            ))}
            {sf4Data.length === 0 && (
              <tr><td colSpan="8" style={{ textAlign: 'center' }}>No data available for {selectedMonth}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDailyView = () => {
    if (!activeSection) return <div className="card"><p>Please select a section.</p></div>;

    const isWeekend = new Date(selectedDate).getDay() === 0 || new Date(selectedDate).getDay() === 6;
    const isSuspended = allSuspendedDates.some(sd => sd.date === selectedDate);
    const isDisabled = isWeekend || isSuspended;

    return (
      <div className="card daily-view-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0 }}>Daily Attendance: {activeSection.name} ({selectedDate})</h2>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {canEdit ? (
              <button 
                className="primary-btn" 
                onClick={saveBatch} 
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
              {(() => {
                const boys = sectionStudents.filter(s => s.gender === 'Male');
                const girls = sectionStudents.filter(s => s.gender === 'Female');
                
                const renderRow = (stu, i) => {
                  const status = (monthlyState[stu.id] && monthlyState[stu.id][selectedDate]) || 'Present';
                  
                  return (
                    <div key={stu.id} className="daily-student-row">
                      <div className="student-name-col">
                        <span className="student-idx">{i + 1}.</span> 
                        <span className="student-name" style={{ textDecoration: (stu.status && stu.status !== 'Active' && stu.status !== 'Transferred In') ? 'line-through' : 'none', opacity: (stu.status && stu.status !== 'Active') ? 0.7 : 1 }}>{stu.lastName}, {stu.firstName}</span>
                      </div>
                      <div className="status-toggles-col">
                        <button 
                          className={`status-toggle btn-present ${status === 'Present' ? 'active' : ''}`}
                          onClick={() => {
                             if (!canEdit) return;
                             setMonthlyState(prev => {
                               const stuData = prev[stu.id] || {};
                               setDirtyCells(d => new Set(d).add(`${stu.id}_${selectedDate}`));
                               return { ...prev, [stu.id]: { ...stuData, [selectedDate]: 'Present' } };
                             });
                          }}
                        >Present</button>
                        <button 
                          className={`status-toggle btn-absent ${status === 'Absent' ? 'active' : ''}`}
                          onClick={() => {
                             if (!canEdit) return;
                             setMonthlyState(prev => {
                               const stuData = prev[stu.id] || {};
                               setDirtyCells(d => new Set(d).add(`${stu.id}_${selectedDate}`));
                               return { ...prev, [stu.id]: { ...stuData, [selectedDate]: 'Absent' } };
                             });
                          }}
                        >Absent</button>
                        <button 
                          className={`status-toggle btn-tardy ${status === 'Tardy' ? 'active' : ''}`}
                          onClick={() => {
                             if (!canEdit) return;
                             setMonthlyState(prev => {
                               const stuData = prev[stu.id] || {};
                               setDirtyCells(d => new Set(d).add(`${stu.id}_${selectedDate}`));
                               return { ...prev, [stu.id]: { ...stuData, [selectedDate]: 'Tardy' } };
                             });
                          }}
                        >Late</button>
                      </div>
                      <div className="remarks-col" style={{ marginLeft: '1rem' }}>
                        <input 
                          type="text" 
                          placeholder="Remarks..." 
                          className="daily-remark-input"
                          value={(remarksState[stu.id] && remarksState[stu.id][selectedDate]) || ''}
                          disabled={!canEdit}
                          onChange={(e) => {
                             if (!canEdit) return;
                             setRemarksState(prev => {
                               const stuData = prev[stu.id] || {};
                               setDirtyCells(d => new Set(d).add(`${stu.id}_${selectedDate}`));
                               return { ...prev, [stu.id]: { ...stuData, [selectedDate]: e.target.value } };
                             });
                          }}
                        />
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    {boys.length > 0 && <div className="daily-gender-header">MALE</div>}
                    {boys.map(renderRow)}
                    
                    {girls.length > 0 && <div className="daily-gender-header">FEMALE</div>}
                    {girls.map(renderRow)}

                    {boys.length === 0 && girls.length === 0 && (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
                        No students enrolled in this section.
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="attendance-tracker-container">
      <div className="attendance-header">
        <div>
          <h1>Attendance Management</h1>
          <p>Track daily attendance and view SF2/SF4 monthly summaries.</p>
        </div>
      </div>

      {/* Emphasized View Mode Tabs */}
      <div className="attendance-tabs">
        <button 
          className={`attendance-tab ${viewMode === 'daily' ? 'active-tab' : ''}`} 
          onClick={() => setViewMode('daily')}
        >
          📱 Daily Classroom View
        </button>
        <button 
          className={`attendance-tab ${viewMode === 'sf2' ? 'active-tab' : ''}`} 
          onClick={() => setViewMode('sf2')}
        >
          📝 Interactive SF2 Grid
        </button>
        {isAdmin && (
          <button 
            className={`attendance-tab ${viewMode === 'sf4' ? 'active-tab' : ''}`} 
            onClick={() => setViewMode('sf4')}
          >
            🏢 Admin SF4
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="attendance-filters card">
        <div className="filters-flex">
          {viewMode !== 'sf4' && (
            <div className="filter-group">
              <label>Select Section</label>
              <select value={selectedSectionId} onChange={e => setSelectedSectionId(e.target.value)}>
                <option value="" disabled>Select Section</option>
                {mySections.map(s => <option key={s.id} value={s.id}>{s.gradeLevel} - {s.name}</option>)}
              </select>
            </div>
          )}

          <div className="filter-group">
            <label>{viewMode === 'daily' ? 'Reporting Date' : 'Reporting Month'}</label>
            {viewMode === 'daily' ? (
              <input type="date" value={selectedDate} onChange={e => {
                if (!e.target.value) return;
                setSelectedDate(e.target.value);
                const monthStr = e.target.value.substring(0, 7);
                if (selectedMonth !== monthStr) setSelectedMonth(monthStr);
              }} />
            ) : (
              <input type="month" value={selectedMonth} onChange={e => {
                if (!e.target.value) return;
                setSelectedMonth(e.target.value);
                if (!selectedDate.startsWith(e.target.value)) {
                  setSelectedDate(`${e.target.value}-01`);
                }
              }} />
            )}
          </div>

          <div className="filter-group" style={{ flexGrow: 1 }}>
            <label>Holidays / Suspensions</label>
            <div>
              {canEdit ? (
                <button 
                  className="secondary-btn" 
                  onClick={() => setShowHolidayModal(true)}
                  style={{ padding: '0.6rem 1rem', background: 'white', border: '1px solid var(--gray-300)', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                >
                  Manage Dates ({allSuspendedDates.filter(sd => sd.date && sd.date.startsWith(selectedMonth)).length})
                </button>
              ) : (
                <span style={{ display: 'inline-block', padding: '0.6rem 1rem', background: '#f9fafb', border: '1px solid var(--gray-200)', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--gray-600)' }}>
                  {allSuspendedDates.filter(sd => sd.date && sd.date.startsWith(selectedMonth)).length} Suspension(s) Logged
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>Loading data...</div>
      ) : (
        <>
          {viewMode === 'daily' && renderDailyView()}
          {viewMode === 'sf2' && renderSF2Grid()}
          {viewMode === 'sf4' && renderSF4Summary()}
        </>
      )}

      {showHolidayModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Manage Holidays & Suspensions</h2>
              <button className="close-btn" onClick={() => setShowHolidayModal(false)}>&times;</button>
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
                  className="primary-btn"
                  onClick={() => {
                    if (holidayInput && !suspendedDates.some(sd => sd.date === holidayInput)) {
                      setSuspendedDates(prev => [...prev, { date: holidayInput, reason: holidayReasonInput || 'No reason provided' }].sort((a,b) => a.date.localeCompare(b.date)));
                      setHolidayInput('');
                      setHolidayReasonInput('');
                    }
                  }}
                  disabled={!holidayInput}
                  style={{ padding: '0 1.5rem' }}
                >
                  Add Date
                </button>
              </div>

              <div className="holiday-list" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {suspendedDates.filter(sd => sd.date && sd.date.startsWith(selectedMonth)).length === 0 ? (
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
                      {suspendedDates.filter(sd => sd.date && sd.date.startsWith(selectedMonth)).map(sd => {
                        const parts = sd.date.split('-');
                        const dateObj = new Date(parts[0], parseInt(parts[1])-1, parts[2]);
                        return (
                        <tr key={sd.date}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>{sd.reason}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              onClick={() => setSuspendedDates(prev => prev.filter(dt => dt.date !== sd.date))}
                              style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
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
              <button className="primary-btn" onClick={() => setShowHolidayModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTracker;
