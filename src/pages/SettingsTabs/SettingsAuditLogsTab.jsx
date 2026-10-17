import React from 'react';

const SettingsAuditLogsTab = ({
  handleExportAuditCSV,
  filteredAuditLogs = [],
  auditSearch,
  setAuditSearch,
  auditCategoryFilter,
  setAuditCategoryFilter,
  auditSeverityFilter,
  setAuditSeverityFilter,
  auditCategories = {},
  auditSeverity = {},
  selectedLogDetail,
  setSelectedLogDetail,
}) => {
  return (
    <div className="tab-pane fade-in">
      <div className="settings-card">
        <div className="card-header flex-between">
          <div>
            <h2>Immutable Audit Trail & Compliance</h2>
            <p className="card-subtitle">Real-time log of administrative activities, role updates, deletions, and security events.</p>
          </div>
          <button
            type="button"
            className="btn-export-csv"
            onClick={handleExportAuditCSV}
          >
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export CSV ({filteredAuditLogs.length})
          </button>
        </div>

        <div className="card-body">
          {/* Filters Bar */}
          <div className="audit-filters-grid">
            <div className="search-box">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search actor, action, details, target ID..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
              />
              {auditSearch && (
                <button type="button" className="clear-search-btn" onClick={() => setAuditSearch('')}>&times;</button>
              )}
            </div>

            <div className="filter-selects">
              <select
                value={auditCategoryFilter}
                onChange={(e) => setAuditCategoryFilter(e.target.value)}
                className="audit-select"
              >
                <option value="ALL">All Categories</option>
                <option value={auditCategories.STUDENTS || 'STUDENTS'}>Students</option>
                <option value={auditCategories.PERSONNEL || 'PERSONNEL'}>Personnel</option>
                <option value={auditCategories.SECTIONS || 'SECTIONS'}>Sections</option>
                <option value={auditCategories.SETTINGS || 'SETTINGS'}>Settings</option>
                <option value={auditCategories.BACKUP_RESTORE || 'BACKUP_RESTORE'}>Backup & Restore</option>
                <option value={auditCategories.AUTH || 'AUTH'}>Authentication</option>
                <option value={auditCategories.SYSTEM || 'SYSTEM'}>System</option>
              </select>

              <select
                value={auditSeverityFilter}
                onChange={(e) => setAuditSeverityFilter(e.target.value)}
                className="audit-select"
              >
                <option value="ALL">All Severities</option>
                <option value={auditSeverity.INFO || 'info'}>Info</option>
                <option value={auditSeverity.WARNING || 'warning'}>Warning</option>
                <option value={auditSeverity.CRITICAL || 'critical'}>Critical</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Severity</th>
                  <th>Category</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>Actor</th>
                  <th>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-table-cell">
                      <div className="empty-audit-state">
                        <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <p>No audit events match the selected filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => {
                    const ts = log.timestamp instanceof Date 
                      ? log.timestamp.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : String(log.clientTimestamp || 'Just now');

                    return (
                      <tr key={log.id} className={`audit-row ${log.severity}`}>
                        <td className="ts-cell">{ts}</td>
                        <td>
                          <span className={`severity-badge ${log.severity}`}>
                            {String(log.severity).toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className="category-pill">{log.category}</span>
                        </td>
                        <td className="action-code-cell">{log.action}</td>
                        <td className="details-cell">{log.details}</td>
                        <td className="actor-cell">
                          <div className="actor-info">
                            <span className="actor-name">{log.actorName || log.actorEmail || 'System'}</span>
                            <span className="actor-role">{log.actorRole || ''}</span>
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-inspect-log"
                            onClick={() => setSelectedLogDetail(log)}
                            title="Inspect Event Payload"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLogDetail && (
        <div className="modal-backdrop" onClick={() => setSelectedLogDetail(null)}>
          <div className="modal-window log-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-log">
              <span className={`severity-badge ${selectedLogDetail.severity}`}>{String(selectedLogDetail.severity).toUpperCase()}</span>
              <h3>Audit Event Details: {selectedLogDetail.action}</h3>
              <button type="button" className="modal-close-icon" onClick={() => setSelectedLogDetail(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="log-detail-grid">
                <div className="detail-row">
                  <span className="label">Timestamp:</span>
                  <span className="value">
                    {selectedLogDetail.timestamp instanceof Date 
                      ? selectedLogDetail.timestamp.toISOString() 
                      : (selectedLogDetail.clientTimestamp || 'N/A')}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Category:</span>
                  <span className="value">{selectedLogDetail.category}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Details:</span>
                  <span className="value">{selectedLogDetail.details}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Actor:</span>
                  <span className="value">{selectedLogDetail.actorName} ({selectedLogDetail.actorEmail}) — Role: {selectedLogDetail.actorRole}</span>
                </div>
                {selectedLogDetail.targetId && (
                  <div className="detail-row">
                    <span className="label">Target ID:</span>
                    <span className="value code">{selectedLogDetail.targetId}</span>
                  </div>
                )}
                {selectedLogDetail.userAgent && (
                  <div className="detail-row">
                    <span className="label">User Agent:</span>
                    <span className="value client-info">{selectedLogDetail.userAgent}</span>
                  </div>
                )}
              </div>

              {selectedLogDetail.metadata && Object.keys(selectedLogDetail.metadata).length > 0 && (
                <div className="metadata-payload-box">
                  <h4>Event Metadata Payload:</h4>
                  <pre className="json-pre">{JSON.stringify(selectedLogDetail.metadata, null, 2)}</pre>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="modal-cancel-btn" onClick={() => setSelectedLogDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsAuditLogsTab;
