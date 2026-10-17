import React from 'react';

const SettingsGradingTab = ({
  localSettings,
  handleInputChange,
  setLocalSettings,
}) => {
  return (
    <div className="tab-pane fade-in">
      {/* Term Grade Encoding Windows */}
      <div className="settings-card">
        <div className="card-header">
          <h2>Term Grade Encoding Windows & Controls</h2>
          <p className="card-subtitle">Manage open/locked submission windows for term grade computation and report card generation (DO 15, s. 2026 &amp; DO 009, s. 2026).</p>
        </div>
        <div className="card-body">
          <div className="grading-controls-grid">
            <div className="form-group">
              <label htmlFor="activeTerm">Active Reporting Term</label>
              <select
                id="activeTerm"
                name="activeTerm"
                value={localSettings.activeTerm || localSettings.activeQuarter || 'T1'}
                onChange={handleInputChange}
              >
                <option value="T1">Term 1</option>
                <option value="T2">Term 2</option>
                <option value="T3">Term 3</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="passingGrade">Passing Grade Threshold (DO 15, s. 2026: fixed at 75)</label>
              <input
                id="passingGrade"
                type="number"
                name="passingGrade"
                min="75"
                max="75"
                value={localSettings.passingGrade || 75}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="totalSchoolDays">Total Target School Days (DO 009, s. 2026: 201 days for SY 2026–2027, max 220)</label>
              <input
                id="totalSchoolDays"
                type="number"
                name="totalSchoolDays"
                min="180"
                max="220"
                value={localSettings.totalSchoolDays || 201}
                onChange={handleInputChange}
                placeholder="e.g. 201 Days (SY 2026-2027)"
              />
            </div>
          </div>

          <h4 className="sub-section-heading margin-top-lg">Term Grade Submission Window Status</h4>
          <p className="sub-section-desc">Locking a term prevents teachers from modifying finalized grades after the encoding deadline.</p>

          <div className="quarters-lock-grid">
            {[
              { key: 't1', label: 'Term 1', desc: '1st Grading Period' },
              { key: 't2', label: 'Term 2', desc: '2nd Grading Period' },
              { key: 't3', label: 'Term 3', desc: '3rd Grading Period (Final)' }
            ].map(q => {
              const isOpen = !!localSettings.gradingEncodingOpen?.[q.key];
              return (
                <div key={q.key} className={`quarter-lock-card ${isOpen ? 'open' : 'locked'}`}>
                  <div className="quarter-lock-header">
                    <strong>{q.label}</strong>
                    <span className={`status-pill ${isOpen ? 'pill-open' : 'pill-locked'}`}>
                      {isOpen ? '🟢 Open' : '🔒 Locked'}
                    </span>
                  </div>
                  <p className="quarter-lock-desc">{q.desc}</p>
                  <button
                    type="button"
                    className={`btn-quarter-toggle ${isOpen ? 'btn-lock' : 'btn-open'}`}
                    onClick={() => {
                      setLocalSettings(prev => ({
                        ...prev,
                        gradingEncodingOpen: {
                          ...(prev.gradingEncodingOpen || {}),
                          [q.key]: !isOpen
                        }
                      }));
                    }}
                  >
                    {isOpen ? 'Lock Submission 🔒' : 'Open Encoding Window 🔓'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* DepEd Classroom Assessment Weight Matrix */}
      <div className="settings-card margin-top-lg">
        <div className="card-header">
          <h2>DepEd Assessment Component Weight Distributions (DO 15, s. 2026)</h2>
          <p className="card-subtitle">Official component weights for computing Term Grades across learning areas.</p>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="weights-table">
              <thead>
                <tr>
                  <th>Learning Area / Track</th>
                  <th>Written Works (WW)</th>
                  <th>Performance Tasks (PT)</th>
                  <th>Examinations (EX)</th>
                  <th>Total Weight</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Languages, AP, EsP</strong>
                    <small>English, Filipino, Araling Panlipunan, Edukasyon sa Pagpapakatao</small>
                  </td>
                  <td><span className="weight-badge ww">20%</span></td>
                  <td><span className="weight-badge pt">50%</span></td>
                  <td><span className="weight-badge qa">30%</span></td>
                  <td><strong>100%</strong></td>
                </tr>
                <tr>
                  <td>
                    <strong>Science & Mathematics</strong>
                    <small>General Science, Biology, Chemistry, Physics, Math, Algebra, Geometry</small>
                  </td>
                  <td><span className="weight-badge ww">20%</span></td>
                  <td><span className="weight-badge pt">50%</span></td>
                  <td><span className="weight-badge qa">30%</span></td>
                  <td><strong>100%</strong></td>
                </tr>
                <tr>
                  <td>
                    <strong>MAPEH & EPP / TLE</strong>
                    <small>Music, Arts, PE, Health, Technology & Livelihood Education</small>
                  </td>
                  <td><span className="weight-badge ww">20%</span></td>
                  <td><span className="weight-badge pt">60%</span></td>
                  <td><span className="weight-badge qa">20%</span></td>
                  <td><strong>100%</strong></td>
                </tr>
                <tr>
                  <td>
                    <strong>Senior High - Academic Track</strong>
                    <small>STEM, ABM, HUMSS, GAS Core & Specialized Subjects</small>
                  </td>
                  <td><span className="weight-badge ww">20%</span></td>
                  <td><span className="weight-badge pt">50%</span></td>
                  <td><span className="weight-badge qa">30%</span></td>
                  <td><strong>100%</strong></td>
                </tr>
                <tr>
                  <td>
                    <strong>Senior High - TVL / Sports / Arts</strong>
                    <small>Technical-Vocational-Livelihood, ICT, Home Economics, Arts & Design</small>
                  </td>
                  <td><span className="weight-badge ww">20%</span></td>
                  <td><span className="weight-badge pt">60%</span></td>
                  <td><span className="weight-badge qa">20%</span></td>
                  <td><strong>100%</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsGradingTab;
