import React, { useMemo, useState } from 'react';
import { useTeachingLoad } from '../../context/TeachingLoadContext';
import { usePersonnel } from '../../context/PersonnelContext';
import { useSections } from '../../context/SectionContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { SUBJECT_SPECIALIZATIONS } from '../../components/PersonnelFormFields';
import { getDisplayName, normalizePersonnelRecord } from '../../utils/personnelName';
import CalendarScheduleView, { parseSchedule, formatTime, hasTimeOverlap } from '../../components/CalendarScheduleView';
import './TeachingLoadPage.css';

const GRADE_LEVELS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

const SUBJECT_COLORS = {
  'Mathematics': '#2563eb',
  'Math': '#2563eb',
  'Science': '#059669',
  'English': '#7c3aed',
  'Filipino': '#d97706',
  'Araling Panlipunan': '#ea580c',
  'AP': '#ea580c',
  'MAPEH': '#db2777',
  'Music': '#db2777',
  'Arts': '#db2777',
  'Physical Education': '#db2777',
  'Health': '#db2777',
  'TLE': '#0d9488',
  'TVL': '#0d9488',
  'Technology and Livelihood Education': '#0d9488',
  'Edukasyon sa Pagpapakatao': '#d97706',
  'EsP': '#d97706',
  'Values Education': '#d97706',
  'Homeroom': '#475569',
};

