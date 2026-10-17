import React from 'react';

const SettingsDataManagementTab = ({
  handleExportBackup,
  isExportingBackup,
  fileInputRef,
  handleBackupFileSelect,
  handleRunIntegrityScan,
  isScanningIntegrity,
  integrityResults,
}) => {
  return (
    <div className="tab-pane fade-in">
      {/* Backup Card */}
      <div className="settings-card">
        <div className="card-header">
          <h2>Full School Disaster Recovery & Backup</h2>
          <p className="card-subtitle">Export a complete offline snapshot containing all school records for safe keeping or migration.</p>
        </div>
        <div className="card-body">
          <div className="backup-action-layout">
            <div className="backup-info-column">
              <div className="backup-feature-list">
                <div className="feature-item">
                  <span className="feature-bullet">✓</span>
                  <span>Comprehensive export of Students, Sections, Personnel, Attendance, Teaching Loads & Settings</span>
                </div>
                <div className="feature-item">
                  <span className="feature-bullet">✓</span>
                  <span>Human-readable & validated JSON schema (Version 1.0)</span>
                </div>
                <div className="feature-item">
                  <span className="feature-bullet">✓</span>
                  <span>Direct browser download — no server-side retention of raw backup packages</span>
                </div>
              </div>
            </div>
            <div className="backup-button-column">
              <button
                type="button"
                className="btn-primary-backup"
                onClick={handleExportBackup}
                disabled={isExportingBackup}
              >
                {isExportingBackup ? (
                  <>
                    <span className="spinner-backup"></span>
                    Generating Backup...
                  </>
                ) : (
                  <>
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                    Export School Snapshot (.JSON)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Restore Card */}
      <div className="settings-card margin-top-lg">
        <div className="card-header">
          <h2>Restore Data from Snapshot</h2>
          <p className="card-subtitle">Upload a previously exported LMS snapshot file to restore records into Firestore.</p>
        </div>
        <div className="card-body">
          <div className="restore-upload-box">
            <input
              type="file"
              id="backup-file-input"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleBackupFileSelect}
              style={{ display: 'none' }}
            />
            <label htmlFor="backup-file-input" className="restore-upload-label">
              <svg className="restore-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              <span className="restore-upload-title">Choose Backup File to Inspect & Restore</span>
              <span className="restore-upload-subtext">Accepts valid .JSON snapshot files created by School LMS Portal</span>
            </label>
          </div>
        </div>
      </div>

      {/* Data Integrity Scanner Card */}
      <div className="settings-card margin-top-lg">
        <div className="card-header">
          <h2>Relational Data Integrity Health Check</h2>
          <p className="card-subtitle">Verify that students, sections, and personnel records are properly connected without orphaned references.</p>
        </div>
        <div className="card-body">
          <div className="integrity-scan-header">
            <div>
              <p className="integrity-desc">Scans the active database for students assigned to deleted sections, sections referencing non-existent advisers, and duplicate LRNs.</p>
            </div>
            <button
              type="button"
              className="btn-scan-integrity"
              onClick={handleRunIntegrityScan}
              disabled={isScanningIntegrity}
            >
              {isScanningIntegrity ? (
                <>
                  <span className="spinner-backup"></span>
                  Scanning Relational Graph...
                </>
              ) : (
                <>
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Run Integrity Scan
                </>
              )}
            </button>
          </div>

          {integrityResults && (
            <div className="integrity-results-panel">
              <div className="integrity-stats-bar">
                <div className="stat-pill">
                  <span className="stat-label">Students Scanned</span>
                  <span className="stat-val">{integrityResults.summary.totalStudentsScanned}</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-label">Sections Scanned</span>
                  <span className="stat-val">{integrityResults.summary.totalSectionsScanned}</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-label">Personnel Scanned</span>
                  <span className="stat-val">{integrityResults.summary.totalPersonnelScanned}</span>
                </div>
                <div className={`stat-pill status ${integrityResults.healthy ? 'healthy' : 'issues'}`}>
                  <span className="stat-label">Health Status</span>
                  <span className="stat-val">{integrityResults.healthy ? '✓ Optimal' : `${integrityResults.summary.totalIssuesFound} Issues`}</span>
                </div>
              </div>

              {integrityResults.healthy ? (
                <div className="integrity-healthy-box">
                  <span className="healthy-icon">✓</span>
                  <span>All relational links between students, sections, and advisers are consistent and verified!</span>
                </div>
              ) : (
                <div className="integrity-issues-list">
                  <h4 className="issues-heading">Detected Discrepancies ({integrityResults.issues.length})</h4>
                  {integrityResults.issues.map((issue) => (
                    <div key={issue.id} className={`issue-card ${issue.severity}`}>
                      <div className="issue-header">
                        <span className={`issue-badge ${issue.severity}`}>{issue.severity.toUpperCase()}</span>
                        <span className="issue-title">{issue.title}</span>
                      </div>
                      <p className="issue-description">{issue.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsDataManagementTab;
