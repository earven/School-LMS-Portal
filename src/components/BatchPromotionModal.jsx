import React, { useState, useMemo, useEffect } from 'react';
import { useStudents } from '../context/StudentContext';
import { useSections } from '../context/SectionContext';
import { useSettings } from '../context/SettingsContext';
import { buildFullName } from '../utils/personnelName';
import './BatchPromotionModal.css';

const GRADE_LEVELS = [
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
  'Graduated'
];

const getNextGradeLevel = (currentGrade) => {
  const idx = GRADE_LEVELS.indexOf(currentGrade);
  if (idx !== -1 && idx < GRADE_LEVELS.length - 1) {
    return GRADE_LEVELS[idx + 1];
  }
  if (currentGrade === 'Grade 12') {
    return 'Graduated';
  }
  return currentGrade;
};

const getNextAcademicYear = (currentAY) => {
  if (!currentAY) return '2026-2027';
  const parts = currentAY.split('-');
  if (parts.length === 2) {
    const y1 = parseInt(parts[0], 10);
    const y2 = parseInt(parts[1], 10);
    if (!isNaN(y1) && !isNaN(y2)) {
      return `${y1 + 1}-${y2 + 1}`;
    }
  }
  return '2026-2027';
};

const BatchPromotionModal = ({ initialSectionId = null, selectedStudents = [], onClose }) => {
  const { students, promoteStudents } = useStudents();
  const { sections } = useSections();
  const { settings, sessionAcademicYear } = useSettings();

  const currentAcademicYear = sessionAcademicYear || settings?.academicYear || '2025-2026';
  const defaultTargetYear = getNextAcademicYear(currentAcademicYear);

  // Map students by section
  const studentsBySection = useMemo(() => {
    const map = {};
    (students || []).forEach(s => {
      const secId = s.sectionId || 'unassigned';
      if (!map[secId]) map[secId] = [];
      map[secId].push(s);
    });
    return map;
  }, [students]);

  // Group sections by grade level for the section selector
  const sectionsByGrade = useMemo(() => {
    const gradeOrder = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    return gradeOrder.map(grade => ({
      grade,
      sections: (sections || []).filter(s => s.gradeLevel === grade)
    })).filter(g => g.sections.length > 0);
  }, [sections]);

  const unassignedCount = useMemo(() => {
    return (studentsBySection['unassigned'] || []).length;
  }, [studentsBySection]);

  // Active section state - prevents mixing sections together!
  const [activeSectionId, setActiveSectionId] = useState(() => {
    if (initialSectionId) return initialSectionId;
    if (selectedStudents && selectedStudents.length > 0 && selectedStudents[0].sectionId) {
      return selectedStudents[0].sectionId;
    }
    const firstSecWithStudents = (sections || []).find(s => (studentsBySection[s.id] || []).length > 0);
    return firstSecWithStudents ? firstSecWithStudents.id : ((sections && sections[0]?.id) || 'unassigned');
  });

  const activeSection = useMemo(() => {
    if (activeSectionId === 'unassigned') {
      return { id: 'unassigned', name: 'Unassigned Learners', gradeLevel: 'General' };
    }
    return (sections || []).find(s => s.id === activeSectionId) || null;
  }, [activeSectionId, sections]);

  // Students belonging strictly to the active section
  const activeSectionLearners = useMemo(() => {
    if (activeSectionId === 'unassigned') {
      return studentsBySection['unassigned'] || [];
    }
    return studentsBySection[activeSectionId] || [];
  }, [studentsBySection, activeSectionId]);

  // Target Settings for THIS Section
  const [targetAcademicYear, setTargetAcademicYear] = useState(defaultTargetYear);
  const [sectionTargetGrade, setSectionTargetGrade] = useState(() => {
    const currentGrade = activeSection?.gradeLevel || 'Grade 7';
    return getNextGradeLevel(currentGrade);
  });
  const [sectionTargetSectionId, setSectionTargetSectionId] = useState('');

  // Per-student promotion state for THIS section
  const [studentPromotions, setStudentPromotions] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Initialize/re-sync promotions when active section changes
  useEffect(() => {
    const nextGrade = getNextGradeLevel(activeSection?.gradeLevel || 'Grade 7');
    setSectionTargetGrade(nextGrade);
    setSectionTargetSectionId('');
    setSuccessMessage(null);
    setSearchFilter('');

    setStudentPromotions(activeSectionLearners.map(s => ({
      studentId: s.id,
      lrn: s.lrn || s.id,
      fullName: buildFullName({
        lastName: s.lastName,
        firstName: s.firstName,
        middleName: s.middleName,
        nameExtension: s.extension
      }),
      gender: s.gender || 'Male',
      currentGrade: s.gradeLevel || activeSection?.gradeLevel || 'Grade 7',
      currentSectionId: s.sectionId || '',
      status: 'Promoted', // 'Promoted' | 'Retained' | 'For SRC' | 'Transferred Out' | 'Dropped'
      targetGradeLevel: nextGrade,
      targetSectionId: ''
    })));
  }, [activeSectionId, activeSectionLearners, activeSection]);

  // Available sections for the target grade
  const targetGradeSections = useMemo(() => {
    if (sectionTargetGrade === 'Graduated') return [];
    return (sections || []).filter(sec => sec.gradeLevel === sectionTargetGrade && sec.id !== activeSectionId);
  }, [sections, sectionTargetGrade, activeSectionId]);

  // Global target grade change handler for this section
  const handleSectionTargetGradeChange = (grade) => {
    setSectionTargetGrade(grade);
    setSectionTargetSectionId('');
    setStudentPromotions(prev => prev.map(p => ({
      ...p,
      targetGradeLevel: p.status === 'Promoted' || p.status === 'For SRC' ? grade : p.currentGrade,
      targetSectionId: ''
    })));
  };

  // Global target section change handler for this section
  const handleSectionTargetSectionChange = (secId) => {
    setSectionTargetSectionId(secId);
    setStudentPromotions(prev => prev.map(p => ({
      ...p,
      targetSectionId: p.status === 'Promoted' || p.status === 'For SRC' ? secId : ''
    })));
  };

  // Quick Batch Helpers for this section
  const handlePromoteAll = () => {
    setStudentPromotions(prev => prev.map(p => ({
      ...p,
      status: 'Promoted',
      targetGradeLevel: sectionTargetGrade,
      targetSectionId: sectionTargetSectionId
    })));
  };

  const handleRetainAll = () => {
    setStudentPromotions(prev => prev.map(p => ({
      ...p,
      status: 'Retained',
      targetGradeLevel: p.currentGrade,
      targetSectionId: ''
    })));
  };

  const handleForSRCAll = () => {
    setStudentPromotions(prev => prev.map(p => ({
      ...p,
      status: 'For SRC',
      targetGradeLevel: sectionTargetGrade,
      targetSectionId: sectionTargetSectionId
    })));
  };

  const handleStudentStatusChange = (studentId, newStatus) => {
    setStudentPromotions(prev => prev.map(p => {
      if (p.studentId === studentId) {
        let nextGrade = p.currentGrade;
        let nextSec = '';
        if (newStatus === 'Promoted' || newStatus === 'For SRC') {
          nextGrade = sectionTargetGrade;
          nextSec = sectionTargetSectionId;
        } else if (newStatus === 'Retained') {
          nextGrade = p.currentGrade;
          nextSec = '';
        }
        return {
          ...p,
          status: newStatus,
          targetGradeLevel: nextGrade,
          targetSectionId: nextSec
        };
      }
      return p;
    }));
  };

  const handleIndividualTargetGradeChange = (studentId, grade) => {
    setStudentPromotions(prev => prev.map(p => 
      p.studentId === studentId ? { ...p, targetGradeLevel: grade, targetSectionId: '' } : p
    ));
  };

  const handleIndividualTargetSectionChange = (studentId, secId) => {
    setStudentPromotions(prev => prev.map(p => 
      p.studentId === studentId ? { ...p, targetSectionId: secId } : p
    ));
  };

  // Filter learners in table by search
  const displayedPromotions = useMemo(() => {
    if (!searchFilter.trim()) return studentPromotions;
    const q = searchFilter.toLowerCase();
    return studentPromotions.filter(p => 
      p.fullName.toLowerCase().includes(q) || 
      p.lrn.toLowerCase().includes(q)
    );
  }, [studentPromotions, searchFilter]);

  const summaryCounts = useMemo(() => {
    const counts = { Promoted: 0, Retained: 0, 'For SRC': 0, Other: 0 };
    for (const p of studentPromotions) {
      if (counts[p.status] !== undefined) {
        counts[p.status]++;
      } else {
        counts.Other++;
      }
    }
    return counts;
  }, [studentPromotions]);

  // Execute promotion for this specific section
  const handleExecutePromotion = async () => {
    if (!targetAcademicYear) {
      alert('Please specify the target academic year.');
      return;
    }

    if (studentPromotions.length === 0) {
      alert(`No learners found in Section "${activeSection?.name || 'Selected'}".`);
      return;
    }

    const sectionLabel = activeSection?.name || 'Selected Section';
    const confirmMsg = `Execute EOSY Rollover for Section: "${sectionLabel}" (${studentPromotions.length} learners) to AY ${targetAcademicYear}?\n\nThis will safely promote learners while preserving their current AY ${currentAcademicYear} academic history.`;
    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    setSuccessMessage(null);
    try {
      const promotionsPayload = studentPromotions.map(p => ({
        studentId: p.studentId,
        status: p.status,
        targetGradeLevel: p.targetGradeLevel,
        targetSectionId: p.targetSectionId || sectionTargetSectionId || ''
      }));

      const res = await promoteStudents(
        promotionsPayload, 
        targetAcademicYear, 
        sectionTargetGrade, 
        sectionTargetSectionId
      );

      if (res?.success) {
        setSuccessMessage(`✅ Successfully processed EOSY promotion for ${res.count} learners in "${sectionLabel}" to Academic Year ${targetAcademicYear}!`);
      }
    } catch (e) {
      alert(`Promotion failed: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="batch-promo-modal-overlay" onClick={onClose}>
      <div className="batch-promo-modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="batch-promo-header">
          <div>
            <div className="promo-header-title-row">
              <h2>🎓 End of School Year (EOSY) Promotion</h2>
              <span className="promo-ay-badge">Current: AY {currentAcademicYear}</span>
            </div>
            <p className="batch-promo-subtitle">
              Process learner progression by section. Sections are managed individually to prevent mixed cohorts.
            </p>
          </div>
          <button className="close-btn" onClick={onClose} title="Close">&times;</button>
        </div>

        {/* Section Selector Bar - The Primary Navigation */}
        <div className="promo-section-selector-card">
          <div className="promo-section-selector-row">
            <div className="promo-section-select-group">
              <label className="promo-section-select-label">
                📂 Select Section to Promote:
              </label>
              <select
                className="promo-section-dropdown"
                value={activeSectionId}
                onChange={e => setActiveSectionId(e.target.value)}
                disabled={isProcessing}
              >
                {sectionsByGrade.map(group => (
                  <optgroup key={group.grade} label={`--- ${group.grade} ---`}>
                    {group.sections.map(sec => {
                      const count = (studentsBySection[sec.id] || []).length;
                      return (
                        <option key={sec.id} value={sec.id}>
                          {sec.name} ({sec.gradeLevel}) — {count} learner{count === 1 ? '' : 's'}
                        </option>
                      );
                    })}
                  </optgroup>
                ))}
                {unassignedCount > 0 && (
                  <option value="unassigned">
                    Unassigned Learners — {unassignedCount} learner{unassignedCount === 1 ? '' : 's'}
                  </option>
                )}
              </select>
            </div>

            {/* Active Section Context Badge */}
            {activeSection && (
              <div className="promo-section-info-badge">
                <span className="sec-info-badge-item">
                  🏫 <strong>{activeSection.name}</strong>
                </span>
                <span className="sec-info-badge-item">
                  📚 {activeSection.gradeLevel}
                </span>
                {activeSection.adviserName && (
                  <span className="sec-info-badge-item">
                    👨‍🏫 Adviser: <strong>{activeSection.adviserName}</strong>
                  </span>
                )}
                <span className="sec-info-badge-item highlight">
                  👥 <strong>{activeSectionLearners.length}</strong> Enrolled
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Success Alert if just executed */}
        {successMessage && (
          <div className="promo-success-alert">
            <span>{successMessage}</span>
            <button 
              type="button" 
              className="promo-success-dismiss" 
              onClick={() => setSuccessMessage(null)}
            >
              ×
            </button>
          </div>
        )}

        {/* Target Settings Card for this section */}
        <div className="batch-promo-settings-card">
          <div className="promo-settings-grid">
            <div className="promo-field">
              <label>Target Academic Year *</label>
              <input
                type="text"
                value={targetAcademicYear}
                onChange={e => setTargetAcademicYear(e.target.value)}
                placeholder="e.g. 2026-2027"
                disabled={isProcessing}
              />
            </div>

            <div className="promo-field">
              <label>Target Grade for Promoted *</label>
              <select 
                value={sectionTargetGrade} 
                onChange={e => handleSectionTargetGradeChange(e.target.value)}
                disabled={isProcessing}
              >
                {GRADE_LEVELS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="promo-field">
              <label>Target Section for Promoted</label>
              <select
                value={sectionTargetSectionId}
                onChange={e => handleSectionTargetSectionChange(e.target.value)}
                disabled={isProcessing || sectionTargetGrade === 'Graduated'}
              >
                <option value="">-- Open Intake / Assign Later --</option>
                {targetGradeSections.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name} ({sec.gradeLevel})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action & Filter Toolbar for this Section */}
        <div className="promo-section-toolbar">
          <div className="promo-quick-actions">
            <span className="quick-action-label">Quick Tag:</span>
            <button 
              type="button" 
              className="promo-quick-btn btn-quick-promote"
              onClick={handlePromoteAll}
              title="Tag all learners in this section as Promoted"
              disabled={isProcessing || studentPromotions.length === 0}
            >
              ✅ Promote All
            </button>
            <button 
              type="button" 
              className="promo-quick-btn btn-quick-retain"
              onClick={handleRetainAll}
              title="Tag all learners in this section as Retained"
              disabled={isProcessing || studentPromotions.length === 0}
            >
              🔁 Retain All
            </button>
            <button 
              type="button" 
              className="promo-quick-btn btn-quick-src"
              onClick={handleForSRCAll}
              title="Tag all learners in this section for Summer Remedial Class"
              disabled={isProcessing || studentPromotions.length === 0}
            >
              📝 Tag for SRC
            </button>
          </div>

          <div className="promo-search-box">
            <input
              type="text"
              placeholder="Search learners by name or LRN..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="promo-search-input"
            />
            {searchFilter && (
              <button 
                type="button" 
                className="promo-search-clear" 
                onClick={() => setSearchFilter('')}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Summary Counter Bar */}
        <div className="promo-summary-bar">
          <span className="summary-tag tag-promoted">Promoted: <strong>{summaryCounts.Promoted}</strong></span>
          <span className="summary-tag tag-retained">Retained: <strong>{summaryCounts.Retained}</strong></span>
          <span className="summary-tag tag-conditional">For SRC: <strong>{summaryCounts['For SRC']}</strong></span>
          <span className="summary-tag tag-other">Transferred/Dropped: <strong>{summaryCounts.Other}</strong></span>
          <span className="summary-total">Section Total: <strong>{studentPromotions.length}</strong></span>
        </div>

        {/* Students Table for THIS section only */}
        <div className="batch-promo-table-wrapper">
          <table className="batch-promo-table">
            <thead>
              <tr>
                <th style={{ width: '38px', textAlign: 'center' }}>#</th>
                <th>Learner Name</th>
                <th style={{ width: '120px' }}>12-digit LRN</th>
                <th style={{ width: '70px' }}>Gender</th>
                <th style={{ width: '90px' }}>Current</th>
                <th style={{ width: '160px' }}>EOSY Status</th>
                <th style={{ width: '120px' }}>Target Grade</th>
                <th style={{ width: '150px' }}>Target Section</th>
              </tr>
            </thead>
            <tbody>
              {displayedPromotions.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    {searchFilter
                      ? `No learners found matching "${searchFilter}" in this section.`
                      : `No enrolled learners found in Section "${activeSection?.name || 'Selected'}".`}
                  </td>
                </tr>
              ) : (
                displayedPromotions.map((p, idx) => (
                  <tr key={p.studentId}>
                    <td style={{ textAlign: 'center', color: '#64748b', fontSize: '0.78rem' }}>{idx + 1}</td>
                    <td>
                      <strong>{p.fullName}</strong>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{p.lrn}</td>
                    <td>
                      <span className={`gender-tag tag-${(p.gender || 'male').toLowerCase()}`}>
                        {p.gender === 'Female' ? '👧 F' : '👦 M'}
                      </span>
                    </td>
                    <td>
                      <span className="badge-current-grade">{p.currentGrade}</span>
                    </td>
                    <td>
                      <select
                        className={`status-select select-${p.status.toLowerCase().replace(/\s+/g, '-')}`}
                        value={p.status}
                        onChange={e => handleStudentStatusChange(p.studentId, e.target.value)}
                        disabled={isProcessing}
                      >
                        <option value="Promoted">Promoted</option>
                        <option value="Retained">Retained</option>
                        <option value="For SRC">For SRC (Summer Remedial)</option>
                        <option value="Transferred Out">Transferred Out</option>
                        <option value="Dropped">Dropped / NLPA</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={p.targetGradeLevel}
                        onChange={e => handleIndividualTargetGradeChange(p.studentId, e.target.value)}
                        disabled={isProcessing || p.status === 'Retained' || p.status === 'Dropped'}
                        className="cell-select"
                      >
                        {GRADE_LEVELS.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={p.targetSectionId}
                        onChange={e => handleIndividualTargetSectionChange(p.studentId, e.target.value)}
                        disabled={isProcessing || p.status === 'Retained' || p.targetGradeLevel === 'Graduated'}
                        className="cell-select"
                      >
                        <option value="">-- Open Intake --</option>
                        {(sections || [])
                          .filter(sec => sec.gradeLevel === p.targetGradeLevel && sec.id !== activeSectionId)
                          .map(sec => (
                            <option key={sec.id} value={sec.id}>{sec.name}</option>
                          ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="batch-promo-footer">
          <div className="promo-footer-info">
            <span>
              Processing <strong>{activeSection?.name || 'Section'}</strong> ({studentPromotions.length} learners)
            </span>
          </div>
          <div className="promo-footer-buttons">
            <button 
              type="button" 
              className="secondary-btn" 
              onClick={onClose}
              disabled={isProcessing}
            >
              Close
            </button>
            <button 
              type="button" 
              className="primary-btn btn-execute-promo"
              onClick={handleExecutePromotion}
              disabled={isProcessing || studentPromotions.length === 0}
            >
              {isProcessing 
                ? 'Processing Rollover...' 
                : `🎓 Rollover ${activeSection?.name || 'Section'} (${studentPromotions.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchPromotionModal;
