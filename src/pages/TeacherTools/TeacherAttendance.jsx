import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePersonnel } from '../../context/PersonnelContext';
import { useAttendance } from '../../context/AttendanceContext';
import { useCalendar } from '../../context/CalendarContext';
import './TeacherAttendance.css';

const TeacherAttendance = () => {
  const { user } = useAuth();
  const { personnel } = usePersonnel();
  const { fetchTeacherAttendance, saveTeacherAttendanceBatch } = useAttendance();
  const { events } = useCalendar();

  const isAdmin = ['admin', 'system_admin'].includes(user?.role);

  // Filters teachers from personnel list
  const staffList = useMemo(() => {
    return (personnel || [])
      .filter(p => p.role === 'teacher')
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
  }, [personnel]);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'monthly'
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dirtyLogs, setDirtyLogs] = useState({}); // Key: "teacherId_date", Value: status
  const [remarks, setRemarks] = useState({}); // Key: "teacherId_date", Value: remark string

  // Fetch data on changes
  const loadAttendanceData = async () => {
    setLoading(true);
    const res = await fetchTeacherAttendance(selectedMonth);
    if (res.success) {
      setAttendanceLogs(res.data);
      
      // Initialize dirty states
      setDirtyLogs({});
      
      // Pre-fill remarks
      const remarksMap = {};
      res.data.forEach(log => {
        remarksMap[`${log.teacherId}_${log.date}`] = log.remarks || '';
      });
      setRemarks(remarksMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAttendanceData();
  }, [selectedMonth]);

  // Derived state: Map of logs by teacherId and date
  const logsMap = useMemo(() => {
    const map = {};
    attendanceLogs.forEach(log => {
      map[`${log.teacherId}_${log.date}`] = log.status;
    });
    return map;
  }, [attendanceLogs]);

  // Get days in selected month
  const daysArray = useMemo(() => {
    if (!selectedMonth || !selectedMonth.includes('-')) return [];
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const days = [];
    const calHolidays = (events || [])
      .filter(e => e.type === 'holiday')
      .map(e => e.date);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = calHolidays.includes(dateStr);
      days.push({
        dateStr,
        dayNum: d,
        isDisabled: isWeekend || isHoliday,
        isWeekend,
        isHoliday
      });
    }
    return days;
  }, [selectedMonth, events]);

  // Toggle status in grid
  const handleToggleStatus = (teacherId, dateStr, isDisabled) => {
    if (isDisabled || !isAdmin) return;

    const key = `${teacherId}_${dateStr}`;
    const currentStatus = dirtyLogs[key] || logsMap[key] || 'Present';

    let nextStatus = 'Present';
    if (currentStatus === 'Present') nextStatus = 'Absent';
    else if (currentStatus === 'Absent') nextStatus = 'Tardy';
    else if (currentStatus === 'Tardy') nextStatus = 'Present';

    setDirtyLogs(prev => ({
      ...prev,
      [key]: nextStatus
    }));
  };

  // Set status directly in daily view
  const handleSetDailyStatus = (teacherId, status) => {
    if (!isAdmin) return;
    const key = `${teacherId}_${selectedDate}`;
    setDirtyLogs(prev => ({
      ...prev,
      [key]: status
    }));
  };

  const handleRemarkChange = (teacherId, dateStr, value) => {
    const key = `${teacherId}_${dateStr}`;
    setRemarks(prev => ({
      ...prev,
      [key]: value
    }));
    // Mark as dirty
    if (!dirtyLogs[key]) {
      setDirtyLogs(prev => ({
        ...prev,
        [key]: logsMap[key] || 'Present'
      }));
    }
  };

  // Save changes to Firestore
  const handleSaveChanges = async () => {
    const updates = Object.keys(dirtyLogs).map(key => {
      const [teacherId, date] = key.split('_');
      return {
        teacherId,
        date,
        status: dirtyLogs[key],
        remarks: remarks[key] || ''
      };
    });

    if (updates.length === 0) return;

    setLoading(true);
    const res = await saveTeacherAttendanceBatch(selectedMonth, updates);
    if (res.success) {
      alert('Attendance saved successfully!');
      loadAttendanceData();
    } else {
      alert('Error saving attendance: ' + res.error);
      setLoading(false);
    }
  };

  // CSV Export helper
  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDailyCSV = () => {
    const headers = ['Employee ID', 'Name', 'Status', 'Remarks'];
    const rows = (isAdmin ? staffList : [user]).map(teacher => {
      const key = `${teacher.id}_${selectedDate}`;
      const status = dirtyLogs[key] || logsMap[key] || 'Present';
      const remarkVal = remarks[key] || '';
      return [
        `"${teacher.employeeId || 'N/A'}"`,
        `"${teacher.lastName}, ${teacher.firstName}"`,
        `"${status}"`,
        `"${remarkVal.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadCSV(csvContent, `Teacher_Attendance_${selectedDate}.csv`);
  };

  const handleExportMonthlyCSV = () => {
    const headers = ['Employee ID', 'Teacher Name'];
    daysArray.forEach(d => headers.push(`Day ${d.dayNum}`));
    headers.push('Total Present', 'Total Absent', 'Total Tardy');

    const list = isAdmin ? staffList : [user];
    const rows = list.map(teacher => {
      let present = 0;
      let absent = 0;
      let tardy = 0;

      const dailyStatuses = daysArray.map(day => {
        if (day.isDisabled) return '';
        const key = `${teacher.id}_${day.dateStr}`;
        const status = dirtyLogs[key] || logsMap[key] || 'Present';
        if (status === 'Present') present++;
        else if (status === 'Absent') absent++;
        else if (status === 'Tardy') {
          tardy++;
          present++; // Tardy is present
        }
        return status;
      });

      return [
        `"${teacher.employeeId || 'N/A'}"`,
        `"${teacher.lastName}, ${teacher.firstName}"`,
        ...dailyStatuses,
        present,
        absent,
        tardy
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadCSV(csvContent, `Teacher_Attendance_Monthly_${selectedMonth}.csv`);
  };

  const handleExportReportCSV = () => {
    const headers = ['Employee ID', 'Name', 'Total Present', 'Total Absent', 'Total Tardy', 'Attendance Rate %'];
    const list = isAdmin ? staffList : [user];
    const rows = list.map(teacher => {
      let present = 0;
      let absent = 0;
      let tardy = 0;

      daysArray.forEach(day => {
        if (day.isDisabled) return;
        const key = `${teacher.id}_${day.dateStr}`;
        const status = dirtyLogs[key] || logsMap[key] || 'Present';
        if (status === 'Present') present++;
        else if (status === 'Absent') absent++;
        else if (status === 'Tardy') {
          tardy++;
          present++;
        }
      });

      const activeDays = daysArray.filter(d => !d.isDisabled).length;
      const pct = activeDays > 0 ? ((present / activeDays) * 100).toFixed(1) : '0.0';

      return [
        `"${teacher.employeeId || 'N/A'}"`,
        `"${teacher.lastName}, ${teacher.firstName}"`,
        present,
        absent,
        tardy,
        `"${pct}%"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadCSV(csvContent, `Consolidated_Teacher_Attendance_${selectedMonth}.csv`);
  };

  // Calculate statistics for teacher view or admin summaries
  const stats = useMemo(() => {
    const teacherId = user?.uid;
    let present = 0;
    let absent = 0;
    let tardy = 0;

    daysArray.forEach(d => {
      if (d.isDisabled) return;
      const key = `${teacherId}_${d.dateStr}`;
      const status = dirtyLogs[key] || logsMap[key] || 'Present';
      if (status === 'Present') present++;
      else if (status === 'Absent') absent++;
      else if (status === 'Tardy') {
        tardy++;
        present++; // Tardy means they are still present
      }
    });

    const activeDays = daysArray.filter(d => !d.isDisabled).length;

    return { present, absent, tardy, activeDays };
  }, [daysArray, logsMap, dirtyLogs, user]);

  const hasUnsavedChanges = Object.keys(dirtyLogs).length > 0;

  return (
    <div className="teacher-attendance-page">
      <div className="page-header">
        <div>
          <h1>{isAdmin ? 'Teacher Attendance Tracker' : 'My Attendance Record'}</h1>
          <p>
            {isAdmin 
              ? 'Manage, track, and log attendance details for teachers and school staff.'
              : 'Review your attendance, tardiness, and logs for the current session.'}
          </p>
        </div>
        {isAdmin && hasUnsavedChanges && (
          <button 
            className="primary-btn save-btn" 
            onClick={handleSaveChanges} 
            disabled={loading}
          >
            Save Changes ({Object.keys(dirtyLogs).length})
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="attendance-tabs">
        <button 
          className={`tab-btn ${viewMode === 'daily' ? 'active' : ''}`} 
          onClick={() => setViewMode('daily')}
        >
          📅 Daily Log Sheet
        </button>
        <button 
          className={`tab-btn ${viewMode === 'monthly' ? 'active' : ''}`} 
          onClick={() => setViewMode('monthly')}
        >
          📊 Monthly Grid View
        </button>
        <button 
          className={`tab-btn ${viewMode === 'report' ? 'active' : ''}`} 
          onClick={() => setViewMode('report')}
        >
          📋 Consolidated Report
        </button>
      </div>

      {/* Configuration Header */}
      <div className="attendance-config-card card">
        <div className="config-form-group">
          {viewMode === 'daily' ? (
            <>
              <label>Select Date:</label>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={e => {
                  setSelectedDate(e.target.value);
                  // Ensure month syncs
                  const ym = e.target.value.substring(0, 7);
                  if (ym !== selectedMonth) setSelectedMonth(ym);
                }} 
              />
            </>
          ) : (
            <>
              <label>Select Month:</label>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)} 
              />
            </>
          )}
        </div>

        {!isAdmin && (
          <div className="personal-stats">
            <div className="stat-badge present">Present: <strong>{stats.present}</strong></div>
            <div className="stat-badge absent">Absent: <strong>{stats.absent}</strong></div>
            <div className="stat-badge tardy">Tardy: <strong>{stats.tardy}</strong></div>
            <div className="stat-badge total">Duty Days: <strong>{stats.activeDays}</strong></div>
          </div>
        )}
      </div>

      {loading && <div className="loading-spinner"></div>}

      {/* Content Section */}
      {!loading && (
        <div className="attendance-content">
          {viewMode === 'daily' ? (
            <div className="daily-view-container card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ margin: 0 }}>Daily Attendance: {selectedDate}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="secondary-btn" onClick={handleExportDailyCSV}>📥 Export CSV</button>
                  <button className="secondary-btn" onClick={() => window.print()}>🖨️ Print</button>
                </div>
              </div>
              <div className="table-responsive">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Employee ID</th>
                      <th style={{ textAlign: 'left' }}>Name</th>
                      <th>Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isAdmin ? (
                      staffList.length > 0 ? (
                        staffList.map(teacher => {
                          const key = `${teacher.id}_${selectedDate}`;
                          const status = dirtyLogs[key] || logsMap[key] || 'Present';
                          const remarkVal = remarks[key] || '';
                          
                          return (
                            <tr key={teacher.id}>
                              <td style={{ fontWeight: 600 }}>{teacher.employeeId || 'N/A'}</td>
                              <td>{teacher.lastName}, {teacher.firstName}</td>
                              <td>
                                <div className="status-button-group">
                                  <button 
                                    className={`status-btn present ${status === 'Present' ? 'active' : ''}`}
                                    onClick={() => handleSetDailyStatus(teacher.id, 'Present')}
                                  >
                                    Present
                                  </button>
                                  <button 
                                    className={`status-btn absent ${status === 'Absent' ? 'active' : ''}`}
                                    onClick={() => handleSetDailyStatus(teacher.id, 'Absent')}
                                  >
                                    Absent
                                  </button>
                                  <button 
                                    className={`status-btn tardy ${status === 'Tardy' ? 'active' : ''}`}
                                    onClick={() => handleSetDailyStatus(teacher.id, 'Tardy')}
                                  >
                                    Tardy
                                  </button>
                                </div>
                              </td>
                              <td>
                                <input 
                                  type="text" 
                                  className="remark-input"
                                  placeholder="e.g. Sick Leave, Late entry" 
                                  value={remarkVal}
                                  onChange={e => handleRemarkChange(teacher.id, selectedDate, e.target.value)}
                                />
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan="4" style={{ textAlign: 'center' }}>No teachers found.</td></tr>
                      )
                    ) : (
                      // Teacher personal daily view
                      (() => {
                        const key = `${user?.uid}_${selectedDate}`;
                        const status = dirtyLogs[key] || logsMap[key] || 'Present';
                        const remarkVal = remarks[key] || '';
                        return (
                          <tr>
                            <td style={{ fontWeight: 600 }}>{user?.employeeId || 'N/A'}</td>
                            <td>{user?.lastName}, {user?.firstName}</td>
                            <td>
                              <span className={`status-badge ${status.toLowerCase()}`}>
                                {status}
                              </span>
                            </td>
                            <td>{remarkVal || 'No remarks'}</td>
                          </tr>
                        );
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : viewMode === 'monthly' ? (
            <div className="monthly-view-container card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ margin: 0 }}>Monthly Grid View ({selectedMonth})</h3>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button className="secondary-btn" onClick={handleExportMonthlyCSV}>📥 Export CSV</button>
                  <button className="secondary-btn" onClick={() => window.print()}>🖨️ Print</button>
                  {isAdmin && (
                    <span className="info-pill">
                      💡 Click cells to toggle: Present (Blank) ➡️ Absent (X) ➡️ Tardy (T)
                    </span>
                  )}
                </div>
              </div>
              <div className="table-responsive grid-wrapper">
                <table className="monthly-grid-table">
                  <thead>
                    <tr>
                      <th className="sticky-col col-employee-id">Employee ID</th>
                      <th className="sticky-col col-name">Teacher Name</th>
                      {daysArray.map(d => (
                        <th 
                          key={d.dateStr} 
                          className={`col-day ${d.isWeekend ? 'weekend' : ''} ${d.isHoliday ? 'holiday' : ''}`}
                          title={d.isHoliday ? 'Holiday / Calendar Event' : ''}
                        >
                          {d.dayNum}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isAdmin ? (
                      staffList.length > 0 ? (
                        staffList.map(teacher => (
                          <tr key={teacher.id}>
                            <td className="sticky-col col-employee-id" style={{ fontWeight: 600 }}>{teacher.employeeId || 'N/A'}</td>
                            <td className="sticky-col col-name">{teacher.lastName}, {teacher.firstName}</td>
                            {daysArray.map(day => {
                              const key = `${teacher.id}_${day.dateStr}`;
                              const status = dirtyLogs[key] || logsMap[key] || 'Present';
                              
                              let display = '';
                              let cellClass = '';
                              if (status === 'Absent') {
                                display = 'X';
                                cellClass = 'absent';
                              } else if (status === 'Tardy') {
                                display = 'T';
                                cellClass = 'tardy';
                              }

                              return (
                                <td 
                                  key={day.dateStr}
                                  className={`grid-cell ${day.isDisabled ? 'disabled' : ''} ${cellClass}`}
                                  onClick={() => handleToggleStatus(teacher.id, day.dateStr, day.isDisabled)}
                                >
                                  {display}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan={daysArray.length + 2} style={{ textAlign: 'center' }}>No teachers found.</td></tr>
                      )
                    ) : (
                      // Teacher personal row
                      <tr>
                        <td className="sticky-col col-employee-id" style={{ fontWeight: 600 }}>{user?.employeeId || 'N/A'}</td>
                        <td className="sticky-col col-name">{user?.lastName}, {user?.firstName}</td>
                        {daysArray.map(day => {
                          const key = `${user?.uid}_${day.dateStr}`;
                          const status = dirtyLogs[key] || logsMap[key] || 'Present';
                          
                          let display = '';
                          let cellClass = '';
                          if (status === 'Absent') {
                            display = 'X';
                            cellClass = 'absent';
                          } else if (status === 'Tardy') {
                            display = 'T';
                            cellClass = 'tardy';
                          }

                          return (
                            <td 
                              key={day.dateStr}
                              className={`grid-cell ${day.isDisabled ? 'disabled' : ''} ${cellClass} readonly`}
                            >
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // Consolidated report view
            <div className="monthly-view-container card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ margin: 0 }}>Consolidated Monthly Report ({selectedMonth})</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="secondary-btn" onClick={handleExportReportCSV}>📥 Export Report CSV</button>
                  <button className="secondary-btn" onClick={() => window.print()}>🖨️ Print</button>
                </div>
              </div>
              <div className="table-responsive">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Employee ID</th>
                      <th style={{ textAlign: 'left' }}>Name</th>
                      <th style={{ textAlign: 'center' }}>Total Present</th>
                      <th style={{ textAlign: 'center' }}>Total Absent</th>
                      <th style={{ textAlign: 'center' }}>Total Tardy</th>
                      <th style={{ textAlign: 'center' }}>Attendance Rate (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(isAdmin ? staffList : [user]).length > 0 ? (
                      (isAdmin ? staffList : [user]).map(teacher => {
                        let present = 0;
                        let absent = 0;
                        let tardy = 0;

                        daysArray.forEach(day => {
                          if (day.isDisabled) return;
                          const key = `${teacher.id}_${day.dateStr}`;
                          const status = dirtyLogs[key] || logsMap[key] || 'Present';
                          if (status === 'Present') present++;
                          else if (status === 'Absent') absent++;
                          else if (status === 'Tardy') {
                            tardy++;
                            present++;
                          }
                        });

                        const activeDays = daysArray.filter(d => !d.isDisabled).length;
                        const pct = activeDays > 0 ? ((present / activeDays) * 100).toFixed(1) : '0.0';

                        return (
                          <tr key={teacher.id}>
                            <td style={{ fontWeight: 600 }}>{teacher.employeeId || 'N/A'}</td>
                            <td>{teacher.lastName}, {teacher.firstName}</td>
                            <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--color-success)' }}>{present}</td>
                            <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--color-danger)' }}>{absent}</td>
                            <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--color-warning)' }}>{tardy}</td>
                            <td style={{ textAlign: 'center', fontWeight: '700' }}>{pct}%</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan="6" style={{ textAlign: 'center' }}>No teachers found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherAttendance;
