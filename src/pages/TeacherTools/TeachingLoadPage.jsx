import React, { useMemo, useState } from 'react';
import { useTeachingLoad } from '../../context/TeachingLoadContext';
import { usePersonnel } from '../../context/PersonnelContext';
import { useSections } from '../../context/SectionContext';
import { useAuth } from '../../context/AuthContext';
import { SUBJECT_SPECIALIZATIONS } from '../../components/PersonnelFormFields';
import { getDisplayName, normalizePersonnelRecord } from '../../utils/personnelName';
import './TeachingLoadPage.css';

const GRADE_LEVELS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

const defaultSchedule = {
  days: [], // ['Monday', 'Tuesday']
  startTime: '',
  endTime: ''
};

const getEmptyForm = () => ({
  teacherId: '',
  subject: '',
  gradeLevel: 'Grade 7',
  assignments: [
    {
      id: Date.now(),
      sectionId: '',
      schedule: JSON.parse(JSON.stringify(defaultSchedule))
    }
  ]
});

const parseSchedule = (sched) => {
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

const formatTime = (timeStr) => {
  if (!timeStr) return '--:--';
  const [hours, minutes] = timeStr.split(':');
  if (!hours || !minutes) return timeStr;
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // '0' should be '12'
  return `${h}:${minutes} ${ampm}`;
};

const hasTimeOverlap = (schedA, schedB) => {
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

const getColorFromName = (name) => {
  if (!name) return 'hsl(0, 0%, 60%)';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 45%)`;
};

const CalendarScheduleView = ({ loads, sections, selectedDay, openEdit, handleDelete, isAdmin, currentUserId, breaks = [] }) => {
  const startHour = 7; // 7 AM
  const endHour = 17; // 5 PM
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

  return (
    <div className="calendar-grid-wrapper">
      <div className="calendar-grid" style={{ gridTemplateColumns: `70px repeat(${Math.max(1, sections.length)}, minmax(180px, 1fr))` }}>
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
          const sectionLoads = dayLoads.filter(l => l.sectionId === section.id);
          
          return (
            <div key={section.id} className="calendar-day-col">
              <div className="calendar-day-header" title={`${section.gradeLevel} - ${section.name}`}>
                {section.gradeLevel.replace('Grade ', 'G')} - {section.name}
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
                      key={b.id} 
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
                  
                  const canEdit = isAdmin || load.teacherId === currentUserId;
                  
                  return (
                    <div 
                      key={load.id} 
                      className="calendar-block"
                      style={{ 
                        top: `${top}px`, 
                        height: `${height}px`,
                        backgroundColor: getColorFromName(load.teacherName || 'Unknown')
                      }}
                      onClick={() => canEdit && openEdit(load)}
                      title={`Edit ${load.subject}`}
                    >
                      <div className="block-inner">
                        <div className="block-subject">{load.subject}</div>
                        <div className="block-teacher">{load.teacherName}</div>
                        <div className="block-time">{formatTime(parsed.startTime)} - {formatTime(parsed.endTime)}</div>
                      </div>
                      {canEdit && (
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

const renderSchedule = (sched) => {
  if (!sched) return '—';
  if (typeof sched === 'string') return sched; // Legacy fallback
  
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

const TeachingLoadPage = () => {
  const { user } = useAuth();
  const { personnel } = usePersonnel();
  const { sections } = useSections();
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
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(getEmptyForm);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyYear, setCopyYear] = useState('');
  const [showBreaksModal, setShowBreaksModal] = useState(false);
  const [breakForm, setBreakForm] = useState({ name: '', startTime: '', endTime: '' });

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
    return list.sort((a, b) => {
      const timeA = parseSchedule(a.schedule)?.startTime || "25:00";
      const timeB = parseSchedule(b.schedule)?.startTime || "25:00";
      if (timeA !== timeB) return timeA.localeCompare(timeB);

      const nameA = (teacherNameById[a.teacherId] || '').toLowerCase();
      const nameB = (teacherNameById[b.teacherId] || '').toLowerCase();
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      return (a.subject || '').localeCompare(b.subject || '');
    });
  }, [loads, isAdmin, filterTeacher, teacherNameById]);

  const loadsByTeacher = useMemo(() => {
    const grouped = {};
    filteredLoads.forEach((load) => {
      if (!grouped[load.teacherId]) grouped[load.teacherId] = [];
      grouped[load.teacherId].push(load);
    });
    return grouped;
  }, [filteredLoads]);

  const loadsBySection = useMemo(() => {
    const grouped = {};
    const sortedLoads = [...loads].sort((a, b) => {
      const timeA = parseSchedule(a.schedule)?.startTime || "25:00";
      const timeB = parseSchedule(b.schedule)?.startTime || "25:00";
      return timeA.localeCompare(timeB);
    });
    sortedLoads.forEach((load) => {
      if (!load.sectionId) return;
      if (!grouped[load.sectionId]) grouped[load.sectionId] = [];
      grouped[load.sectionId].push(load);
    });
    return grouped;
  }, [loads]);

  const orderedSections = useMemo(() => {
    const gradeOrder = { 'Grade 7': 1, 'Grade 8': 2, 'Grade 9': 3, 'Grade 10': 4, 'Grade 11': 5, 'Grade 12': 6 };
    return [...sections].sort((a, b) => {
      const orderA = gradeOrder[a.gradeLevel] || 99;
      const orderB = gradeOrder[b.gradeLevel] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [sections]);

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
      alert('Please select a teacher, subject, and grade level.');
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

      for (let j = 0; j < i; j++) {
        const prevAssignment = form.assignments[j];
        checkOverlap({
          teacherId,
          sectionId: prevAssignment.sectionId,
          subject: form.subject,
          schedule: prevAssignment.schedule
        });
      }
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
        sectionId: assignment.sectionId || '',
        sectionName: section?.name ? `${section.gradeLevel} - ${section.name}` : '',
        schedule: assignment.schedule,
      };

      const result = editingId
        ? await updateLoad(editingId, payload)
        : await addLoad(payload);

      if (!result.success) {
        allSuccess = false;
        alert(result.error || 'Unable to save teaching load.');
        break;
      }
    }

    if (allSuccess) {
      setShowModal(false);
      setForm(getEmptyForm());
      setEditingId(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await saveLoad();
  };

  const handleCopy = async (e) => {
    e.preventDefault();
    if (!copyYear) return;
    const result = await copyLoads(copyYear);
    if (result.success) {
      setShowCopyModal(false);
      setCopyYear('');
    } else {
      alert(result.error || 'Unable to copy teaching loads.');
    }
  };

  const handleDelete = async (loadId) => {
    if (!window.confirm('Remove this teaching load entry?')) return;
    const result = await deleteLoad(loadId);
    if (!result.success) {
      alert(result.error || 'Unable to delete teaching load.');
    }
  };

  if (loading) {
    return <div className="teaching-load-page"><p>Loading teaching load...</p></div>;
  }

  if (error) {
    return <div className="teaching-load-page"><p className="error-text">{error}</p></div>;
  }

  return (
    <div className="teaching-load-page">
      <div className="teaching-load-header">
        <div>
          <h1>Teaching Load & Class Program</h1>
          <p className="subtitle">
            Subject assignments and schedules for Academic Year <strong>{academicYear}</strong>.
          </p>
        </div>
        <div>
          <button type="button" className="primary-btn" onClick={openAdd}>
            + Add Assignment
          </button>
          <button type="button" className="secondary-btn" onClick={() => setShowCopyModal(true)} style={{ marginLeft: '8px' }}>
            Copy Loads from Year
          </button>
          {isAdmin && (
            <button type="button" className="secondary-btn" onClick={() => setShowBreaksModal(true)} style={{ marginLeft: '8px' }}>
              Manage Schedule Breaks
            </button>
          )}
        </div>
      </div>

      <div className="tab-bar" style={{ gap: '1rem', borderBottom: 'none', marginBottom: '20px' }}>
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

      {activeTab === 'teacher' && (
        <div className="teaching-load-filters">
          <label htmlFor="filterTeacher">Filter by Teacher</label>
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

      {loads.length === 0 ? (
        <div className="teaching-load-empty">
          <p>No teaching load entries for {academicYear} yet.</p>
          <button type="button" className="primary-btn" onClick={openAdd}>
            Add First Assignment
          </button>
        </div>
      ) : (
        <div className="teaching-load-groups">
          {(activeTab === 'master' || activeTab === 'my_advisory') && (
            <div className="master-schedule-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
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
                  loads={activeTab === 'master' ? loads : allLoads.filter(l => myAdvisorySections.some(mys => mys.id === l.sectionId))} 
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
            Object.entries(loadsByTeacher).map(([teacherId, teacherLoads]) => (
              <section key={teacherId} className="teacher-load-card">
                <h2>{teacherNameById[teacherId] || 'Unknown Teacher'}</h2>
                <div className="table-wrapper">
                  <table className="teaching-load-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Grade Level</th>
                        <th>Section</th>
                        <th>Schedule</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherLoads.map((load) => (
                        <tr key={load.id}>
                          <td>{load.subject}</td>
                          <td>{load.gradeLevel}</td>
                          <td>{load.sectionName || '—'}</td>
                          <td>{renderSchedule(load.schedule)}</td>
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingId ? 'Edit Assignment' : 'Add Assignment'}</h2>
            <p className="modal-note">This applies only to school year {academicYear}.</p>
            <form onSubmit={(e) => e.preventDefault()}>
              {isAdmin && (
                <div className="form-group">
                  <label>Teacher</label>
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
                  <label>Subject</label>
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
                  <label>Grade Level</label>
                  <select name="gradeLevel" value={form.gradeLevel} onChange={handleChange} required>
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {form.assignments.map((assignment, index) => (
                <div key={assignment.id} className="assignment-block" style={{ background: 'var(--gray-50)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--gray-200)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--primary-blue)' }}>Schedule #{index + 1}</h4>
                    {form.assignments.length > 1 && !editingId && (
                      <button 
                        type="button" 
                        className="text-btn danger" 
                        style={{ fontSize: '0.8rem' }}
                        onClick={() => setForm(prev => ({ ...prev, assignments: prev.assignments.filter(a => a.id !== assignment.id) }))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Section (optional)</label>
                    <select 
                      value={assignment.sectionId} 
                      onChange={(e) => {
                        const newAssignments = [...form.assignments];
                        newAssignments[index].sectionId = e.target.value;
                        setForm(prev => ({ ...prev, assignments: newAssignments }));
                      }}
                    >
                      <option value="">No specific section</option>
                      {sections
                        .filter(s => s.gradeLevel === form.gradeLevel)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.gradeLevel} - {s.name}
                          </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group schedule-form-group" style={{ marginBottom: 0 }}>
                    <label>Schedule (Select Days & Time)</label>
                    <div className="schedule-compact-input" style={{ background: 'var(--white)' }}>
                      <div className="days-selection">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                          <label key={day} className="checkbox-label day-checkbox-compact">
                            <input 
                              type="checkbox" 
                              checked={assignment.schedule.days.includes(day)}
                              onChange={(e) => {
                                const newAssignments = [...form.assignments];
                                const currentDays = newAssignments[index].schedule.days;
                                newAssignments[index].schedule.days = e.target.checked 
                                  ? [...currentDays, day]
                                  : currentDays.filter(d => d !== day);
                                setForm(prev => ({ ...prev, assignments: newAssignments }));
                              }}
                            />
                            {day.substring(0, 3)}
                          </label>
                        ))}
                      </div>
                      <div className="time-selection form-row">
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Start Time</label>
                          <input 
                            type="time" 
                            value={assignment.schedule.startTime}
                            onChange={(e) => {
                              const newAssignments = [...form.assignments];
                              newAssignments[index].schedule.startTime = e.target.value;
                              setForm(prev => ({ ...prev, assignments: newAssignments }));
                            }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>End Time</label>
                          <input 
                            type="time" 
                            value={assignment.schedule.endTime}
                            onChange={(e) => {
                              const newAssignments = [...form.assignments];
                              newAssignments[index].schedule.endTime = e.target.value;
                              setForm(prev => ({ ...prev, assignments: newAssignments }));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {!editingId && (
                <button 
                  type="button" 
                  className="secondary-btn" 
                  style={{ width: '100%', marginBottom: '1rem', borderStyle: 'dashed' }}
                  onClick={() => setForm(prev => ({
                    ...prev,
                    assignments: [
                      ...prev.assignments,
                      { id: Date.now(), sectionId: '', schedule: JSON.parse(JSON.stringify(defaultSchedule)) }
                    ]
                  }))}
                >
                  + Add Another Time Schedule
                </button>
              )}

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="button" className="primary-btn" onClick={handleSave}>
                  {editingId ? 'Save Changes' : 'Save All'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBreaksModal && (
        <div className="modal-overlay">
          <div className="modal-content breaks-modal">
            <div className="modal-header">
              <h2>Manage Schedule Breaks</h2>
              <button className="icon-btn close-btn" onClick={() => setShowBreaksModal(false)}>&times;</button>
            </div>
            <p className="modal-desc">These breaks will be applied universally across all sections for AY {academicYear}.</p>
            
            <div className="breaks-container">
              <div className="breaks-form-section">
                <h3>Add New Break</h3>
                <div className="breaks-form">
                  <div className="form-group">
                    <label>Break Name</label>
                    <input type="text" placeholder="e.g. Lunch Break" value={breakForm.name} onChange={e => setBreakForm({...breakForm, name: e.target.value})} />
                  </div>
                  <div className="time-row">
                    <div className="form-group">
                      <label>Start Time</label>
                      <input type="time" value={breakForm.startTime} onChange={e => setBreakForm({...breakForm, startTime: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>End Time</label>
                      <input type="time" value={breakForm.endTime} onChange={e => setBreakForm({...breakForm, endTime: e.target.value})} />
                    </div>
                  </div>
                  <button type="button" className="primary-btn add-break-btn" onClick={async () => {
                    if (!breakForm.name || !breakForm.startTime || !breakForm.endTime) {
                      alert('Please fill out all fields');
                      return;
                    }
                    const res = await addBreak(breakForm);
                    if (res.success) setBreakForm({ name: '', startTime: '', endTime: '' });
                    else alert(res.error);
                  }}>
                    + Add Break
                  </button>
                </div>
              </div>
              
              <div className="breaks-list-section">
                <h3>Current Breaks</h3>
                <div className="breaks-list">
                  {breaks.length === 0 ? (
                    <div className="empty-breaks">
                      <span className="empty-icon">☕</span>
                      <p>No breaks defined yet.</p>
                    </div>
                  ) : (
                    <div className="break-cards">
                      {breaks.map(b => (
                        <div className="break-card" key={b.id}>
                          <div className="break-info">
                            <h4>{b.name}</h4>
                            <span className="break-time-badge">{formatTime(b.startTime)} - {formatTime(b.endTime)}</span>
                          </div>
                          <button type="button" className="icon-btn delete-btn" title="Remove Break" onClick={() => {
                            if (window.confirm('Delete this break?')) deleteBreak(b.id);
                          }}>
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCopyModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2>Copy Teaching Loads</h2>
                <p>Select the source academic year to copy loads from.</p>
                <form onSubmit={handleCopy}>
                  <div className="form-group">
                    <label>Source Year</label>
                    <select value={copyYear} onChange={(e) => setCopyYear(e.target.value)} required>
                      <option value="">Select year</option>
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="secondary-btn" onClick={() => setShowCopyModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="primary-btn">
                      Copy Loads
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
    </div>
  );
};

export default TeachingLoadPage;
