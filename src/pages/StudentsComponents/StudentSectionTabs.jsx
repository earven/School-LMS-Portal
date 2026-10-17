import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';

/**
 * Section Tab Navigation Pills
 * Allows instant, section-first navigation across sections with learner count badges.
 * Supports horizontal scrolling with scroll indicators.
 */
const StudentSectionTabs = ({
  assignedSections = [],
  allStudents = [],
  filterSection = 'All',
  onSectionChange,
  isAdmin = true,
  filterGrade = 'All'
}) => {
  const scrollContainerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Compute enrollment counts per section
  const { countsBySection, unassignedCount, totalAssignedCount } = useMemo(() => {
    const counts = {};
    let unassigned = 0;
    let totalAssigned = 0;

    const assignedIds = new Set(assignedSections.map(s => s.id));

    allStudents.forEach(student => {
      const sId = student.sectionId;
      if (!sId || sId === 'unassigned') {
        unassigned++;
      } else {
        counts[sId] = (counts[sId] || 0) + 1;
        if (isAdmin || assignedIds.has(sId)) {
          totalAssigned++;
        }
      }
    });

    return { countsBySection: counts, unassignedCount: unassigned, totalAssignedCount: totalAssigned };
  }, [allStudents, assignedSections, isAdmin]);

  // Filter sections by grade if grade filter is active, and sort cleanly
  const visibleSections = useMemo(() => {
    let list = [...assignedSections];
    if (filterGrade !== 'All') {
      const targetNum = filterGrade.replace(/\D/g, '');
      list = list.filter(s => (s.gradeLevel || '').replace(/\D/g, '') === targetNum);
    }

    return list.sort((a, b) => {
      const gA = parseInt((a.gradeLevel || '').replace(/\D/g, ''), 10) || 0;
      const gB = parseInt((b.gradeLevel || '').replace(/\D/g, ''), 10) || 0;
      if (gA !== gB) return gA - gB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [assignedSections, filterGrade]);

  // Check scroll position to display overflow arrows
  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, visibleSections]);

  const handleScroll = (direction) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = direction === 'left' ? -240 : 240;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  // Helper to format Grade tag (e.g. "Grade 7" -> "G7")
  const formatGradeShort = (gradeLevel) => {
    if (!gradeLevel) return '';
    const match = gradeLevel.match(/\d+/);
    return match ? `G${match[0]}` : gradeLevel;
  };

  const showAllPill = isAdmin || assignedSections.length > 1;

  return (
    <div className="section-tabs-wrapper card">
      <div className="section-tabs-header">
        <div className="section-tabs-title-group">
          <span className="section-tabs-title">Sections</span>
          <span className="section-tabs-subtitle">
            {visibleSections.length} {visibleSections.length === 1 ? 'section' : 'sections'} available
          </span>
        </div>

        {/* Scroll action buttons */}
        <div className="section-tabs-nav-btns">
          <button
            type="button"
            className="tab-scroll-btn"
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll sections left"
          >
            ‹
          </button>
          <button
            type="button"
            className="tab-scroll-btn"
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            aria-label="Scroll sections right"
          >
            ›
          </button>
        </div>
      </div>

      <div 
        className="section-tabs-scroll-area"
        ref={scrollContainerRef}
        onScroll={checkScroll}
        role="tablist"
        aria-label="Section navigation tabs"
      >
        {/* All Sections Pill */}
        {showAllPill && (
          <button
            type="button"
            role="tab"
            aria-selected={filterSection === 'All'}
            className={`section-tab-pill ${filterSection === 'All' ? 'active' : ''}`}
            onClick={() => onSectionChange('All')}
          >
            <span className="tab-pill-icon">🏛️</span>
            <span className="tab-pill-name">All Sections</span>
            <span className="tab-pill-count">
              {filterGrade !== 'All' 
                ? visibleSections.reduce((acc, s) => acc + (countsBySection[s.id] || 0), 0)
                : totalAssignedCount}
            </span>
          </button>
        )}

        {/* Individual Section Pills */}
        {visibleSections.map(section => {
          const count = countsBySection[section.id] || 0;
          const isActive = filterSection === section.id;
          const gradeShort = formatGradeShort(section.gradeLevel);

          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`section-tab-pill ${isActive ? 'active' : ''}`}
              onClick={() => onSectionChange(section.id)}
              title={`${section.name} (${section.gradeLevel})${section.adviserName ? ` • Adviser: ${section.adviserName}` : ''}${section.room ? ` • Room: ${section.room}` : ''}`}
            >
              <span className="tab-pill-name">{section.name}</span>
              {gradeShort && (
                <span className="tab-pill-grade">{gradeShort}</span>
              )}
              <span className={`tab-pill-count ${count === 0 ? 'zero' : ''}`}>
                {count}
              </span>
            </button>
          );
        })}

        {/* Unassigned Students Pill (visible if any exist) */}
        {unassignedCount > 0 && (
          <button
            type="button"
            role="tab"
            aria-selected={filterSection === 'unassigned'}
            className={`section-tab-pill pill-unassigned ${filterSection === 'unassigned' ? 'active' : ''}`}
            onClick={() => onSectionChange('unassigned')}
            title={`${unassignedCount} learners have not been assigned to any section`}
          >
            <span className="tab-pill-icon">⚠️</span>
            <span className="tab-pill-name">Unassigned</span>
            <span className="tab-pill-count unassigned-count">{unassignedCount}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default StudentSectionTabs;
