import React from 'react';
import { useNavigate } from 'react-router-dom';
import CardSkeleton from '../../../components/CardSkeleton';
import EmptyState from '../../../components/EmptyState';

const getStrandClass = (trackStrand = '') => {
  const s = (trackStrand || '').toUpperCase();
  if (s.includes('STEM')) return 'strand-stem';
  if (s.includes('ABM')) return 'strand-abm';
  if (s.includes('HUMSS')) return 'strand-humss';
  if (s.includes('GAS')) return 'strand-gas';
  if (s.includes('TVL') || s.includes('ICT') || s.includes('HE') || s.includes('IA')) return 'strand-tvl';
  return '';
};

const SectionsCardsGrid = ({
  displayedSections = [],
  students = [],
  loading = false,
  selectedSection = null,
  sectionSearchQuery = '',
  selectedGradeFilter = 'All',
  selectedStrandFilter = 'All',
  viewMode = 'JHS',
  onClearFilters,
  onSelectSection
}) => {
  const navigate = useNavigate();
  const isShs = viewMode === 'SHS';

  // For SHS, default to rendering both Grade 11 and Grade 12 side-by-side in 50/50 symmetry
  // unless user specifically filtered to a single grade.
  let sortedGrades = [];
  if (isShs) {
    if (selectedGradeFilter === 'All') {
      sortedGrades = ['Grade 11', 'Grade 12'];
    } else {
      sortedGrades = [selectedGradeFilter];
    }
  } else {
    sortedGrades = Array.from(new Set(displayedSections.map(s => s?.gradeLevel || 'Unknown')))
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 99;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 99;
        return numA - numB;
      });
  }

  const isFiltered = sectionSearchQuery || selectedGradeFilter !== 'All' || (isShs && selectedStrandFilter !== 'All');

  if (loading) {
    return (
      <div style={{ gridColumn: '1 / -1', width: '100%' }}>
        <CardSkeleton count={6} />
      </div>
    );
  }

  if (sortedGrades.length === 0 || (displayedSections.length === 0 && !isShs)) {
    return (
      <div style={{ gridColumn: '1 / -1', width: '100%' }}>
        <EmptyState
          icon="🏫"
          title="No Sections Found"
          description="No classroom sections match the active grade, strand, or search criteria."
          actionLabel={isFiltered ? "Clear Filters" : undefined}
          onAction={onClearFilters}
        />
      </div>
    );
  }

  const isSingleGrade = sortedGrades.length === 1;
  const containerClassName = `sections-grouped-container ${isShs ? 'shs-symmetrical-view' : ''} ${isSingleGrade ? 'single-grade-view' : ''}`;

  return (
    <div className={containerClassName}>
      {sortedGrades.map((gradeLevel) => {
        const sectionsInGrade = displayedSections.filter(s => (s?.gradeLevel || 'Unknown') === gradeLevel);
        const secIdsInGrade = new Set(sectionsInGrade.map(s => s?.id));
        const gradeStudents = students.filter(s => secIdsInGrade.has(s.sectionId));
        const totalMale = gradeStudents.filter(s => s.gender === 'Male').length;
        const totalFemale = gradeStudents.filter(s => s.gender === 'Female').length;
        const total4Ps = gradeStudents.filter(s => s.is4Ps).length;

        return (
          <div 
            key={gradeLevel} 
            className={`grade-level-group ${isShs ? 'shs-grade-group' : ''} ${isSingleGrade ? 'full-width-grade' : ''}`}
          >
            {/* GRADE HEADER WITH BALANCED METRICS */}
            <div className="shs-grade-header">
              <div className="shs-grade-title">
                <span>{isShs ? '🎓' : '📘'}</span>
                <h3>{gradeLevel}</h3>
                {isShs && <span className="shs-cohort-tag">Senior High</span>}
              </div>

              <div className="shs-grade-stats-pills">
                <span className="shs-stat-chip">
                  {sectionsInGrade.length} {sectionsInGrade.length === 1 ? 'Section' : 'Sections'}
                </span>
                <span className="shs-stat-chip chip-learners">
                  👥 {gradeStudents.length} Learners
                </span>
                <span className="shs-stat-chip chip-gender">
                  👦 {totalMale} | 👧 {totalFemale}
                </span>
                {total4Ps > 0 && (
                  <span className="shs-stat-chip chip-4ps" title="4Ps Beneficiaries">
                    4Ps: {total4Ps}
                  </span>
                )}
              </div>
            </div>

            {/* SECTION CARDS GRID */}
            <div className="sections-list">
              {sectionsInGrade.length === 0 ? (
                <div className="shs-empty-grade-slot">
                  <span className="empty-slot-icon">🏫</span>
                  <h4>No {gradeLevel} Sections Available</h4>
                  <p>
                    {isFiltered 
                      ? 'No sections in this grade match your search/strand filter.' 
                      : `No sections have been created for ${gradeLevel} yet.`}
                  </p>
                  {isFiltered && (
                    <button 
                      type="button" 
                      className="primary-btn btn-xs"
                      onClick={onClearFilters}
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                sectionsInGrade.map((section, index) => {
                  const secStudents = students.filter(s => s.sectionId === section?.id);
                  const maleCount = secStudents.filter(s => s.gender === 'Male').length;
                  const femaleCount = secStudents.filter(s => s.gender === 'Female').length;
                  const fourPsCount = secStudents.filter(s => s.is4Ps).length;
                  const strandClass = getStrandClass(section.trackStrand);

                  return (
                    <div 
                      key={section?.id || index} 
                      className={`section-list-item ${selectedSection?.id === section?.id ? 'selected' : ''}`}
                      onClick={() => onSelectSection(section, 'details')}
                    >
                      <div className="list-item-status">
                        <span className={`status-dot ${section?.isActive ? 'active' : 'inactive'}`}></span>
                      </div>
                      
                      <div className="list-item-main">
                        <div className="sec-header-line">
                          <h4 className="section-name-compact" title={section?.name}>
                            {section?.name || 'Unnamed Section'}
                          </h4>
                          {section.room && <span className="room-badge">📍 {section.room}</span>}
                          {section.trackStrand && (
                            <span className={`strand-badge ${strandClass}`}>
                              {section.trackStrand}
                            </span>
                          )}
                        </div>
                        <span className="adviser-name-compact">
                          👨‍🏫 Adviser: {section?.adviserName || 'No Adviser Assigned'}
                        </span>
                      </div>
                      
                      <div className="list-item-stats">
                        <span className="compact-stat total-learners-pill">
                          👥 {secStudents.length} Learners
                        </span>
                        <span className="compact-stat">👦 {maleCount} | 👧 {femaleCount}</span>
                        {fourPsCount > 0 && (
                          <span className="compact-stat highlight-4ps">4Ps: {fourPsCount}</span>
                        )}
                      </div>
                      
                      <div className="list-item-actions">
                        <div className="actions-button-group">
                          <button 
                            type="button"
                            className="manage-icon-btn btn-manage-info"
                            title="View and edit section info, adviser, and room"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectSection(section, 'details');
                            }}
                          >
                            ⚙️ Edit Info
                          </button>
                          <button 
                            type="button"
                            className="manage-icon-btn btn-card-roster"
                            title="Manage enrolled learners and intake queue"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectSection(section, 'students');
                            }}
                          >
                            👥 Roster
                          </button>
                          <button 
                            type="button"
                            className="btn-card-masterlist"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/students?sectionId=${section.id}`);
                            }}
                            title="Open full Learner Masterlist with batch actions, ID badges, and SF1"
                          >
                            📋 Masterlist
                          </button>
                        </div>
                        <span 
                          className="view-arrow" 
                          title="Open section details"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSection(section, 'details');
                          }}
                        >→</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SectionsCardsGrid;
