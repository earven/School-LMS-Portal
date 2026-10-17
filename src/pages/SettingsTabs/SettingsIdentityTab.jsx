import React from 'react';

const SettingsIdentityTab = ({
  localSettings,
  handleInputChange,
  isDraggingLogo,
  setIsDraggingLogo,
  handleDragOver,
  handleDragLeave,
  handleLogoDrop,
  removeSchoolLogo,
  handleLogoUpload,
}) => {
  return (
    <div className="tab-pane fade-in">
      <div className="settings-card">
        <div className="card-header">
          <h2>School Identity & Branding</h2>
          <p className="card-subtitle">Manage your school's identity, official logo, and general description.</p>
        </div>
        <div className="card-body">
          <div className="profile-layout-grid">
            <div className="profile-inputs-col">
              <div className="form-group">
                <label htmlFor="schoolName">School Name</label>
                <input
                  id="schoolName"
                  type="text"
                  name="schoolName"
                  value={localSettings.schoolName}
                  onChange={handleInputChange}
                  placeholder="e.g. Oakridge High School"
                />
              </div>
              <div className="form-group margin-top-md">
                <label htmlFor="motto">School Motto / Tagline</label>
                <input
                  id="motto"
                  type="text"
                  name="motto"
                  value={localSettings.motto}
                  onChange={handleInputChange}
                  placeholder="e.g. Excellence in Education"
                />
              </div>
              <div className="form-group margin-top-md">
                <label htmlFor="description">School Description</label>
                <textarea
                  id="description"
                  name="description"
                  rows="3"
                  value={localSettings.description}
                  onChange={handleInputChange}
                  placeholder="Describe your school's history, mission, or vision..."
                />
              </div>
            </div>
            
            <div className="profile-branding-col">
              <label className="branding-label">School Logo / Seal</label>
              <div 
                className={`compact-logo-container ${isDraggingLogo ? 'dragging' : ''}`}
                onDragOver={(e) => handleDragOver(e, setIsDraggingLogo)}
                onDragLeave={(e) => handleDragLeave(e, setIsDraggingLogo)}
                onDrop={handleLogoDrop}
              >
                {localSettings.schoolLogo ? (
                  <div className="logo-preview-badge" style={{ position: 'relative' }}>
                    <img src={localSettings.schoolLogo} alt="School Logo" />
                    <button 
                      type="button"
                      onClick={removeSchoolLogo}
                      className="compact-delete-btn"
                      title="Remove Logo"
                      style={{ position: 'absolute', top: '-5px', right: '-5px' }}
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className="logo-placeholder-display">
                    <span>No Logo Loaded</span>
                  </div>
                )}
                <div className="file-uploader-box compact">
                  <input 
                    type="file" 
                    id="logo-upload"
                    accept="image/*" 
                    onChange={handleLogoUpload} 
                    className="file-input-hidden"
                  />
                  <label htmlFor="logo-upload" className="file-uploader-label compact">
                    <svg className="upload-icon compact" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                    </svg>
                    <span className="upload-text-main">Change Logo</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Official DepEd Signatories & Authorities Card */}
      <div className="settings-card margin-top-lg">
        <div className="card-header">
          <h2>Official DepEd Signatories & School Authorities</h2>
          <p className="card-subtitle">Configure school leadership and official signatories. These automatically populate printed DepEd SF1, SF2, SF7, SF9, SF10, BEEF forms, and Certificates.</p>
        </div>
        <div className="card-body">
          <div className="signatories-grid">
            <div className="form-group">
              <label htmlFor="principalName">School Head / Principal Full Name *</label>
              <input
                id="principalName"
                type="text"
                name="principalName"
                value={localSettings.principalName || ''}
                onChange={handleInputChange}
                placeholder="e.g. DR. MARIA C. SANTOS"
              />
            </div>
            <div className="form-group">
              <label htmlFor="principalTitle">Principal Official Designation / Title</label>
              <input
                id="principalTitle"
                type="text"
                name="principalTitle"
                value={localSettings.principalTitle || ''}
                onChange={handleInputChange}
                placeholder="e.g. Principal IV / Secondary School Principal"
              />
            </div>

            <div className="form-group">
              <label htmlFor="assistantPrincipal">Assistant Principal / Academic Head</label>
              <input
                id="assistantPrincipal"
                type="text"
                name="assistantPrincipal"
                value={localSettings.assistantPrincipal || ''}
                onChange={handleInputChange}
                placeholder="e.g. JUAN D. DELA CRUZ, EdD"
              />
            </div>
            <div className="form-group">
              <label htmlFor="assistantPrincipalTitle">Assistant Principal Designation</label>
              <input
                id="assistantPrincipalTitle"
                type="text"
                name="assistantPrincipalTitle"
                value={localSettings.assistantPrincipalTitle || ''}
                onChange={handleInputChange}
                placeholder="e.g. Assistant Principal II - Academics"
              />
            </div>

            <div className="form-group">
              <label htmlFor="registrarName">School Registrar Full Name</label>
              <input
                id="registrarName"
                type="text"
                name="registrarName"
                value={localSettings.registrarName || ''}
                onChange={handleInputChange}
                placeholder="e.g. ELENA R. BAUTISTA"
              />
            </div>
            <div className="form-group">
              <label htmlFor="registrarTitle">Registrar Designation</label>
              <input
                id="registrarTitle"
                type="text"
                name="registrarTitle"
                value={localSettings.registrarTitle || ''}
                onChange={handleInputChange}
                placeholder="e.g. School Registrar I / Administrative Officer II"
              />
            </div>

            <div className="form-group">
              <label htmlFor="divisionSuperintendent">Schools Division Superintendent (SDS)</label>
              <input
                id="divisionSuperintendent"
                type="text"
                name="divisionSuperintendent"
                value={localSettings.divisionSuperintendent || ''}
                onChange={handleInputChange}
                placeholder="e.g. DR. CRISTINA G. VILLANUEVA, CESO V"
              />
            </div>
            <div className="form-group">
              <label htmlFor="districtSupervisor">Public Schools District Supervisor (PSDS)</label>
              <input
                id="districtSupervisor"
                type="text"
                name="districtSupervisor"
                value={localSettings.districtSupervisor || ''}
                onChange={handleInputChange}
                placeholder="e.g. DR. ROBERTO M. REYES"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsIdentityTab;
