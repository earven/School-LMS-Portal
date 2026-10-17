import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSections } from '../../context/SectionContext';
import { useStudents } from '../../context/StudentContext';
import { useAttendance } from '../../context/AttendanceContext';
import { useCalendar } from '../../context/CalendarContext';
import { useSettings } from '../../context/SettingsContext';
import { generateSF2Excel } from '../../utils/sf2Generator';
import { generateSF4Excel } from '../../utils/sf4Generator';

import DailyAttendanceView from './AttendanceComponents/DailyAttendanceView';
import SF2MonthlyGrid from './AttendanceComponents/SF2MonthlyGrid';
import SF4SchoolReport from './AttendanceComponents/SF4SchoolReport';
import AttendanceHolidayModal from './AttendanceComponents/AttendanceHolidayModal';
import HomeVisitationModal from './AttendanceComponents/HomeVisitationModal';
import { useAttendanceSession } from '../../hooks/useAttendanceSession';

import './AttendanceTracker.css';

const AttendanceTracker = () => {
  const { user } = useAuth();
  const { sections } = useSections();
  const { students, updateStudent } = useStudents();
  const { fetchAttendance, fetchSchoolAttendance, saveBatchAttendance } = useAttendance();
  const { events } = useCalendar();
  const { settings, isReadOnly, sessionAcademicYear } = useSettings();

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
  const [classesStartDate, setClassesStartDate] = useState('');

  // Auto-initialize classesStartDate when selectedMonth changes
  useEffect(() => {
    if (selectedMonth && selectedMonth.includes('-')) {
      setClassesStartDate(`${selectedMonth}-01`);
    }
  }, [selectedMonth]);

  const storageKey = useMemo(() => {
    return `attendance_suspended_dates_${settings?.schoolId || 'default'}`;
  }, [settings?.schoolId]);

  const [suspendedDates, setSuspendedDates] = useState(() => {
    try {
      const saved = localStorage.getItem(`attendance_suspended_dates_${settings?.schoolId || 'default'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const updateSuspendedDates = useCallback((newDatesOrFn) => {
    setSuspendedDates(prev => {
      const updated = typeof newDatesOrFn === 'function' ? newDatesOrFn(prev) : newDatesOrFn;
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save suspended dates to localStorage", e);
      }
      return updated;
    });
  }, [storageKey]);

  // Modals state
  const [selectedHomeVisitAlert, setSelectedHomeVisitAlert] = useState(null);
  const [showHolidayModal, setShowHolidayModal] = useState(false);

  const allSuspendedDates = useMemo(() => {
    const manual = suspendedDates.map(sd => ({ date: sd.date, reason: sd.reason, type: sd.type || 'holiday' }));
    const calHolidays = (events || [])
      .filter(e => e.type === 'holiday')
      .map(e => ({ date: e.date, reason: `Calendar: ${e.title}`, type: 'holiday' }));
    
    const merged = [...manual];
    calHolidays.forEach(ch => {
      if (!merged.find(m => m.date === ch.date)) merged.push(ch);
    });
    return merged;
  }, [suspendedDates, events]);

  // Auto-calculate weekdays when month/start date/suspended dates changes
  useEffect(() => {
    if (!selectedMonth || !selectedMonth.includes('-')) return;
    const [year, month] = selectedMonth.split('-');
    if (!year || !month || isNaN(parseInt(month, 10))) return;

    const daysInMonth = new Date(year, month, 0).getDate();
    let weekdays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${month}-${String(d).padStart(2, '0')}`;
      const day = new Date(year, parseInt(month, 10) - 1, d).getDay();
      
      const isClassDay = dateStr >= classesStartDate && !allSuspendedDates.some(sd => sd.date === dateStr);
      if (day !== 0 && day !== 6 && isClassDay) weekdays++;
    }
    setManualDaysOfClasses(weekdays);
  }, [selectedMonth, allSuspendedDates, classesStartDate]);

  const [schoolAttendanceLogs, setSchoolAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('tab') || searchParams.get('mode') || 'daily';
  const [viewMode, setViewMode] = useState(initialMode); // 'daily', 'sf2', 'sf4'
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab') || searchParams.get('mode');
    if (tabParam && ['daily', 'sf2', 'sf4'].includes(tabParam)) {
      setViewMode(tabParam);
    }
  }, [searchParams]);

  const activeSection = mySections.find(s => s.id === selectedSectionId);
  const isAdviser = activeSection && activeSection.adviserId === user?.uid;
  const canEdit = isAdviser && !isReadOnly;

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

  const {
    monthlyState,
    remarksState,
    dirtyCells,
    syncState,
    toggleStatus: handleStatusToggle,
    cycleStatus: handleCycleStatus,
    updateRemark: handleRemarkChange,
    markAll: sessionMarkAll,
    saveSession
  } = useAttendanceSession({
    sectionId: selectedSectionId,
    selectedMonth,
    selectedDate,
    students: sectionStudents,
    onSaveBatch: saveBatchAttendance
  });

  const loadMonthData = useCallback(async () => {
    if (!selectedSectionId || !selectedMonth) return;
    setLoading(true);
    const res = await fetchAttendance(selectedSectionId, selectedMonth);
    if (res.success) {
      const newState = {};
      const newRemarks = {};
      res.data.forEach(log => {
        if (!newState[log.studentId]) newState[log.studentId] = {};
        if (!newRemarks[log.studentId]) newRemarks[log.studentId] = {};
        newState[log.studentId][log.date] = log.status;
        newRemarks[log.studentId][log.date] = log.remarks || '';
      });
      syncState(newState, newRemarks);
    }
    setLoading(false);
  }, [selectedSectionId, selectedMonth, fetchAttendance, syncState]);

  const loadSchoolData = useCallback(async () => {
    setLoading(true);
    const res = await fetchSchoolAttendance(selectedMonth);
    if (res.success) {
      setSchoolAttendanceLogs(res.data);
    }
    setLoading(false);
  }, [selectedMonth, fetchSchoolAttendance]);

  useEffect(() => {
    if (viewMode === 'sf4') {
      loadSchoolData();
    } else {
      loadMonthData();
    }
  }, [viewMode, loadMonthData, loadSchoolData]);

  const handleCellClick = (studentId, dateStr, isDisabled) => {
    if (isDisabled || !canEdit) return;
    handleCycleStatus(studentId, dateStr);
  };

  const handleMarkAll = (statusToSet = 'Present') => {
    if (!canEdit || sectionStudents.length === 0) return;
    sessionMarkAll(statusToSet, selectedDate);
    showToast(`Marked all ${sectionStudents.length} learners as ${statusToSet}. Click "Save Changes" to apply.`, 'info');
  };

  const saveBatch = async () => {
    setLoading(true);
    const res = await saveSession();
    if (res?.success) {
      showToast("Attendance saved successfully!", "success");
      loadMonthData();
    } else if (res?.error) {
      showToast("Failed to save: " + res.error, "error");
    }
    setLoading(false);
  };

  const handleStatusChange = async (student, newStatus) => {
    if (!canEdit) return;
    try {
      await updateStudent({ ...student, status: newStatus });
      showToast(`Updated status for ${student.firstName} ${student.lastName}`, "success");
    } catch {
      showToast("Failed to update student status.", "error");
    }
  };

  // --- Early Warning Alerts Calculation ---
  const studentAlerts = useMemo(() => {
    if (viewMode !== 'sf2' || !activeSection) return [];
    
    const alerts = [];
    const [year, month] = selectedMonth.split('-');
    const daysInMonthObj = new Date(year, month, 0);
    const numDays = daysInMonthObj.getDate();
    
    const validDates = [];
    for (let d = 1; d <= numDays; d++) {
      const dateStr = `${year}-${month}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, parseInt(month, 10) - 1, d).getDay();
      const isClassDay = dateStr >= classesStartDate && !allSuspendedDates.some(sd => sd.date === dateStr);
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && isClassDay) {
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
  }, [viewMode, activeSection, sectionStudents, monthlyState, selectedMonth, allSuspendedDates, classesStartDate]);

  // --- Calculations for SF2 Summary ---
  const sf2Summary = useMemo(() => {
    if (viewMode !== 'sf2' || !activeSection) return null;
    
    const daysOfClasses = Number(manualDaysOfClasses) || 0;
    const boys = sectionStudents.filter(s => s.gender === 'Male');
    const girls = sectionStudents.filter(s => s.gender === 'Female');
    
    let maleTotalAbsences = 0;
    let femaleTotalAbsences = 0;
    sectionStudents.forEach(s => {
      const stuData = monthlyState[s.id] || {};
      Object.keys(stuData).forEach(dateStr => {
        const isClassDay = dateStr >= classesStartDate && !allSuspendedDates.some(sd => sd.date === dateStr);
        if (isClassDay && stuData[dateStr] === 'Absent') {
          if (s.gender === 'Male') maleTotalAbsences++;
          else femaleTotalAbsences++;
        }
      });
    });

    const maleADA = daysOfClasses > 0 ? ((boys.length * daysOfClasses) - maleTotalAbsences) / daysOfClasses : 0;
    const femaleADA = daysOfClasses > 0 ? ((girls.length * daysOfClasses) - femaleTotalAbsences) / daysOfClasses : 0;
    const totalADA = maleADA + femaleADA;

    const consecutive5Days = studentAlerts.filter(a => a.maxConsecutive >= 5).length;
    const droppedOut = sectionStudents.filter(s => s.status === 'Dropped Out').length;
    const transferredOut = sectionStudents.filter(s => s.status === 'Transferred Out').length;
    const transferredIn = sectionStudents.filter(s => s.status === 'Transferred In').length;

    return {
      daysOfClasses,
      enrolledFriday: boys.length + girls.length,
      enrolledFridayMale: boys.length,
      enrolledFridayFemale: girls.length,
      enrolledFridayTotal: boys.length + girls.length,
      lateEnrolled: 0,
      registeredEnd: boys.length + girls.length,
      maleRegistered: boys.length,
      femaleRegistered: girls.length,
      totalRegistered: boys.length + girls.length,
      pctEnrolled: '100.0', 
      maleADA: (boys.length > 0 ? (boys.length * daysOfClasses - maleTotalAbsences) / daysOfClasses : 0).toFixed(2),
      femaleADA: (girls.length > 0 ? (girls.length * daysOfClasses - femaleTotalAbsences) / daysOfClasses : 0).toFixed(2),
      totalADA: totalADA.toFixed(2),
      malePct: boys.length > 0 ? (((boys.length * daysOfClasses - maleTotalAbsences) / (boys.length * daysOfClasses)) * 100).toFixed(1) : '0.0',
      femalePct: girls.length > 0 ? (((girls.length * daysOfClasses - femaleTotalAbsences) / (girls.length * daysOfClasses)) * 100).toFixed(1) : '0.0',
      totalPct: (boys.length + girls.length) > 0 ? ((((boys.length + girls.length) * daysOfClasses - (maleTotalAbsences + femaleTotalAbsences)) / ((boys.length + girls.length) * daysOfClasses)) * 100).toFixed(1) : '0.0',
      consecutive5Days,
      droppedOut,
      transferredOut,
      transferredIn
    };
  }, [viewMode, activeSection, sectionStudents, monthlyState, manualDaysOfClasses, studentAlerts, classesStartDate, allSuspendedDates]);

  // --- Calculations for SF4 Summary ---
  const sf4Summary = useMemo(() => {
    return sections.map(sec => {
      const secStudents = students.filter(s => s.sectionId === sec.id);
      const secLogs = schoolAttendanceLogs.filter(l => l.sectionId === sec.id);
      
      const boys = secStudents.filter(s => s.gender === 'Male');
      const girls = secStudents.filter(s => s.gender === 'Female');
      
      const daysOfClasses = Number(manualDaysOfClasses) || 0;

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
  }, [sections, students, schoolAttendanceLogs, manualDaysOfClasses]);

  const handleDownloadOfficialSF2 = async () => {
    if (!sf2Summary) return;
    try {
      const response = await fetch('/sf2_template.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      
      const boys = sectionStudents.filter(s => s.gender === 'Male');
      const girls = sectionStudents.filter(s => s.gender === 'Female');
      
      const buffer = await generateSF2Excel({
        templateBuffer: arrayBuffer,
        sectionName: activeSection.name,
        gradeLevel: activeSection.gradeLevel,
        schoolName: settings.schoolName || 'School',
        schoolYear: sessionAcademicYear || settings.academicYear || '',
        selectedMonth,
        suspendedDates: allSuspendedDates,
        classesStartDate,
        boys,
        girls,
        monthlyState,
        daysOfClasses: sf2Summary.daysOfClasses,
        sf2Summary,
        adviserName: `${user?.firstName || ''} ${user?.lastName || ''}`
      });
      
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SF2_${activeSection.gradeLevel}_${activeSection.name}_${selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating SF2 Excel:", error);
      showToast("Failed to generate SF2 Excel file. Please ensure sf2_template.xlsx exists in the public folder.", "error");
    }
  };

  const handleDownloadOfficialSF4 = async () => {
    try {
      const response = await fetch('/sf4_template_final.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      
      const buffer = await generateSF4Excel({
        templateBuffer: arrayBuffer,
        schoolId: settings.schoolId || '',
        schoolName: settings.schoolName || 'School',
        schoolYear: sessionAcademicYear || settings.academicYear || '',
        region: settings.region || '',
        division: settings.division || '',
        selectedMonth,
        sf4Data: sf4Summary
      });
      
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SF4_${settings.schoolName || 'School'}_${selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating SF4 Excel:", error);
      showToast("Failed to generate SF4 Excel file. Please ensure sf4_template_final.xlsx exists in the public folder.", "error");
    }
  };

  return (
    <div className="attendance-tracker-container">
      <div className="attendance-header">
        <div>
          <h1>Student Attendance & SF2</h1>
          <p>Track daily classroom attendance, view monthly logs, and generate official DepEd SF2/SF4 Excel reports.</p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="attendance-tabs">
        <button 
          type="button"
          className={`attendance-tab ${viewMode === 'daily' ? 'active-tab' : ''}`} 
          onClick={() => setViewMode('daily')}
        >
          📱 Daily Classroom View
        </button>
        <button 
          type="button"
          className={`attendance-tab ${viewMode === 'sf2' ? 'active-tab' : ''}`} 
          onClick={() => setViewMode('sf2')}
        >
          📝 Interactive SF2 Grid
        </button>
        {isAdmin && (
          <button 
            type="button"
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
                  type="button"
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
          {viewMode === 'daily' && (
            <DailyAttendanceView
              activeSection={activeSection}
              selectedDate={selectedDate}
              sectionStudents={sectionStudents}
              allSuspendedDates={allSuspendedDates}
              monthlyState={monthlyState}
              remarksState={remarksState}
              dirtyCells={dirtyCells}
              loading={loading}
              canEdit={canEdit}
              onStatusToggle={handleStatusToggle}
              onRemarkChange={handleRemarkChange}
              onMarkAll={handleMarkAll}
              onSaveBatch={saveBatch}
            />
          )}

          {viewMode === 'sf2' && (
            <SF2MonthlyGrid
              activeSection={activeSection}
              selectedMonth={selectedMonth}
              sectionStudents={sectionStudents}
              allSuspendedDates={allSuspendedDates}
              classesStartDate={classesStartDate}
              onClassesStartDateChange={setClassesStartDate}
              manualDaysOfClasses={manualDaysOfClasses}
              onManualDaysOfClassesChange={setManualDaysOfClasses}
              monthlyState={monthlyState}
              dirtyCells={dirtyCells}
              loading={loading}
              canEdit={canEdit}
              studentAlerts={studentAlerts}
              sf2Summary={sf2Summary}
              onCellClick={handleCellClick}
              onStatusChange={handleStatusChange}
              onSaveBatch={saveBatch}
              onDownloadSF2={handleDownloadOfficialSF2}
              onOpenHomeVisit={setSelectedHomeVisitAlert}
            />
          )}

          {viewMode === 'sf4' && (
            <SF4SchoolReport
              selectedMonth={selectedMonth}
              manualDaysOfClasses={manualDaysOfClasses}
              onManualDaysOfClassesChange={setManualDaysOfClasses}
              sf4Data={sf4Summary}
              onDownloadSF4={handleDownloadOfficialSF4}
            />
          )}
        </>
      )}

      {/* Holiday / Suspension Dates Modal */}
      <AttendanceHolidayModal
        isOpen={showHolidayModal}
        onClose={() => setShowHolidayModal(false)}
        selectedMonth={selectedMonth}
        suspendedDates={suspendedDates}
        onAddDate={(date, reason) => {
          if (date && !suspendedDates.some(sd => sd.date === date)) {
            updateSuspendedDates(prev => [...prev, { date, reason: reason || 'No reason provided' }].sort((a,b) => a.date.localeCompare(b.date)));
            showToast(`Added suspension for ${date}`, 'info');
          }
        }}
        onRemoveDate={(date) => {
          updateSuspendedDates(prev => prev.filter(dt => dt.date !== date));
          showToast(`Removed suspension for ${date}`, 'info');
        }}
      />

      {/* Home Visitation Form Modal */}
      <HomeVisitationModal
        isOpen={!!selectedHomeVisitAlert}
        onClose={() => setSelectedHomeVisitAlert(null)}
        alert={selectedHomeVisitAlert}
        activeSection={activeSection}
        settings={settings}
        user={user}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`attendance-toast ${toast.type}`}>
          {toast.type === 'success' && '✅ '}
          {toast.type === 'error' && '❌ '}
          {toast.type === 'info' && 'ℹ️ '}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default AttendanceTracker;