const getSubjectColor = (subject) => {
  if (!subject) return '#64748b';
  for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
    if (subject.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#475569';
};

const defaultSchedule = {
  days: [],
  startTime: '',
  endTime: ''
};

const getEmptyForm = () => ({
  teacherId: '',
  subject: '',
  gradeLevel: 'Grade 7',
  room: '',
  assignments: [
    {
      id: Date.now(),
      sectionId: '',
      schedule: JSON.parse(JSON.stringify(defaultSchedule))
    }
  ]
});

const calculateLoadMinutes = (schedule) => {
  const parsed = parseSchedule(schedule);
  if (!parsed.days || parsed.days.length === 0 || !parsed.startTime || !parsed.endTime) return 0;
  const [sh, sm] = parsed.startTime.split(':').map(Number);
  const [eh, em] = parsed.endTime.split(':').map(Number);
  const duration = (eh * 60 + em) - (sh * 60 + sm);
  return duration > 0 ? duration * parsed.days.length : 0;
};

const renderSchedule = (sched) => {
  if (!sched) return '—';
  if (typeof sched === 'string') return sched;
  
  const parsed = parseSchedule(sched);
  if (!parsed.days || parsed.days.length === 0) return '—';
  
  const dayStr = parsed.days.map(d => d.substring(0, 3)).join(', ');
  return (
    <div className="schedule-compact-display">
      <div className="slot-day">{dayStr}</div>
      <div className="slot-time">{formatTime(parsed.startTime)} to {formatTime(parsed.endTime)}</div>
    </div>
  );
};

const exportTeacherScheduleToICS = (teacherName, teacherLoads, schoolName = 'School LMS') => {
  const dayToIcal = {
    'Monday': 'MO',
    'Tuesday': 'TU',
    'Wednesday': 'WE',
    'Thursday': 'TH',
    'Friday': 'FR',
    'Saturday': 'SA',
    'Sunday': 'SU'
  };

  const dayIndexMap = {
    'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0
  };

  let events = [];
  const now = new Date();
  const formatIcalDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  teacherLoads.forEach((load, idx) => {
    const sched = parseSchedule(load.schedule);
    if (!sched.days || sched.days.length === 0 || !sched.startTime || !sched.endTime) return;

    const [startH, startM] = sched.startTime.split(':').map(Number);
    const [endH, endM] = sched.endTime.split(':').map(Number);
    const byDayList = sched.days.map(d => dayToIcal[d]).filter(Boolean).join(',');

    const firstDayStr = sched.days[0];
    const targetDayIdx = dayIndexMap[firstDayStr] ?? 1;
    const currentDayIdx = now.getDay();
    let diffDays = (targetDayIdx - currentDayIdx + 7) % 7;
    if (diffDays === 0) diffDays = 7;

    const startDate = new Date(now);
    startDate.setDate(now.getDate() + diffDays);
    startDate.setHours(startH, startM, 0, 0);

    const endDate = new Date(now);
    endDate.setDate(now.getDate() + diffDays);
    endDate.setHours(endH, endM, 0, 0);

    const pad = (n) => String(n).padStart(2, '0');
    const dtStartLocal = `${startDate.getFullYear()}${pad(startDate.getMonth()+1)}${pad(startDate.getDate())}T${pad(startH)}${pad(startM)}00`;
    const dtEndLocal = `${endDate.getFullYear()}${pad(endDate.getMonth()+1)}${pad(endDate.getDate())}T${pad(endH)}${pad(endM)}00`;

    const summary = `${load.subject} - ${load.sectionName || load.gradeLevel}`;
    const description = `Teacher: ${teacherName}\\nSection: ${load.sectionName || 'N/A'}\\nGrade: ${load.gradeLevel}\\nRoom: ${load.room || 'Regular Classroom'}\\nSchool: ${schoolName}`;
    const location = load.room || 'Classroom';

    events.push([
      'BEGIN:VEVENT',
      `UID:load-${load.id || idx}-${Date.now()}@school-lms`,
      `DTSTAMP:${formatIcalDate(now)}`,
      `DTSTART:${dtStartLocal}`,
      `DTEND:${dtEndLocal}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byDayList}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    ].join('\r\n'));
  });

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//School LMS Portal//Class Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${teacherName} - Class Schedule`,
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${teacherName.replace(/\s+/g, '_')}_Class_Schedule.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const TeachingLoadPage = () => {
  const { user } = useAuth();
  const { personnel } = usePersonnel();
  const { sections } = useSections();
  const { settings } = useSettings();
  const { loads, allLoads, breaks, loading, error, academicYear, addLoad, updateLoad, deleteLoad, copyLoads, addBreak, deleteBreak } = useTeachingLoad();

  const isAdmin = ['admin', 'system_admin'].includes(user?.role);
  const teachers = useMemo(
    () => personnel.filter((p) => p.role === 'teacher').map((p) => normalizePersonnelRecord(p)),
    [personnel]
  );

  const myAdvisorySections = useMemo(() => {
    return sections.filter(s => s.adviserId === user?.uid);
  }, [sections, user]);
  
  const isAdviser = myAdvisorySections.length > 0;
  
  const [activeTab, setActiveTab] = useState(isAdmin ? 'master' : 'my_schedule');
  const [masterDay, setMasterDay] = useState('Monday');
  const [masterLevel, setMasterLevel] = useState('JHS');
  const [filterTeacher, setFilterTeacher] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGradeLevel, setFilterGradeLevel] = useState('all');
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(getEmptyForm);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyYear, setCopyYear] = useState('');
  const [showBreaksModal, setShowBreaksModal] = useState(false);
  const [breakForm, setBreakForm] = useState({ name: '', startTime: '', endTime: '' });

  // Print Report state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printTargetTeacher, setPrintTargetTeacher] = useState(null);

  // Toast message
  const [toast, setToast] = useState(null);
  const showToastMsg = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const availableYears = useMemo(() => {
    const years = new Set(allLoads.map((l) => l.academicYear).filter(Boolean));
    return Array.from(years).filter((y) => y !== academicYear).sort().reverse();
  }, [allLoads, academicYear]);

  const teacherNameById = useMemo(() => {
    const map = {};
    teachers.forEach((t) => {
      map[t.id] = getDisplayName(t);
    });
    return map;
  }, [teachers]);

  const filteredLoads = useMemo(() => {
    let list = [...loads];
    if (isAdmin && filterTeacher !== 'all') {
      list = list.filter((l) => l.teacherId === filterTeacher);
    }
    if (filterSubject !== 'all') {
      list = list.filter((l) => l.subject === filterSubject);
    }
    if (filterGradeLevel !== 'all') {
      list = list.filter((l) => l.gradeLevel === filterGradeLevel);
    }
    return list.sort((a, b) => {
      const timeA = parseSchedule(a.schedule)?.startTime || "25:00";
      const timeB = parseSchedule(b.schedule)?.startTime || "25:00";
      if (timeA !== timeB) return timeA.localeCompare(timeB);

      const nameA = (teacherNameById[a.teacherId] || '').toLowerCase();
      const nameB = (teacherNameById[b.teacherId] || '').toLowerCase();
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      return (a.subject || '').localeCompare(b.subject || '');
    });
  }, [loads, isAdmin, filterTeacher, filterSubject, filterGradeLevel, teacherNameById]);

  const loadsByTeacher = useMemo(() => {
    const grouped = {};
    filteredLoads.forEach((load) => {
      if (!grouped[load.teacherId]) grouped[load.teacherId] = [];
      grouped[load.teacherId].push(load);
    });
    return grouped;
  }, [filteredLoads]);

  const orderedSections = useMemo(() => {
    const gradeOrder = { 'Grade 7': 1, 'Grade 8': 2, 'Grade 9': 3, 'Grade 10': 4, 'Grade 11': 5, 'Grade 12': 6 };
    return [...sections].sort((a, b) => {
      const orderA = gradeOrder[a.gradeLevel] || 99;
      const orderB = gradeOrder[b.gradeLevel] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [sections]);

  // ── Compute Workload Analytics ──
  const workloadStats = useMemo(() => {
    const targetLoads = isAdmin 
      ? (filterTeacher !== 'all' ? loads.filter(l => l.teacherId === filterTeacher) : loads)
      : loads.filter(l => l.teacherId === user?.uid);

    let totalMins = 0;
    const uniqueSubjects = new Set();
    const uniqueSections = new Set();

    targetLoads.forEach(l => {
      totalMins += calculateLoadMinutes(l.schedule);
      if (l.subject) uniqueSubjects.add(l.subject);
      if (l.sectionId) uniqueSections.add(l.sectionId);
    });

    const hours = (totalMins / 60).toFixed(1);
    const isOverloaded = totalMins > 1800; // > 30 hrs/wk DepEd RA 4670 standard
    const isUnderloaded = totalMins > 0 && totalMins < 1200; // < 20 hrs/wk

    return {
      totalMinutes: totalMins,
      totalHours: hours,
      preparations: uniqueSubjects.size,
      sectionsCount: uniqueSections.size,
      totalAssignments: targetLoads.length,
      isOverloaded,
      isUnderloaded
    };
  }, [isAdmin, filterTeacher, loads, user]);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      ...getEmptyForm(),
      teacherId: isAdmin ? '' : user.uid,
    });
    setShowModal(true);
  };

  const openEdit = (load) => {
    setEditingId(load.id);
    setForm({
      teacherId: load.teacherId || '',
      subject: load.subject || '',
      gradeLevel: load.gradeLevel || 'Grade 7',
      room: load.room || '',
      assignments: [
        {
          id: load.id,
          sectionId: load.sectionId || '',
          schedule: parseSchedule(load.schedule)
        }
      ]
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updates = { [name]: value };
      if (name === 'gradeLevel') {
        updates.assignments = prev.assignments.map(a => ({ ...a, sectionId: '' }));
      }
      return { ...prev, ...updates };
    });
  };

  const saveLoad = async () => {
    const teacherId = isAdmin ? form.teacherId : user.uid;
    if (!teacherId || !form.subject || !form.gradeLevel) {
      showToastMsg('Please select a teacher, subject, and grade level.', 'error');
      return;
    }

    const conflictWarnings = [];
    const teacherName = teacherNameById[teacherId] || 'Teacher';

    for (let i = 0; i < form.assignments.length; i++) {
      const assignment = form.assignments[i];
      if (!assignment.schedule.startTime || !assignment.schedule.endTime || assignment.schedule.days.length === 0) continue;

      const checkOverlap = (existingLoad) => {
        if (!hasTimeOverlap(assignment.schedule, existingLoad.schedule)) return;
        
        if (existingLoad.teacherId === teacherId) {
          conflictWarnings.push(`- ${teacherName} is already scheduled for ${existingLoad.subject} during Schedule #${i + 1}.`);
        }
        
        if (assignment.sectionId && existingLoad.sectionId === assignment.sectionId) {
          const section = sections.find(s => s.id === assignment.sectionId);
          const secName = section ? `${section.gradeLevel} - ${section.name}` : 'This section';
          conflictWarnings.push(`- ${secName} already has ${existingLoad.subject} scheduled during Schedule #${i + 1}.`);
        }
      };

      allLoads.forEach(existing => {
        if (editingId && existing.id === editingId) return;
        checkOverlap(existing);
      });
    }

    if (conflictWarnings.length > 0) {
      const uniqueWarnings = [...new Set(conflictWarnings)];
      const proceed = window.confirm(`Warning! Potential Schedule Conflicts:\n\n${uniqueWarnings.join('\n')}\n\nDo you want to save anyway?`);
      if (!proceed) return;
    }

    let allSuccess = true;
    for (const assignment of form.assignments) {
      const section = sections.find((s) => s.id === assignment.sectionId);
      const payload = {
        teacherId,
        teacherName: teacherNameById[teacherId] || '',
        subject: form.subject,
        gradeLevel: form.gradeLevel,
        room: form.room || '',
        sectionId: assignment.sectionId || '',
        sectionName: section?.name ? `${section.gradeLevel} - ${section.name}` : '',
        schedule: assignment.schedule,
      };

      const result = editingId
        ? await updateLoad(editingId, payload)
        : await addLoad(payload);

      if (!result.success) {
        allSuccess = false;
        showToastMsg(result.error || 'Unable to save teaching load.', 'error');
        break;
      }
    }

    if (allSuccess) {
      setShowModal(false);
      setForm(getEmptyForm());
      setEditingId(null);
      showToastMsg('Teaching load assignment saved successfully!', 'success');
    }
  };

  const handleCopy = async (e) => {
    e.preventDefault();
    if (!copyYear) return;
    const result = await copyLoads(copyYear);
    if (result.success) {
      setShowCopyModal(false);
      setCopyYear('');
      showToastMsg(`Successfully copied loads from School Year ${copyYear}!`, 'success');
    } else {
      showToastMsg(result.error || 'Unable to copy teaching loads.', 'error');
    }
  };

  const handleDelete = async (loadId) => {
    if (!window.confirm('Remove this teaching load entry?')) return;
    const result = await deleteLoad(loadId);
    if (result.success) {
      showToastMsg('Teaching load entry deleted.', 'success');
    } else {
      showToastMsg(result.error || 'Unable to delete teaching load.', 'error');
    }
  };

  const handleOpenPrintModal = (teacherId = null) => {
    setPrintTargetTeacher(teacherId);
    setShowPrintModal(true);
  };

  if (loading) {
    return <div className="teaching-load-page"><p>Loading teaching load...</p></div>;
  }

  if (error) {
    return <div className="teaching-load-page"><p className="error-text">{error}</p></div>;
  }

  return (
    <div className="teaching-load-page">
      {/* HEADER */}
      <div className="teaching-load-header no-print">
        <div>
          <h1>Teaching Load & Class Program</h1>
          <p className="subtitle">
            Subject assignments, schedules, and DepEd workload compliance for SY <strong>{academicYear}</strong>.
          </p>
        </div>
        <div className="header-actions-group">
          <button type="button" className="primary-btn" onClick={openAdd}>
            + Add Assignment
          </button>
          
          <button 
            type="button" 
            className="secondary-btn" 
            onClick={() => handleOpenPrintModal(isAdmin ? (filterTeacher !== 'all' ? filterTeacher : null) : user?.uid)}
            title="Print official DepEd Teacher Program or Class Program"
          >
            🖨️ Print Program
          </button>

          {!isAdmin && (
            <button 
              type="button" 
              className="secondary-btn" 
              onClick={() => {
                const myLoads = loads.filter(l => l.teacherId === user?.uid);
                if (myLoads.length === 0) {
                  showToastMsg('No schedule assignments found to export.', 'info');
                  return;
                }
                exportTeacherScheduleToICS(user?.fullName || 'My Schedule', myLoads, settings?.schoolName);
                showToastMsg('Exported schedule to .ICS! Open it to import to Google/Apple Calendar.', 'success');
              }}
              title="Download recurring schedule for Google Calendar / Apple Calendar"
            >
              📅 Export to Calendar
            </button>
          )}

          <button type="button" className="secondary-btn" onClick={() => setShowCopyModal(true)}>
            Copy From Year
          </button>
          {isAdmin && (
            <button type="button" className="secondary-btn" onClick={() => setShowBreaksModal(true)}>
              Manage Breaks
            </button>
          )}
        </div>
      </div>

      {/* DEPED WORKLOAD SUMMARY CARDS */}
      <div className="workload-summary-bar no-print">
        <div className="workload-card">
          <div className="wl-icon">⏱️</div>
          <div className="wl-info">
            <span className="wl-value">{workloadStats.totalHours} hrs</span>
            <span className="wl-label">Weekly Teaching Load ({workloadStats.totalMinutes} mins)</span>
          </div>
        </div>

        <div className="workload-card">
          <div className="wl-icon">📚</div>
          <div className="wl-info">
            <span className="wl-value">{workloadStats.preparations}</span>
            <span className="wl-label">Subject Preparations</span>
          </div>
        </div>

        <div className="workload-card">
          <div className="wl-icon">👥</div>
          <div className="wl-info">
            <span className="wl-value">{workloadStats.sectionsCount}</span>
            <span className="wl-label">Handled Sections</span>
          </div>
        </div>

        <div className={`workload-card compliance-card ${workloadStats.isOverloaded ? 'overloaded' : 'compliant'}`}>
          <div className="wl-icon">{workloadStats.isOverloaded ? '⚠️' : '✅'}</div>
          <div className="wl-info">
            <span className="wl-value">{workloadStats.isOverloaded ? 'Overloaded' : 'Compliant'}</span>
            <span className="wl-label">
              {workloadStats.isOverloaded 
                ? 'Exceeds 30 hrs/wk DepEd Limit (RA 4670)' 
                : 'Within Magna Carta 30 hrs/wk Limit'}
            </span>
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="tab-bar no-print" style={{ gap: '1rem', borderBottom: 'none', marginBottom: '16px' }}>
        {isAdmin && (
          <>
            <button className={`tab-btn ${activeTab === 'master' ? 'active' : ''}`} onClick={() => setActiveTab('master')}>
              Master Schedule (By Section)
            </button>
            <button className={`tab-btn ${activeTab === 'teacher' ? 'active' : ''}`} onClick={() => setActiveTab('teacher')}>
              By Teacher
            </button>
          </>
        )}
        {!isAdmin && (
          <>
            <button className={`tab-btn ${activeTab === 'my_schedule' ? 'active' : ''}`} onClick={() => setActiveTab('my_schedule')}>
              My Teaching Schedule
            </button>
            {isAdviser && (
              <button className={`tab-btn ${activeTab === 'my_advisory' ? 'active' : ''}`} onClick={() => setActiveTab('my_advisory')}>
                My Advisory Class Schedule
              </button>
            )}
          </>
        )}
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="teaching-load-filters no-print">
        {activeTab === 'teacher' && isAdmin && (
          <div className="filter-group">
            <label htmlFor="filterTeacher">Teacher</label>
            <select
              id="filterTeacher"
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
            >
              <option value="all">All Teachers</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {getDisplayName(t)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label>Filter Subject</label>
          <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
            <option value="all">All Subjects</option>
            {SUBJECT_SPECIALIZATIONS.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Filter Grade Level</label>
          <select value={filterGradeLevel} onChange={(e) => setFilterGradeLevel(e.target.value)}>
            <option value="all">All Grades</option>
            {GRADE_LEVELS.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {loads.length === 0 ? (
        <div className="teaching-load-empty no-print">
          <p>No teaching load entries for {academicYear} yet.</p>
          <button type="button" className="primary-btn" onClick={openAdd}>
            Add First Assignment
          </button>
        </div>
      ) : (
        <div className="teaching-load-groups">
          {(activeTab === 'master' || activeTab === 'my_advisory') && (
            <div className="master-schedule-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }} className="no-print">
                <div className="day-selector" style={{ display: 'flex', gap: '0.5rem' }}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                    <button 
                      key={day}
                      type="button"
                      className={masterDay === day ? 'primary-btn' : 'secondary-btn'}
                      onClick={() => setMasterDay(day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                {activeTab === 'master' && (
                  <div className="level-selector" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      type="button"
                      className={masterLevel === 'JHS' ? 'primary-btn' : 'secondary-btn'}
                      onClick={() => setMasterLevel('JHS')}
                    >
                      Junior High (G7-G10)
                    </button>
                    <button 
                      type="button"
                      className={masterLevel === 'SHS' ? 'primary-btn' : 'secondary-btn'}
                      onClick={() => setMasterLevel('SHS')}
                    >
                      Senior High (G11-G12)
                    </button>
                  </div>
                )}
              </div>
              
              <div className="calendar-wrapper">
                <CalendarScheduleView 
                  loads={activeTab === 'master' ? filteredLoads : allLoads.filter(l => myAdvisorySections.some(mys => mys.id === l.sectionId))} 
                  sections={
                    activeTab === 'master' 
                      ? orderedSections.filter(sec => 
                          masterLevel === 'JHS' 
                            ? ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].includes(sec.gradeLevel)
                            : ['Grade 11', 'Grade 12'].includes(sec.gradeLevel)
                        )
                      : myAdvisorySections
                  }
                  selectedDay={masterDay}
                  openEdit={openEdit} 
                  handleDelete={handleDelete}
                  isAdmin={isAdmin} 
                  currentUserId={user?.uid} 
                  breaks={breaks}
                />
              </div>
            </div>
          )}

          {(activeTab === 'teacher' || activeTab === 'my_schedule') && (
            Object.entries(loadsByTeacher).map(([teacherId, teacherLoads]) => {
              const teacherMins = teacherLoads.reduce((acc, l) => acc + calculateLoadMinutes(l.schedule), 0);
              const teacherHours = (teacherMins / 60).toFixed(1);
              const teacherName = teacherNameById[teacherId] || 'Unknown Teacher';

              return (
                <section key={teacherId} className="teacher-load-card">
                  <div className="teacher-load-card-header">
                    <div>
                      <h2>{teacherName}</h2>
                      <span className="teacher-load-badge">
                        Total: <strong>{teacherHours} hrs/wk</strong> ({teacherMins} mins)
                      </span>
                    </div>
                    <div className="teacher-card-actions">
                      <button 
                        type="button" 
                        className="export-ics-btn"
                        onClick={() => exportTeacherScheduleToICS(teacherName, teacherLoads, settings?.schoolName)}
                        title="Download .ICS for Google/Apple Calendar"
                      >
                        📅 Export .ICS
                      </button>
                      <button 
                        type="button" 
                        className="print-single-btn"
                        onClick={() => handleOpenPrintModal(teacherId)}
                        title="Print official DepEd Teacher Program"
                      >
                        🖨️ Print Program
                      </button>
                    </div>
                  </div>

                  <div className="table-wrapper">
                    <table className="teaching-load-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Grade Level</th>
                          <th>Section</th>
                          <th>Room / Venue</th>
                          <th>Schedule</th>
                          <th>Duration</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacherLoads.map((load) => {
                          const mins = calculateLoadMinutes(load.schedule);
                          return (
                            <tr key={load.id}>
                              <td>
                                <span className="subject-pill" style={{ backgroundColor: getSubjectColor(load.subject) }}>
                                  {load.subject}
                                </span>
                              </td>
                              <td>{load.gradeLevel}</td>
                              <td><strong>{load.sectionName || '—'}</strong></td>
                              <td>{load.room ? `📍 ${load.room}` : '—'}</td>
                              <td>{renderSchedule(load.schedule)}</td>
                              <td>{mins > 0 ? `${mins} mins/wk` : '—'}</td>
                              <td className="actions-cell">
                                <button type="button" className="text-btn" onClick={() => openEdit(load)}>
                                  Edit
                                </button>
                                {(isAdmin || load.teacherId === user.uid) && (
                                  <button type="button" className="text-btn danger" onClick={() => handleDelete(load.id)}>
                                    Delete
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}

      {/* ADD / EDIT ASSIGNMENT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Teaching Assignment' : 'Add Teaching Assignment'}</h2>
              <button className="close-x" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <p className="modal-note">Subject assignments for School Year {academicYear}.</p>
            
            <form onSubmit={(e) => { e.preventDefault(); saveLoad(); }}>
              <div className="modal-body-scroll">
                {isAdmin && (
                  <div className="form-group">
                    <label>Teacher *</label>
                    <select name="teacherId" value={form.teacherId} onChange={handleChange} required>
                      <option value="">Select teacher</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {getDisplayName(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Subject *</label>
                    <select name="subject" value={form.subject} onChange={handleChange} required>
                      <option value="">Select subject</option>
                      {SUBJECT_SPECIALIZATIONS.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Grade Level *</label>
                    <select name="gradeLevel" value={form.gradeLevel} onChange={handleChange} required>
                      {GRADE_LEVELS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Room / Venue (Optional)</label>
                  <input
                    type="text"
                    name="room"
                    placeholder="e.g. Room 204, Science Lab, Gymnasium"
                    value={form.room || ''}
                    onChange={handleChange}
                  />
                </div>

                {/* Assignment Schedule Editor */}
                {form.assignments.map((assignment, index) => {
                  const filteredSections = sections.filter(s => s.gradeLevel === form.gradeLevel);
                  return (
                    <div key={assignment.id} className="assignment-schedule-box">
                      <h4>Schedule & Section</h4>
                      <div className="form-group">
                        <label>Target Section</label>
                        <select
                          value={assignment.sectionId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm(prev => ({
                              ...prev,
                              assignments: prev.assignments.map((a, i) => i === index ? { ...a, sectionId: val } : a)
                            }));
                          }}
                        >
                          <option value="">Select section ({form.gradeLevel})</option>
                          {filteredSections.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Days of the Week</label>
                        <div className="days-checkbox-group">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                            const isChecked = assignment.schedule.days.includes(day);
                            return (
                              <label key={day} className="day-check-label">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const nextDays = e.target.checked
                                      ? [...assignment.schedule.days, day]
                                      : assignment.schedule.days.filter(d => d !== day);
                                    setForm(prev => ({
                                      ...prev,
                                      assignments: prev.assignments.map((a, i) => i === index ? {
                                        ...a,
                                        schedule: { ...a.schedule, days: nextDays }
                                      } : a)
                                    }));
                                  }}
                                />
                                {day.substring(0, 3)}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Start Time</label>
                          <input
                            type="time"
                            value={assignment.schedule.startTime}
                            onChange={(e) => {
                              const val = e.target.value;
                              setForm(prev => ({
                                ...prev,
                                assignments: prev.assignments.map((a, i) => i === index ? {
                                  ...a,
                                  schedule: { ...a.schedule, startTime: val }
                                } : a)
                              }));
                            }}
                          />
                        </div>
                        <div className="form-group">
                          <label>End Time</label>
                          <input
                            type="time"
                            value={assignment.schedule.endTime}
                            onChange={(e) => {
                              const val = e.target.value;
                              setForm(prev => ({
                                ...prev,
                                assignments: prev.assignments.map((a, i) => i === index ? {
                                  ...a,
                                  schedule: { ...a.schedule, endTime: val }
                                } : a)
                              }));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn">{editingId ? 'Save Changes' : 'Add Assignment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL PRINTABLE TEACHER PROGRAM / CLASS PROGRAM MODAL */}
      {showPrintModal && (
        <div className="modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="modal-content print-modal-content" onClick={e => e.stopPropagation()}>
            <div className="print-modal-header no-print">
              <h2>Official DepEd Class / Teacher Program</h2>
              <div className="print-modal-actions">
                <button className="primary-btn" onClick={() => window.print()}>🖨️ Print / Save PDF</button>
                <button className="close-x" onClick={() => setShowPrintModal(false)}>✕</button>
              </div>
            </div>

            <div className="printable-report-area">
              <div className="report-header-banner">
                <h2>{settings?.schoolName || 'DEPARTMENT OF EDUCATION'}</h2>
                <p className="report-school-sub">Individual Teacher's Program & Class Schedule • SY {academicYear}</p>
                
                {(() => {
                  const targetTeacherData = printTargetTeacher ? personnel.find(p => p.id === printTargetTeacher) : user;
                  const targetLoads = printTargetTeacher ? loads.filter(l => l.teacherId === printTargetTeacher) : (isAdmin ? loads : loads.filter(l => l.teacherId === user?.uid));
                  const teacherTotalMins = targetLoads.reduce((acc, l) => acc + calculateLoadMinutes(l.schedule), 0);
                  const teacherTotalHours = (teacherTotalMins / 60).toFixed(1);

                  return (
                    <div className="report-meta-box">
                      <div><strong>Teacher:</strong> {targetTeacherData?.fullName || targetTeacherData?.email || 'Faculty Member'}</div>
                      <div><strong>Position:</strong> {targetTeacherData?.position || 'Teacher'}</div>
                      <div><strong>Total Workload:</strong> {teacherTotalHours} hrs/wk ({teacherTotalMins} mins)</div>
                    </div>
                  );
                })()}
              </div>

              <table className="printable-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Subject</th>
                    <th>Grade & Section</th>
                    <th>Days</th>
                    <th>Time Slot</th>
                    <th>Room</th>
                    <th>Total Mins/Wk</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const targetLoads = printTargetTeacher ? loads.filter(l => l.teacherId === printTargetTeacher) : (isAdmin ? loads : loads.filter(l => l.teacherId === user?.uid));
                    if (targetLoads.length === 0) {
                      return (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '1rem' }}>No schedule assignments recorded.</td>
                        </tr>
                      );
                    }

                    return targetLoads.map((load, idx) => {
                      const sched = parseSchedule(load.schedule);
                      const days = (sched.days || []).map(d => d.substring(0, 3)).join(', ');
                      const mins = calculateLoadMinutes(load.schedule);

                      return (
                        <tr key={load.id || idx}>
                          <td>{idx + 1}</td>
                          <td><strong>{load.subject}</strong></td>
                          <td>{load.sectionName || load.gradeLevel}</td>
                          <td>{days || '—'}</td>
                          <td>{formatTime(sched.startTime)} - {formatTime(sched.endTime)}</td>
                          <td>{load.room || 'General Room'}</td>
                          <td>{mins} mins</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>

              <div className="report-sign-footer">
                <div className="sign-block">
                  <p>Prepared by:</p>
                  <div className="sign-line"></div>
                  <strong>{printTargetTeacher ? teacherNameById[printTargetTeacher] : (user?.fullName || 'Teacher')}</strong>
                  <span>Subject Teacher</span>
                </div>
                <div className="sign-block">
                  <p>Checked by:</p>
                  <div className="sign-line"></div>
                  <strong>Department Head / Coordinator</strong>
                  <span>Master Teacher / Head Teacher</span>
                </div>
                <div className="sign-block">
                  <p>Approved by:</p>
                  <div className="sign-line"></div>
                  <strong>{settings?.principalName || 'School Principal'}</strong>
                  <span>School Head / Principal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COPY FROM YEAR MODAL */}
      {showCopyModal && (
        <div className="modal-overlay" onClick={() => setShowCopyModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Copy Loads from Previous School Year</h2>
              <button className="close-x" onClick={() => setShowCopyModal(false)}>✕</button>
            </div>
            <p className="modal-note">Copy teaching load records to the current academic year ({academicYear}).</p>
            <form onSubmit={handleCopy}>
              <div className="form-group">
                <label>Select Source School Year</label>
                <select value={copyYear} onChange={(e) => setCopyYear(e.target.value)} required>
                  <option value="">Select year</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowCopyModal(false)}>Cancel</button>
                <button type="submit" className="submit-btn">Copy Loads</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE BREAKS MODAL */}
      {showBreaksModal && (
        <div className="modal-overlay" onClick={() => setShowBreaksModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Manage Schedule Breaks</h2>
              <button className="close-x" onClick={() => setShowBreaksModal(false)}>✕</button>
            </div>
            <p className="modal-note">Define breaks (Recess, Lunch, Flag Ceremony) displayed on the class program.</p>
            
            <div className="breaks-list">
              {breaks.map(b => (
                <div key={b.id} className="break-item-row">
                  <div>
                    <strong>{b.name}</strong>
                    <span> ({formatTime(b.startTime)} - {formatTime(b.endTime)})</span>
                  </div>
                  <button 
                    type="button" 
                    className="text-btn danger"
                    onClick={async () => {
                      await deleteBreak(b.id);
                      showToastMsg('Break removed.', 'success');
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!breakForm.name || !breakForm.startTime || !breakForm.endTime) return;
              await addBreak(breakForm);
              setBreakForm({ name: '', startTime: '', endTime: '' });
              showToastMsg('Break added to class schedule!', 'success');
            }}>
              <h4>Add New Break</h4>
              <div className="form-group">
                <label>Break Name</label>
                <input
                  type="text"
                  placeholder="e.g. Recess, Lunch Break, Flag Ceremony"
                  value={breakForm.name}
                  onChange={e => setBreakForm({ ...breakForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={breakForm.startTime}
                    onChange={e => setBreakForm({ ...breakForm, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={breakForm.endTime}
                    onChange={e => setBreakForm({ ...breakForm, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowBreaksModal(false)}>Close</button>
                <button type="submit" className="submit-btn">+ Add Break</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST MESSAGE */}
      {toast && (
        <div className={`toast-message ${toast.type}`}>
          <span className="toast-icon">{toast.type === 'success' ? '✅' : '❌'}</span>
          <span className="toast-text">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default TeachingLoadPage;
