import React, { useMemo } from 'react';

/**
 * Summary Statistics Bar
 * Displays at-a-glance health metrics for the currently filtered roster:
 * Total learners, gender breakdown with visual ratio bar, nutritional flags,
 * 4Ps beneficiaries count, and non-active/transferred count.
 */
const StudentSummaryBar = ({ 
  students = [], 
  activeSectionName = '',
  activeSection = null,
  onManageSection = null 
}) => {
  const stats = useMemo(() => {
    const total = students.length;
    let maleCount = 0;
    let femaleCount = 0;
    let nutritionAlertCount = 0;
    let fourPsCount = 0;
    let inactiveCount = 0;

    for (let i = 0; i < total; i++) {
      const s = students[i];
      if (s.gender === 'Female') {
        femaleCount++;
      } else {
        maleCount++;
      }

      const ns = (s.nutritionalStatus || '').toLowerCase();
      if (ns.includes('wasted')) {
        nutritionAlertCount++;
      }

      if (s.is4Ps) {
        fourPsCount++;
      }

      if (s.status && s.status !== 'Active') {
        inactiveCount++;
      }
    }

    const malePercent = total > 0 ? Math.round((maleCount / total) * 100) : 0;
    const femalePercent = total > 0 ? 100 - malePercent : 0;

    return {
      total,
      maleCount,
      femaleCount,
      malePercent,
      femalePercent,
      nutritionAlertCount,
      fourPsCount,
      inactiveCount
    };
  }, [students]);

  return (
    <div className="student-summary-bar card" aria-label="Roster summary statistics">
      {/* Total Learners */}
      <div className="summary-stat-item">
        <div className="stat-icon-wrapper total-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-label">Total Learners</span>
          <div className="stat-value-row">
            <span className="stat-value">{stats.total}</span>
            {activeSectionName && (
              <span className="stat-scope-badge">{activeSectionName}</span>
            )}
          </div>
        </div>
      </div>

      <div className="summary-divider" />

      {/* Gender Distribution with visual ratio bar */}
      <div className="summary-stat-item gender-stat-item">
        <div className="stat-content full-width">
          <div className="gender-counts-header">
            <span className="stat-label">Gender Ratio</span>
            <div className="gender-legend">
              <span className="gender-count male">
                <span className="dot dot-male" /> {stats.maleCount} M ({stats.malePercent}%)
              </span>
              <span className="gender-count female">
                <span className="dot dot-female" /> {stats.femaleCount} F ({stats.femalePercent}%)
              </span>
            </div>
          </div>
          <div className="gender-ratio-bar" title={`Male: ${stats.malePercent}%, Female: ${stats.femalePercent}%`}>
            <div 
              className="gender-segment male" 
              style={{ width: `${stats.total > 0 ? stats.malePercent : 50}%` }} 
            />
            <div 
              className="gender-segment female" 
              style={{ width: `${stats.total > 0 ? stats.femalePercent : 50}%` }} 
            />
          </div>
        </div>
      </div>

      <div className="summary-divider" />

      {/* Nutritional Flags */}
      <div className="summary-stat-item">
        <div className={`stat-icon-wrapper nutrition-icon ${stats.nutritionAlertCount > 0 ? 'has-alert' : ''}`}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-label">Nutritional Alert</span>
          <div className="stat-value-row">
            <span className={`stat-value ${stats.nutritionAlertCount > 0 ? 'text-amber' : ''}`}>
              {stats.nutritionAlertCount}
            </span>
            <span className="stat-sublabel">Wasted / Sev.</span>
          </div>
        </div>
      </div>

      <div className="summary-divider" />

      {/* 4Ps Beneficiaries */}
      <div className="summary-stat-item">
        <div className="stat-icon-wrapper fourps-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-label">4Ps Program</span>
          <div className="stat-value-row">
            <span className="stat-value text-indigo">{stats.fourPsCount}</span>
            <span className="stat-sublabel">Beneficiaries</span>
          </div>
        </div>
      </div>

      <div className="summary-divider" />

      {/* Inactive / Irregular Statuses */}
      <div className="summary-stat-item">
        <div className={`stat-icon-wrapper status-icon ${stats.inactiveCount > 0 ? 'has-inactive' : ''}`}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-label">Other Status</span>
          <div className="stat-value-row">
            <span className={`stat-value ${stats.inactiveCount > 0 ? 'text-slate' : ''}`}>
              {stats.inactiveCount}
            </span>
            <span className="stat-sublabel">Transferred/Drop</span>
          </div>
        </div>
      </div>

      {/* Contextual Section Meta Ribbon (When a specific section is scoped) */}
      {activeSection && (
        <div className="section-meta-context-ribbon">
          <div className="section-meta-left">
            <span className="section-meta-chip">
              <span className="chip-icon">👤</span>
              <span className="chip-label">Adviser:</span>
              <strong className="chip-val">{activeSection.adviserName || 'Unassigned'}</strong>
            </span>
            {activeSection.room && (
              <span className="section-meta-chip">
                <span className="chip-icon">📍</span>
                <span className="chip-label">Room:</span>
                <strong className="chip-val">{activeSection.room}</strong>
              </span>
            )}
            {activeSection.trackStrand && (
              <span className="section-meta-chip">
                <span className="chip-icon">🎓</span>
                <span className="chip-label">Track/Strand:</span>
                <strong className="chip-val">{activeSection.trackStrand}</strong>
              </span>
            )}
          </div>
          {onManageSection && (
            <button 
              type="button"
              className="btn-manage-section-link"
              onClick={() => onManageSection(activeSection.id)}
              title="Open Section Configuration & Enrolment Intake Queue"
            >
              ⚙️ Manage Section & Intake →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentSummaryBar;
