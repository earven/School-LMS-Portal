import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useStudents } from '../context/StudentContext';
import { useSections } from '../context/SectionContext';
import { usePersonnel } from '../context/PersonnelContext';
import { buildFullName } from '../utils/personnelName';
import './CommandPalette.css';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings, updateSettings } = useSettings();
  
  // Dynamic Entities
  const studentContext = useStudents();
  const sectionContext = useSections();
  const personnelContext = usePersonnel();

  const students = studentContext?.students || [];
  const sections = sectionContext?.sections || [];
  const personnel = personnelContext?.personnel || [];

  const inputRef = useRef(null);
  const listRef = useRef(null);

  const isAdmin = ['admin', 'system_admin'].includes(user?.role);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const toggleTheme = () => {
    const isCurrentlyDark = document.body.classList.contains('dark') || settings?.theme === 'dark';
    const nextTheme = isCurrentlyDark ? 'light' : 'dark';
    if (updateSettings) updateSettings({ theme: nextTheme });
    document.body.classList.toggle('dark', nextTheme === 'dark');
  };

  // Base static items
  const staticItems = useMemo(() => [
    // Navigation
    { group: 'Navigation', id: 'nav-dashboard', label: 'Dashboard', category: 'Page', icon: '📊', action: () => navigate('/dashboard') },
    { group: 'Navigation', id: 'nav-students', label: 'Student Management (Masterlist)', category: 'Page', icon: '👨‍🎓', action: () => navigate('/students') },
    { group: 'Navigation', id: 'nav-personnel', label: 'Personnel & Teachers Directory', category: 'Page', icon: '👩‍🏫', action: () => navigate('/personnel') },
    { group: 'Navigation', id: 'nav-sections', label: 'Section Management', category: 'Page', icon: '🏫', action: () => navigate('/sections') },
    { group: 'Navigation', id: 'nav-calendar', label: 'School Calendar & Events', category: 'Page', icon: '📅', action: () => navigate('/calendar') },
    { group: 'Navigation', id: 'nav-messages', label: 'Faculty & Admin Messaging', category: 'Page', icon: '💬', action: () => navigate('/messages') },
    { group: 'Navigation', id: 'nav-tools', label: 'Teacher Tools Hub', category: 'Page', icon: '⚡', action: () => navigate('/teacher-tools') },
    { group: 'Navigation', id: 'nav-profile', label: 'My User Profile', category: 'Page', icon: '👤', action: () => navigate('/profile') },
    ...(isAdmin ? [
      { group: 'Navigation', id: 'nav-settings-main', label: 'System Settings', category: 'Admin', icon: '⚙️', action: () => navigate('/settings') },
      { group: 'Quick Actions', id: 'act-backup', label: 'Export Full School Backup Snapshot (.JSON)', category: 'Backup', icon: '💾', action: () => navigate('/settings?tab=data-management') },
      { group: 'Quick Actions', id: 'act-integrity', label: 'Run Relational Data Integrity Health Check', category: 'Admin', icon: '🩺', action: () => navigate('/settings?tab=data-management') },
      { group: 'Quick Actions', id: 'act-audit', label: 'View Security & Audit Trail Logs', category: 'Security', icon: '🛡️', action: () => navigate('/settings?tab=audit-logs') },
    ] : []),

    // Teacher Tools
    { group: 'Teacher Tools', id: 'tool-attendance', label: 'Attendance Tracker (SF2 / SF4)', category: 'Tool', icon: '📝', action: () => navigate('/teacher-tools/attendance') },
    { group: 'Teacher Tools', id: 'tool-teacher-att', label: 'Teacher Daily Attendance Log', category: 'Tool', icon: '⏱️', action: () => navigate('/teacher-tools/teacher-attendance') },
    { group: 'Teacher Tools', id: 'tool-records', label: 'Academic Record Tracker', category: 'Tool', icon: '📊', action: () => navigate('/teacher-tools/academic-records') },
    { group: 'Teacher Tools', id: 'tool-submissions', label: 'Student Submission Tracker', category: 'Tool', icon: '📥', action: () => navigate('/teacher-tools/submissions') },
    { group: 'Teacher Tools', id: 'tool-inventory', label: 'Inventory & Classroom Assets', category: 'Tool', icon: '📦', action: () => navigate('/teacher-tools/inventory') },
    { group: 'Teacher Tools', id: 'tool-memos', label: 'Memo Stocker & Circulars', category: 'Tool', icon: '📑', action: () => navigate('/teacher-tools/memos') },
    { group: 'Teacher Tools', id: 'tool-load', label: 'Teaching Load Schedule', category: 'Tool', icon: '⏱️', action: () => navigate('/teacher-tools/teaching-load') },
    { group: 'Teacher Tools', id: 'tool-load-gen', label: 'Teaching Load Schedule Generator', category: 'Tool', icon: '⚡', action: () => navigate('/teacher-tools/load-generator') },
    { group: 'Teacher Tools', id: 'tool-resources', label: 'Learning Resources Hub', category: 'Tool', icon: '📂', action: () => navigate('/teacher-tools/learning-resources') },

    // Quick Actions
    { group: 'Quick Actions', id: 'act-theme', label: 'Toggle Dark / Light Theme', category: 'Appearance', icon: '🌓', action: toggleTheme },
    { group: 'Quick Actions', id: 'act-logout', label: 'Sign Out of Account', category: 'Auth', icon: '🚪', action: logout }
  ], [navigate, logout, isAdmin, settings]);

  // Dynamic search across students, sections, and personnel when query is entered
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return staticItems;

    // Filter static commands
    const matchedStatic = staticItems.filter(
      item => item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );

    // Live Students Search (max 6 matches)
    const matchedStudents = [];
    for (const student of students) {
      const fullName = `${student.lastName || ''}, ${student.firstName || ''} ${student.middleName || ''}`.toLowerCase();
      const lrn = (student.id || student.lrn || '').toLowerCase();
      const gradeSec = (student.gradeLevel || '').toLowerCase();
      if (fullName.includes(q) || lrn.includes(q) || gradeSec.includes(q)) {
        const sec = sections.find(s => s.id === student.sectionId);
        matchedStudents.push({
          group: 'Learners',
          id: `student-${student.id}`,
          label: `${student.lastName}, ${student.firstName} ${student.extension || ''}`,
          sublabel: `LRN: ${student.id} • ${student.gradeLevel} - ${sec ? sec.name : (student.sectionId || 'Unassigned')}`,
          category: 'Learner',
          icon: '👨‍🎓',
          action: () => navigate(`/students?studentId=${student.id}&search=${student.id}`)
        });
        if (matchedStudents.length >= 6) break;
      }
    }

    // Live Sections Search (max 4 matches)
    const matchedSections = [];
    for (const sec of sections) {
      const name = (sec.name || '').toLowerCase();
      const grade = (sec.gradeLevel || '').toLowerCase();
      if (name.includes(q) || grade.includes(q)) {
        matchedSections.push({
          group: 'Sections',
          id: `section-${sec.id}`,
          label: `Section ${sec.name}`,
          sublabel: `${sec.gradeLevel ? `Grade ${sec.gradeLevel.replace(/\D/g, '')}` : ''} • ${sec.room ? `Room ${sec.room}` : ''}`,
          category: 'Section',
          icon: '🏫',
          action: () => navigate(`/sections?sectionId=${sec.id}`)
        });
        if (matchedSections.length >= 4) break;
      }
    }

    // Live Personnel Search (max 4 matches)
    const matchedPersonnel = [];
    for (const p of personnel) {
      const name = buildFullName({
        lastName: p.lastName,
        firstName: p.firstName,
        middleName: p.middleName,
        nameExtension: p.extension || p.nameExtension
      }).toLowerCase();
      const email = (p.email || '').toLowerCase();
      const pos = (p.position || p.role || '').toLowerCase();
      if (name.includes(q) || email.includes(q) || pos.includes(q)) {
        matchedPersonnel.push({
          group: 'Personnel',
          id: `personnel-${p.id || p.uid}`,
          label: buildFullName({
            lastName: p.lastName,
            firstName: p.firstName,
            middleName: p.middleName,
            nameExtension: p.extension || p.nameExtension
          }) || p.email || 'Personnel',
          sublabel: `${p.position || p.role || 'Faculty'} • ${p.email || ''}`,
          category: 'Personnel',
          icon: '👩‍🏫',
          action: () => navigate(`/personnel/${p.id || p.uid}`)
        });
        if (matchedPersonnel.length >= 4) break;
      }
    }

    return [
      ...matchedStudents,
      ...matchedSections,
      ...matchedPersonnel,
      ...matchedStatic
    ];
  }, [staticItems, search, students, sections, personnel, navigate]);

  const handleSelect = (item) => {
    setIsOpen(false);
    item.action();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cmd-palette-backdrop" onClick={() => setIsOpen(false)}>
      <div className="cmd-palette-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-search-header">
          <svg className="cmd-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="cmd-search-input"
            placeholder="Search learners, sections, teachers, tools, or commands..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <kbd className="cmd-esc-badge">ESC</kbd>
        </div>

        <div className="cmd-results-list" ref={listRef}>
          {filteredItems.length === 0 ? (
            <div className="cmd-empty-state">
              <p>No matching learners, staff, pages, or commands found for &quot;{search}&quot;</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={item.id}
                className={`cmd-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="cmd-item-icon">{item.icon}</div>
                <div className="cmd-item-info">
                  <span className="cmd-item-label">{item.label}</span>
                  {item.sublabel ? (
                    <span className="cmd-item-sublabel">{item.sublabel}</span>
                  ) : (
                    <span className="cmd-item-group">{item.group}</span>
                  )}
                </div>
                <span className={`badge cmd-item-badge badge-category-${item.category.toLowerCase()}`}>
                  {item.category}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="cmd-footer-tips">
          <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
          <span><kbd>↵</kbd> to select</span>
          <span><kbd>esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
