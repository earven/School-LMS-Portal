import React, { useState, useEffect, useMemo } from 'react';
import { usePersonnel } from '../../context/PersonnelContext';
import { useSections } from '../../context/SectionContext';
import { normalizePersonnelRecord } from '../../utils/personnelName';
import './TeachingLoadPage.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri' };

const AVATAR_COLORS = [
  '#4e73df', '#1cc88a', '#36b9cc', '#e74a3b', '#f6c23e',
  '#6f42c1', '#fd7e14', '#20c997', '#e83e8c', '#17a2b8',
];

const getAvatarColor = (id) => {
  const hash = String(id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const getInitial = (name) => (name || '?')[0].toUpperCase();

const TeachingLoadGeneratorPage = () => {
  const { personnel } = usePersonnel();
  const { sections: dbSections } = useSections();

  const getSaved = (key, def) => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : def; }
    catch { return def; }
  };

  const initialDept = localStorage.getItem('sandbox_department') || 'JHS';
  const [department, setDepartment] = useState(initialDept);

  // ─── Config state ────────────────────────────────────────────────────────────
  const [sections, setSections] = useState(() => getSaved(`sandbox_sections_${initialDept}`, [
    { id: 1, name: 'Grade 7 - Sec A' }, { id: 2, name: 'Grade 7 - Sec B' }
  ]));
  const [subjects, setSubjects] = useState(() => getSaved(`sandbox_subjects_${initialDept}`, [
    { id: 1, name: 'Math', daysPerWeek: 5 },
    { id: 2, name: 'English', daysPerWeek: 5 },
    { id: 3, name: 'Science', daysPerWeek: 3 },
  ]));
  const [teachers, setTeachers] = useState(() => getSaved('sandbox_teachers', [
    { id: 1, name: 'Teacher 1', specialization: 'Math', maxLoadsPerWeek: 20 },
    { id: 2, name: 'Teacher 2', specialization: 'English', maxLoadsPerWeek: 20 },
  ]));
  const [periods, setPeriods] = useState(() => getSaved(`sandbox_periods_${initialDept}`, [
    { id: 1, name: 'Period 1',  startTime: '07:30', endTime: '08:20', type: 'Class' },
    { id: 2, name: 'Period 2',  startTime: '08:20', endTime: '09:10', type: 'Class' },
    { id: 3, name: 'Recess',    startTime: '09:10', endTime: '09:30', type: 'Break' },
    { id: 4, name: 'Period 3',  startTime: '09:30', endTime: '10:20', type: 'Class' },
    { id: 5, name: 'Period 4',  startTime: '10:20', endTime: '11:10', type: 'Class' },
    { id: 6, name: 'Lunch',     startTime: '11:10', endTime: '12:00', type: 'Break' },
    { id: 7, name: 'Period 5',  startTime: '12:00', endTime: '12:50', type: 'Class' },
    { id: 8, name: 'Period 6',  startTime: '12:50', endTime: '13:40', type: 'Class' },
  ]));

  // ─── Planner state ───────────────────────────────────────────────────────────
  const [manualAssignments, setManualAssignments] = useState(() => getSaved(`sandbox_assignments_${initialDept}`, []));
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [draggedTeacher, setDraggedTeacher] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);
  const [conflictCell, setConflictCell] = useState(null);
  const [subjectPicker, setSubjectPicker] = useState(null);
  const [showConfig, setShowConfig] = useState(true);
  const [placementInfo, setPlacementInfo] = useState(null); // result toast after auto-place
  const [teacherSearch, setTeacherSearch] = useState(''); // Shared search filter for teachers

  // Auto-dismiss placement toast after 5 s
  useEffect(() => {
    if (!placementInfo) return;
    const t = setTimeout(() => setPlacementInfo(null), 5000);
    return () => clearTimeout(t);
  }, [placementInfo]);

  useEffect(() => {
    localStorage.setItem(`sandbox_sections_${department}`, JSON.stringify(sections));
    localStorage.setItem(`sandbox_subjects_${department}`, JSON.stringify(subjects));
    localStorage.setItem('sandbox_teachers', JSON.stringify(teachers)); // Shared roster
    localStorage.setItem(`sandbox_periods_${department}`, JSON.stringify(periods));
    localStorage.setItem(`sandbox_assignments_${department}`, JSON.stringify(manualAssignments));
  }, [sections, subjects, teachers, periods, manualAssignments, department]);

  const handleDepartmentChange = (dept) => {
    setDepartment(dept);
    localStorage.setItem('sandbox_department', dept);
    
    setSections(getSaved(`sandbox_sections_${dept}`, [
      { id: 1, name: dept === 'JHS' ? 'Grade 7 - Sec A' : 'Grade 11 - Sec A' }, 
      { id: 2, name: dept === 'JHS' ? 'Grade 7 - Sec B' : 'Grade 11 - Sec B' }
    ]));
    setSubjects(getSaved(`sandbox_subjects_${dept}`, [
      { id: 1, name: 'Math', daysPerWeek: 5 },
      { id: 2, name: 'English', daysPerWeek: 5 },
      { id: 3, name: 'Science', daysPerWeek: 3 },
    ]));
    // teachers are shared, so no setTeachers here
    setPeriods(getSaved(`sandbox_periods_${dept}`, [
      { id: 1, name: 'Period 1',  startTime: '07:30', endTime: '08:20', type: 'Class' },
      { id: 2, name: 'Period 2',  startTime: '08:20', endTime: '09:10', type: 'Class' },
      { id: 3, name: 'Recess',    startTime: '09:10', endTime: '09:30', type: 'Break' },
      { id: 4, name: 'Period 3',  startTime: '09:30', endTime: '10:20', type: 'Class' },
      { id: 5, name: 'Period 4',  startTime: '10:20', endTime: '11:10', type: 'Class' },
      { id: 6, name: 'Lunch',     startTime: '11:10', endTime: '12:00', type: 'Break' },
      { id: 7, name: 'Period 5',  startTime: '12:00', endTime: '12:50', type: 'Class' },
      { id: 8, name: 'Period 6',  startTime: '12:50', endTime: '13:40', type: 'Class' },
    ]));
    setManualAssignments(getSaved(`sandbox_assignments_${dept}`, []));
  };

  const sortedPeriods = useMemo(
    () => [...periods].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [periods]
  );

  // ─── Derived data ────────────────────────────────────────────────────────────
  const teacherLoadCount = useMemo(() => {
    const counts = {};
    teachers.forEach(t => { counts[String(t.id)] = 0; });
    
    const otherDept = department === 'JHS' ? 'SHS' : 'JHS';
    const otherAssignments = getSaved(`sandbox_assignments_${otherDept}`, []);
    const allAssigned = [...manualAssignments, ...otherAssignments];

    allAssigned.forEach(a => {
      const k = String(a.teacherId);
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [manualAssignments, teachers, department]);

  const teacherStats = useMemo(() =>
    teachers.map(t => {
      const assigned = teacherLoadCount[String(t.id)] || 0;
      const max = Math.max(Number(t.maxLoadsPerWeek) || 1, 1);
      const pct = Math.min(Math.round((assigned / max) * 100), 100);
      return { ...t, assigned, max, pct };
    }).sort((a, b) => b.pct - a.pct),
    [teacherLoadCount, teachers]
  );

  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return teachers;
    const lower = teacherSearch.toLowerCase();
    return teachers.filter(t => 
      t.name.toLowerCase().includes(lower) || 
      (t.specialization || '').toLowerCase().includes(lower)
    );
  }, [teachers, teacherSearch]);

  const sectionStats = useMemo(() => {
    const totalRequired = subjects.reduce((s, sub) => s + Math.max(Number(sub.daysPerWeek) || 0, 0), 0);
    return sections.map(sec => {
      const scheduled = manualAssignments.filter(a => String(a.sectionId) === String(sec.id)).length;
      const pct = totalRequired > 0 ? Math.min(Math.round((scheduled / totalRequired) * 100), 100) : 0;
      const status = pct === 100 ? 'full' : pct === 0 ? 'none' : 'partial';
      return { ...sec, scheduled, required: totalRequired, pct, status };
    }).sort((a, b) => a.pct - b.pct);
  }, [manualAssignments, sections, subjects]);

  // Today's cell assignments: `${sectionId}__${periodId}` → assignment
  const todayAssignments = useMemo(() => {
    const map = {};
    manualAssignments.filter(a => a.day === selectedDay)
      .forEach(a => { map[`${a.sectionId}__${a.periodId}`] = a; });
    return map;
  }, [manualAssignments, selectedDay]);

  // Teacher busy today: teacherId → Set of periodIds
  const teacherBusyToday = useMemo(() => {
    const map = {};
    manualAssignments.filter(a => a.day === selectedDay).forEach(a => {
      const k = String(a.teacherId);
      if (!map[k]) map[k] = new Set();
      map[k].add(String(a.periodId));
    });
    return map;
  }, [manualAssignments, selectedDay]);

  // ─── Drag & Drop ─────────────────────────────────────────────────────────────
  const handleDragStart = (e, teacher) => {
    setDraggedTeacher(teacher);
    e.dataTransfer.effectAllowed = 'copy';
  };
  const handleDragEnd = () => { setDraggedTeacher(null); setDragOverCell(null); };

  const handleDragOver = (e, cellKey, period) => {
    if (period.type === 'Break') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverCell(cellKey);
  };
  const handleDragLeave = () => setDragOverCell(null);

  const handleDrop = (e, section, period) => {
    e.preventDefault();
    setDragOverCell(null);
    if (!draggedTeacher || period.type === 'Break') return;
    const cellKey = `${section.id}__${period.id}`;

    // Conflict: cell occupied
    if (todayAssignments[cellKey]) {
      setConflictCell(cellKey);
      setTimeout(() => setConflictCell(null), 600);
      return;
    }
    // Conflict: teacher already busy this period+day
    if (teacherBusyToday[String(draggedTeacher.id)]?.has(String(period.id))) {
      setConflictCell(cellKey);
      setTimeout(() => setConflictCell(null), 600);
      return;
    }

    const tData = teachers.find(t => String(t.id) === String(draggedTeacher.id));
    const specs = tData?.specialization
      ? tData.specialization.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    if (specs.length <= 1) {
      doAssign(section, period, draggedTeacher, specs[0] || '—');
    } else {
      setSubjectPicker({ section, period, teacher: draggedTeacher, specs });
    }
  };

  // Day patterns by frequency — standard academic spreads
  const DAY_PATTERNS = {
    1: [selectedDay],                                               // just the current day
    2: ['Tuesday', 'Thursday'],
    3: ['Monday', 'Wednesday', 'Friday'],
    4: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    5: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  };

  const doAssign = (section, period, teacher, subject) => {
    // Look up how many days/week this subject needs
    const subjectConf = subjects.find(s => s.name === subject);
    const n = Math.min(Math.max(Number(subjectConf?.daysPerWeek) || 5, 1), 5);
    const targetDays = DAY_PATTERNS[n] || DAY_PATTERNS[5];

    const placedDays = [];
    const skippedDays = [];
    const newAssignments = [];

    targetDays.forEach(day => {
      const cellOccupied = manualAssignments.some(
        a => a.sectionId === String(section.id) && a.periodId === String(period.id) && a.day === day
      );
      const teacherBusy = manualAssignments.some(
        a => a.teacherId === String(teacher.id) && a.periodId === String(period.id) && a.day === day
      );
      if (cellOccupied || teacherBusy) {
        skippedDays.push(DAY_SHORT[day]);
      } else {
        placedDays.push(DAY_SHORT[day]);
        newAssignments.push({
          id: `m_${Date.now()}_${Math.random() * 9999}`,
          teacherId: String(teacher.id),
          teacherName: teacher.name,
          sectionId: String(section.id),
          sectionName: section.name,
          periodId: String(period.id),
          day,
          subject,
          gradeLevel: 'Simulation',
          schedule: { days: [day], startTime: period.startTime, endTime: period.endTime },
          isGenerated: false,
        });
      }
    });

    if (newAssignments.length > 0) {
      setManualAssignments(prev => [...prev, ...newAssignments]);
    }
    setPlacementInfo({ placed: placedDays, skipped: skippedDays, subject, sectionName: section.name, n });
    setSubjectPicker(null);
    setDraggedTeacher(null);
  };

  const removeAssignment = (id) => setManualAssignments(prev => prev.filter(a => a.id !== id));

  // ─── Import / Export ─────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!manualAssignments.length) return;
    const headers = ['Teacher', 'Subject', 'Section', 'Day', 'Start Time', 'End Time'];
    const rows = manualAssignments.map(l => [
      `"${l.teacherName || ''}"`, `"${l.subject || ''}"`, `"${l.sectionName || ''}"`,
      `"${l.day || ''}"`, `"${l.schedule?.startTime || ''}"`, `"${l.schedule?.endTime || ''}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manual_schedule_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadFromDatabase = () => {
    if (!window.confirm('Overwrite current Teachers & Sections with live data?')) return;
    const liveTeachers = personnel.filter(p => p.role === 'teacher').map(t => {
      const n = normalizePersonnelRecord(t);
      return { id: t.id, name: `${n.firstName} ${n.lastName}`, specialization: Array.isArray(n.specialization) ? n.specialization.join(', ') : (n.specialization || ''), maxLoadsPerWeek: 25 };
    });
    const liveSections = dbSections.map(s => ({ id: s.id, name: `${s.gradeLevel} - ${s.name}` }));
    if (liveTeachers.length) setTeachers(liveTeachers);
    if (liveSections.length) setSections(liveSections);
  };

  // CSV import helpers
  const parseCSV = (file, cb) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit. Please upload a smaller CSV file.");
      return;
    }
    const r = new FileReader();
    r.onload = (e) => {
      const lines = e.target.result.split('\n').filter(l => l.trim());
      if (lines.length < 2) return alert('CSV needs a header + data rows.');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      cb(lines.slice(1).map(line => {
        const vals = line.split(',');
        const obj = {};
        headers.forEach((h, i) => obj[h] = vals[i]?.trim() || '');
        return obj;
      }));
    };
    r.readAsText(file);
  };
  const onSectionsCSV = (e) => { const f = e.target.files[0]; if (!f) return; parseCSV(f, data => setSections(p => [...p, ...data.map((r, i) => ({ id: Date.now() + i, name: r.name || r.section || `Imported ${i + 1}` }))])); e.target.value = null; };
  const onSubjectsCSV = (e) => { const f = e.target.files[0]; if (!f) return; parseCSV(f, data => setSubjects(p => [...p, ...data.map((r, i) => ({ id: Date.now() + i, name: r.name || r.subject || `Sub ${i + 1}`, daysPerWeek: Number(r.daysperweek) || 5 }))])); e.target.value = null; };
  const onTeachersCSV = (e) => { const f = e.target.files[0]; if (!f) return; parseCSV(f, data => setTeachers(p => [...p, ...data.map((r, i) => ({ id: Date.now() + i, name: r.name || `Teacher ${i + 1}`, specialization: r.specialization || '', maxLoadsPerWeek: Number(r.maxloadsperweek) || 25 }))])); e.target.value = null; };

  // CRUD helpers
  const addSection = () => setSections(p => [...p, { id: Date.now(), name: `Section ${p.length + 1}` }]);
  const removeSection = (id) => setSections(p => p.filter(s => s.id !== id));
  const updateSection = (id, v) => setSections(p => p.map(s => s.id === id ? { ...s, name: v } : s));
  const addSubject = () => setSubjects(p => [...p, { id: Date.now(), name: '', daysPerWeek: 5 }]);
  const removeSubject = (id) => setSubjects(p => p.filter(s => s.id !== id));
  const updateSubject = (id, f, v) => setSubjects(p => p.map(s => s.id === id ? { ...s, [f]: v } : s));
  const addTeacher = () => setTeachers(p => [...p, { id: Date.now(), name: `Teacher ${p.length + 1}`, specialization: '', maxLoadsPerWeek: 20 }]);
  const removeTeacher = (id) => setTeachers(p => p.filter(t => t.id !== id));
  const updateTeacher = (id, f, v) => setTeachers(p => p.map(t => t.id === id ? { ...t, [f]: v } : t));
  const addPeriod = () => setPeriods(p => [...p, { id: Date.now(), name: `Period ${p.length + 1}`, startTime: '14:00', endTime: '15:00', type: 'Class' }]);
  const removePeriod = (id) => setPeriods(p => p.filter(per => per.id !== id));
  const updatePeriod = (id, f, v) => setPeriods(p => p.map(per => per.id === id ? { ...per, [f]: v } : per));

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="teaching-load-page" style={{ maxWidth: '100%' }}>

      {/* ── Header ── */}
      <div className="teaching-load-header">
        <div>
          <h1>✋ Manual Schedule Planner</h1>
          <p className="subtitle">Drag teacher cards onto the grid to assign classes. Live stats update as you build.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Department Toggle */}
          <div style={{ display: 'flex', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', padding: '2px', marginRight: '0.5rem' }}>
            <button 
              type="button" 
              onClick={() => handleDepartmentChange('JHS')}
              style={{ padding: '6px 12px', border: 'none', background: department === 'JHS' ? '#4e73df' : 'transparent', color: department === 'JHS' ? 'white' : '#555', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              JHS
            </button>
            <button 
              type="button" 
              onClick={() => handleDepartmentChange('SHS')}
              style={{ padding: '6px 12px', border: 'none', background: department === 'SHS' ? '#4e73df' : 'transparent', color: department === 'SHS' ? 'white' : '#555', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              SHS
            </button>
          </div>

          <button type="button" className="secondary-btn" onClick={() => setShowConfig(p => !p)}>
            {showConfig ? '▲ Hide Config' : '▼ Show Config'}
          </button>
          <button type="button" className="secondary-btn" onClick={handleLoadFromDatabase} style={{ background: '#4e73df', color: 'white', border: 'none' }}>
            📥 Import Live Data
          </button>
          {manualAssignments.length > 0 && (<>
            <button type="button" className="secondary-btn" onClick={handleExportCSV} style={{ background: '#1cc88a', color: 'white', border: 'none' }}>
              📤 Export CSV
            </button>
            <button type="button" className="secondary-btn" onClick={() => { if (window.confirm('Clear all assignments?')) setManualAssignments([]); }} style={{ background: '#e74a3b', color: 'white', border: 'none' }}>
              🗑 Clear All
            </button>
          </>)}
        </div>
      </div>

      {/* ── Config Panels (collapsible) ── */}
      {showConfig && (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginBottom: '1.5rem' }}>

          {/* Sections */}
          <div className="teacher-load-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem' }}>📋 Sections ({sections.length})</h3>
              <label className="text-btn" style={{ fontSize: '0.78rem', cursor: 'pointer' }}>
                + CSV <input type="file" accept=".csv" onChange={onSectionsCSV} style={{ display: 'none' }} />
              </label>
            </div>
            <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '0.6rem' }}>
              {sections.map(sec => (
                <div key={sec.id} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.35rem' }}>
                  <input type="text" value={sec.name} onChange={e => updateSection(sec.id, e.target.value)} style={{ flex: 1, padding: '4px 6px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '0.85rem' }} placeholder="Section name" />
                  <button type="button" onClick={() => removeSection(sec.id)} className="text-btn danger" style={{ fontSize: '0.9rem' }}>✕</button>
                </div>
              ))}
            </div>
            <button type="button" className="secondary-btn" onClick={addSection} style={{ width: '100%', fontSize: '0.82rem', minHeight: '32px' }}>+ Add Section</button>
          </div>

          {/* Subjects */}
          <div className="teacher-load-card" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem' }}>📚 Subjects ({subjects.length})</h3>
              <label className="text-btn" style={{ fontSize: '0.78rem', cursor: 'pointer' }}>
                + CSV <input type="file" accept=".csv" onChange={onSubjectsCSV} style={{ display: 'none' }} />
              </label>
            </div>
            <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '0.6rem' }}>
              {subjects.map(sub => (
                <div key={sub.id} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.35rem', alignItems: 'center' }}>
                  <input type="text" value={sub.name} onChange={e => updateSubject(sub.id, 'name', e.target.value)} style={{ flex: 1, padding: '4px 6px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '0.85rem' }} placeholder="Subject" />
                  <input type="number" value={sub.daysPerWeek} onChange={e => updateSubject(sub.id, 'daysPerWeek', e.target.value)} style={{ width: '48px', padding: '4px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '0.85rem', textAlign: 'center' }} title="Days/week" />
                  <span style={{ fontSize: '0.68rem', color: '#aaa', whiteSpace: 'nowrap' }}>d/wk</span>
                  <button type="button" onClick={() => removeSubject(sub.id)} className="text-btn danger" style={{ fontSize: '0.9rem' }}>✕</button>
                </div>
              ))}
            </div>
            <button type="button" className="secondary-btn" onClick={addSubject} style={{ width: '100%', fontSize: '0.82rem', minHeight: '32px' }}>+ Add Subject</button>
          </div>

          {/* Periods */}
          <div className="teacher-load-card" style={{ padding: '1rem' }}>
            <h3 style={{ margin: '0 0 0.6rem', fontSize: '0.95rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>⏰ Periods</h3>
            <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '0.6rem' }}>
              {periods.map(p => (
                <div key={p.id} style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.35rem', alignItems: 'center', fontSize: '0.8rem' }}>
                  <input type="time" value={p.startTime} onChange={e => updatePeriod(p.id, 'startTime', e.target.value)} style={{ padding: '3px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.78rem' }} />
                  <span style={{ color: '#aaa' }}>–</span>
                  <input type="time" value={p.endTime} onChange={e => updatePeriod(p.id, 'endTime', e.target.value)} style={{ padding: '3px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.78rem' }} />
                  <input type="text" value={p.name} onChange={e => updatePeriod(p.id, 'name', e.target.value)} style={{ flex: 1, padding: '3px 5px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.78rem' }} />
                  <select value={p.type} onChange={e => updatePeriod(p.id, 'type', e.target.value)} style={{ padding: '3px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.75rem' }}>
                    <option value="Class">Class</option>
                    <option value="Break">Break</option>
                  </select>
                  <button type="button" onClick={() => removePeriod(p.id)} className="text-btn danger" style={{ fontSize: '0.85rem' }}>✕</button>
                </div>
              ))}
            </div>
            <button type="button" className="secondary-btn" onClick={addPeriod} style={{ width: '100%', fontSize: '0.82rem', minHeight: '32px' }}>+ Add Period</button>
          </div>

          {/* Teachers */}
          <div className="teacher-load-card" style={{ padding: '1rem', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem' }}>👩‍🏫 Teachers Roster ({filteredTeachers.length})</h3>
                <input 
                  type="text" 
                  placeholder="🔍 Search..." 
                  value={teacherSearch}
                  onChange={e => setTeacherSearch(e.target.value)}
                  style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.78rem', width: '120px', flex: '1 1 auto', maxWidth: '150px', boxSizing: 'border-box' }}
                />
              </div>
              <label className="text-btn" style={{ fontSize: '0.78rem', cursor: 'pointer' }}>
                + CSV <input type="file" accept=".csv" onChange={onTeachersCSV} style={{ display: 'none' }} />
              </label>
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '0.6rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead><tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 600 }}>Specialization(s)</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 600 }}>Max Loads/Wk</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {filteredTeachers.map(t => (
                    <tr key={t.id}>
                      <td style={{ padding: '3px 5px' }}><input type="text" value={t.name} onChange={e => updateTeacher(t.id, 'name', e.target.value)} style={{ width: '100%', padding: '3px 5px', border: '1px solid #ddd', borderRadius: '4px' }} /></td>
                      <td style={{ padding: '3px 5px' }}><input type="text" value={t.specialization} onChange={e => updateTeacher(t.id, 'specialization', e.target.value)} style={{ width: '100%', padding: '3px 5px', border: '1px solid #ddd', borderRadius: '4px' }} placeholder="e.g. Math, Science" /></td>
                      <td style={{ padding: '3px 5px' }}><input type="number" value={t.maxLoadsPerWeek} onChange={e => updateTeacher(t.id, 'maxLoadsPerWeek', e.target.value)} style={{ width: '65px', padding: '3px 5px', border: '1px solid #ddd', borderRadius: '4px' }} /></td>
                      <td style={{ padding: '3px 5px' }}><button type="button" onClick={() => removeTeacher(t.id)} className="text-btn danger">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="secondary-btn" onClick={addTeacher} style={{ fontSize: '0.82rem', minHeight: '32px' }}>+ Add Teacher</button>
          </div>
        </div>
      )}

      {/* ── Planner Layout ── */}
      <div className="planner-layout">

        {/* Teacher Sidebar */}
        <div className="planner-sidebar">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="planner-sidebar-title" style={{ margin: 0 }}>👩‍🏫 Teachers</div>
          </div>
          <input 
            type="text" 
            placeholder="🔍 Search teachers..." 
            value={teacherSearch}
            onChange={e => setTeacherSearch(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.82rem', marginTop: '0.6rem' }}
          />
          <p style={{ fontSize: '0.75rem', color: '#aaa', margin: '0.5rem 0 1rem' }}>Drag onto the grid →</p>
          <div className="teacher-card-list">
            {filteredTeachers.map(t => {
              const count = teacherLoadCount[String(t.id)] || 0;
              const max = Math.max(Number(t.maxLoadsPerWeek) || 1, 1);
              const pct = Math.min((count / max) * 100, 100);
              const atCap = count >= max;
              const color = getAvatarColor(t.id);
              const specs = t.specialization ? t.specialization.split(',').map(s => s.trim()).filter(Boolean) : [];
              const isDragging = String(draggedTeacher?.id) === String(t.id);

              return (
                <div
                  key={t.id}
                  className={`planner-teacher-card${atCap ? ' at-capacity' : ''}${isDragging ? ' dragging' : ''}`}
                  draggable={!atCap}
                  onDragStart={e => handleDragStart(e, { id: t.id, name: t.name, specialization: t.specialization })}
                  onDragEnd={handleDragEnd}
                  title={atCap ? `${t.name} has reached max loads` : `Drag to assign ${t.name}`}
                >
                  <div className="teacher-card-avatar" style={{ background: color }}>{getInitial(t.name)}</div>
                  <div className="teacher-card-info">
                    <div className="teacher-card-name">{t.name}</div>
                    <div className="teacher-card-specs">
                      {specs.length > 0 ? specs.join(' · ') : <em style={{ opacity: 0.55 }}>Any subject</em>}
                    </div>
                    <div className="teacher-card-bar-wrap">
                      <div className="teacher-card-bar" style={{ width: `${pct}%`, background: pct >= 90 ? '#e74a3b' : pct >= 70 ? '#fd7e14' : color }} />
                    </div>
                    <div className="teacher-card-count" style={{ color: pct >= 90 ? '#e74a3b' : '#aaa' }}>
                      {count}/{max} loads{atCap ? ' · Full ⚠️' : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid Area */}
        <div className="planner-grid-area">
          {/* Day Tabs */}
          <div className="day-tabs" style={{ marginBottom: '0.75rem' }}>
            {DAYS.map(day => {
              const count = manualAssignments.filter(a => a.day === day).length;
              return (
                <button key={day} type="button" className={`day-tab${selectedDay === day ? ' active' : ''}`} onClick={() => setSelectedDay(day)}>
                  {DAY_SHORT[day]}
                  {count > 0 && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '16px', height: '16px', borderRadius: '50%', fontSize: '0.6rem',
                      fontWeight: 700, lineHeight: 1,
                      background: selectedDay === day ? 'rgba(255,255,255,0.25)' : 'rgba(78,115,223,0.15)',
                      color: selectedDay === day ? 'white' : '#4e73df'
                    }}>{count}</span>
                  )}
                </button>
              );
            })}
            <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#aaa', alignSelf: 'center' }}>
              {manualAssignments.length} total assignment{manualAssignments.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Placement Result Toast */}
          {placementInfo && (
            <div style={{
              marginBottom: '0.75rem',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: placementInfo.placed.length > 0 ? '#f0fff4' : '#fff5f5',
              border: `1px solid ${placementInfo.placed.length > 0 ? '#c6f6d5' : '#fed7d7'}`,
              color: placementInfo.placed.length > 0 ? '#276749' : '#9b2c2c',
              animation: 'fadeInDown 0.25s ease'
            }}>
              {placementInfo.placed.length > 0
                ? <>
                    <span>✅</span>
                    <span>
                      <strong>{placementInfo.subject}</strong> placed on{' '}
                      <strong>{placementInfo.placed.join(', ')}</strong> for {placementInfo.sectionName}
                      {placementInfo.skipped.length > 0 && (
                        <span style={{ color: '#c05621', marginLeft: '0.4rem' }}>
                          · ⚠️ Skipped {placementInfo.skipped.join(', ')} (conflict)
                        </span>
                      )}
                    </span>
                  </>
                : <><span>❌</span><span>Could not place <strong>{placementInfo.subject}</strong> — all target days had conflicts.</span></>
              }
              <button type="button" onClick={() => setPlacementInfo(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.5 }}>✕</button>
            </div>
          )}

          {/* Grid */}
          <div className="planner-grid-wrapper">
            <div className="planner-grid" style={{ gridTemplateColumns: `90px repeat(${sections.length}, minmax(120px, 1fr))` }}>

              {/* Header row */}
              <div className="planner-header-cell planner-time-header">Time</div>
              {sections.map(sec => (
                <div key={sec.id} className="planner-header-cell planner-section-header" title={sec.name}>
                  {sec.name}
                </div>
              ))}

              {/* Period rows */}
              {sortedPeriods.map(period => (
                <React.Fragment key={period.id}>
                  <div className={`planner-time-cell${period.type === 'Break' ? ' planner-break-time' : ''}`}>
                    <span>{period.startTime}</span>
                    {period.type !== 'Break' && <span style={{ fontSize: '0.6rem', color: '#ccc' }}>↕</span>}
                    <span>{period.endTime}</span>
                    {period.type === 'Break' && <span className="planner-break-name">{period.name}</span>}
                  </div>

                  {sections.map(sec => {
                    const cellKey = `${sec.id}__${period.id}`;
                    const assignment = todayAssignments[cellKey];
                    const isBreak = period.type === 'Break';
                    const isDragOver = dragOverCell === cellKey;
                    const isConflict = conflictCell === cellKey;
                    const teacherBusyHere = draggedTeacher && teacherBusyToday[String(draggedTeacher.id)]?.has(String(period.id));
                    const avatarColor = assignment ? getAvatarColor(assignment.teacherId) : null;

                    let cellClass = 'planner-cell';
                    if (isBreak)             cellClass += ' planner-cell-break';
                    else if (assignment)     cellClass += ' planner-cell-filled';
                    else                     cellClass += ' planner-cell-empty';
                    if (isDragOver && !isBreak && !assignment) cellClass += ' planner-cell-drag-over';
                    if (isConflict)          cellClass += ' planner-cell-conflict';
                    if (!isBreak && !assignment && draggedTeacher && teacherBusyHere) cellClass += ' planner-cell-teacher-busy';

                    return (
                      <div
                        key={cellKey}
                        className={cellClass}
                        onDragOver={e => handleDragOver(e, cellKey, period)}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, sec, period)}
                      >
                        {isBreak ? (
                          <span className="planner-break-cell-label">☕ {period.name}</span>
                        ) : assignment ? (
                          <div className="planner-assignment-chip" style={{ borderLeftColor: avatarColor }}>
                            <div className="chip-avatar" style={{ background: avatarColor }}>{getInitial(assignment.teacherName)}</div>
                            <div className="chip-info">
                              <div className="chip-subject">{assignment.subject}</div>
                              <div className="chip-teacher">{assignment.teacherName}</div>
                            </div>
                            <button type="button" className="chip-remove" onClick={() => removeAssignment(assignment.id)} title="Remove">×</button>
                          </div>
                        ) : (
                          <span className="planner-drop-hint">
                            {draggedTeacher && teacherBusyHere ? '🚫' : '+'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Live Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>

        {/* Teacher Utilization */}
        <div className="teacher-load-card" style={{ padding: '1.25rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>👩‍🏫 Teacher Utilization</h2>
          {teacherStats.length === 0 ? <p style={{ color: '#aaa', fontSize: '0.85rem' }}>No teachers added yet.</p> : (
            <div style={{ display: 'grid', gap: '0.55rem' }}>
              {teacherStats.map(t => {
                const color = t.pct >= 90 ? '#dc3545' : t.pct >= 70 ? '#fd7e14' : '#28a745';
                return (
                  <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.name}>{t.name}</span>
                    <div style={{ background: '#e9ecef', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ width: `${t.pct}%`, background: color, height: '100%', borderRadius: '999px', transition: 'width 0.4s ease' }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color, fontWeight: 700, minWidth: '55px', textAlign: 'right' }}>{t.assigned}/{t.max}</span>
                  </div>
                );
              })}
            </div>
          )}
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.7rem', color: '#ccc' }}>🟢 &lt;70% · 🟠 70–89% · 🔴 ≥90% of max loads/week</p>
        </div>

        {/* Section Coverage */}
        <div className="teacher-load-card" style={{ padding: '1.25rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700 }}>🏫 Section Coverage</h2>
          {sectionStats.length === 0 ? <p style={{ color: '#aaa', fontSize: '0.85rem' }}>No sections added yet.</p> : (
            <div style={{ display: 'grid', gap: '0.55rem' }}>
              {sectionStats.map(sec => {
                const color = sec.status === 'full' ? '#28a745' : sec.status === 'none' ? '#dc3545' : '#fd7e14';
                const badge = sec.status === 'full' ? '✅' : sec.status === 'none' ? '❌' : '⚠️';
                return (
                  <div key={sec.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', gap: '0.25rem' }} title={sec.name}>
                      <span>{badge}</span><span>{sec.name}</span>
                    </span>
                    <div style={{ background: '#e9ecef', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                      <div style={{ width: `${sec.pct}%`, background: color, height: '100%', borderRadius: '999px', transition: 'width 0.4s ease' }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color, fontWeight: 700, minWidth: '55px', textAlign: 'right' }}>{sec.scheduled}/{sec.required}</span>
                  </div>
                );
              })}
            </div>
          )}
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.7rem', color: '#ccc' }}>✅ Fully covered · ⚠️ Partial · ❌ None assigned</p>
        </div>
      </div>

      {/* ── Subject Picker Modal ── */}
      {subjectPicker && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '340px' }}>
            <h3 style={{ margin: '0 0 0.4rem' }}>Choose Subject</h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#666' }}>
              Assigning <strong>{subjectPicker.teacher.name}</strong> to <strong>{subjectPicker.section.name}</strong>
            </p>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {subjectPicker.specs.map(spec => (
                <button
                  key={spec}
                  type="button"
                  className="secondary-btn"
                  style={{ justifyContent: 'flex-start', padding: '0.65rem 1rem', fontSize: '0.9rem' }}
                  onClick={() => doAssign(subjectPicker.section, subjectPicker.period, subjectPicker.teacher, spec)}
                >
                  {spec}
                </button>
              ))}
            </div>
            <button type="button" className="text-btn" style={{ marginTop: '1.25rem', width: '100%', textAlign: 'center', color: '#aaa' }} onClick={() => setSubjectPicker(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeachingLoadGeneratorPage;
