import React from 'react';

const SettingsSystemTab = ({
  localSettings,
  handleInputChange,
}) => {
  return (
    <div className="tab-pane fade-in">
      <div className="settings-card">
        <div className="card-header">
          <h2>System Preferences & Portal Modules</h2>
          <p className="card-subtitle">Configure academic year terms, enable portal tools, and manage storage capabilities.</p>
        </div>
        <div className="card-body">
          <div className="system-layout-grid">
            <div className="system-config-col">
              <div className="form-group">
                <label htmlFor="academicYear">Active Academic Year</label>
                <div className="select-wrapper">
                  <select
                    id="academicYear"
                    name="academicYear"
                    value={localSettings.academicYear || ''}
                    onChange={handleInputChange}
                  >
                    <option value="2024-2025">2024-2025</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2027-2028">2027-2028</option>
                  </select>
                </div>
              </div>

              <div className="form-group margin-top-md">
                <label htmlFor="academicYearStatus">School Year Status</label>
                <div className="select-wrapper">
                  <select
                    id="academicYearStatus"
                    name="academicYearStatus"
                    value={localSettings.academicYearStatus || 'open'}
                    onChange={handleInputChange}
                  >
                    <option value="open">Open (Teachers can edit records)</option>
                    <option value="locked">Locked (Strictly Read-Only)</option>
                  </select>
                </div>
              </div>

              <div className="form-group margin-top-lg">
                <label>System Assets</label>
                <div className="toggle-row compact">
                  <div className="toggle-row-info">
                    <span className="toggle-row-title">File Upload System</span>
                    <span className="toggle-row-desc">Allow students and teachers to submit attachments.</span>
                  </div>
                  <label className="switch-container">
                    <input
                      type="checkbox"
                      name="enableFileUpload"
                      checked={localSettings.enableFileUpload}
                      onChange={handleInputChange}
                    />
                    <span className="custom-switch-slider"></span>
                  </label>
                </div>
              </div>

              <div className="form-group margin-top-lg" style={{ backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <label htmlFor="registrationCode" style={{ color: '#991b1b', fontWeight: 'bold' }}>
                  <span style={{ marginRight: '0.5rem' }}>🔒</span>
                  Teacher Registration Code
                </label>
                <p style={{ fontSize: '0.8rem', color: '#b91c1c', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                  New users must enter this code when logging in for the first time to gain access to the system.
                </p>
                <input
                  id="registrationCode"
                  type="text"
                  name="registrationCode"
                  value={localSettings.registrationCode || ''}
                  onChange={handleInputChange}
                  placeholder="e.g. OAKRIDGE-2026"
                  style={{ borderColor: '#fca5a5' }}
                />
              </div>
            </div>

            <div className="system-modules-col">
              <label className="branding-label">Enable Portal Modules</label>
              <div className="compact-modules-list">
                <label className={`module-list-item ${localSettings.enabledModules?.studentManagement ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    name="enabledModules.studentManagement"
                    checked={localSettings.enabledModules?.studentManagement}
                    onChange={handleInputChange}
                  />
                  <span className="module-item-icon">👥</span>
                  <div className="module-item-info">
                    <span className="module-item-title">Student Management</span>
                    <span className="module-item-desc">Profiles and enrollment</span>
                  </div>
                  <span className="custom-switch"></span>
                </label>

                <label className={`module-list-item ${localSettings.enabledModules?.personnelManagement ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    name="enabledModules.personnelManagement"
                    checked={localSettings.enabledModules?.personnelManagement}
                    onChange={handleInputChange}
                  />
                  <span className="module-item-icon">👔</span>
                  <div className="module-item-info">
                    <span className="module-item-title">Personnel Management</span>
                    <span className="module-item-desc">Teacher/Staff records</span>
                  </div>
                  <span className="custom-switch"></span>
                </label>

                <label className={`module-list-item ${localSettings.enabledModules?.teacherTools ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    name="enabledModules.teacherTools"
                    checked={localSettings.enabledModules?.teacherTools}
                    onChange={handleInputChange}
                  />
                  <span className="module-item-icon">🛠️</span>
                  <div className="module-item-info">
                    <span className="module-item-title">Teacher Tools</span>
                    <span className="module-item-desc">Attendance & data tracking</span>
                  </div>
                  <span className="custom-switch"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsSystemTab;
