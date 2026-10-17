import React from 'react';

export const SUBJECT_SPECIALIZATIONS = ['AP', 'English', 'Mathematics', 'Science', 'Filipino', 'MAPEH', 'TLE', 'ESP'];

const PersonnelFormFields = ({
  formData,
  onChange,
  onCustomFieldChange,
  customFieldsConfig,
  sections,
  showAuthFields = false,
  isAdmin = false,
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (
      ['firstName', 'lastName', 'middleName', 'nameExtension', 'employeeNumber', 'position', 'assignedReports'].includes(name)
    ) {
      finalValue = value.toUpperCase();
    }
    onChange({ ...formData, [name]: finalValue });
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    // Ensure position is fully uppercased when user leaves the field
    if (name === 'position') {
      const uppercased = value.toUpperCase();
      if (uppercased !== value) {
        onChange({ ...formData, [name]: uppercased });
      }
    }
  };


  const toggleArrayItem = (field, item) => {
    const current = formData[field] || [];
    const updated = current.includes(item)
      ? current.filter((entry) => entry !== item)
      : [...current, item];
    onChange({ ...formData, [field]: updated });
  };

  return (
    <div className="personnel-form-grid">
      {showAuthFields && (
        <>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              placeholder="personnel@example.com"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password || ''}
              onChange={handleChange}
              placeholder="Enter password"
            />
          </div>
        </>
      )}

      <div className="form-group">
        <label>Last Name</label>
        <input
          type="text"
          name="lastName"
          value={formData.lastName || ''}
          onChange={handleChange}
          placeholder="e.g. Dela Cruz"
          required
        />
      </div>

      <div className="form-group">
        <label>First Name</label>
        <input
          type="text"
          name="firstName"
          value={formData.firstName || ''}
          onChange={handleChange}
          placeholder="e.g. Juan"
          required
        />
      </div>

      <div className="form-group">
        <label>Middle Name</label>
        <input
          type="text"
          name="middleName"
          value={formData.middleName || ''}
          onChange={handleChange}
          placeholder="e.g. Marie"
        />
      </div>

      <div className="form-group">
        <label>Extension</label>
        <input
          type="text"
          name="nameExtension"
          value={formData.nameExtension || ''}
          onChange={handleChange}
          placeholder="e.g. Jr., Sr., III"
        />
      </div>

      <div className="form-group">
        <label>Employee Number</label>
        <input
          type="text"
          name="employeeNumber"
          value={formData.employeeNumber || ''}
          onChange={handleChange}
          placeholder="e.g. EMP-2026-001"
        />
      </div>

      <div className="form-group">
        <label>Position</label>
        <input
          type="text"
          name="position"
          value={formData.position || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="e.g. Teacher II"
        />
      </div>


      <div className="form-group">
        <label>Role</label>
        <select name="role" value={formData.role || 'teacher'} onChange={handleChange} disabled={!isAdmin}>
          <option value="system_admin">System Admin</option>
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="staff">Staff</option>
        </select>
      </div>

      <div className="form-group full-width">
        <label>Subject Specializations</label>
        <div className="subject-checkbox-list">
          {SUBJECT_SPECIALIZATIONS.map((sub) => (
            <label key={sub} className="subject-checkbox-item">
              <input
                type="checkbox"
                checked={(formData.subjects || []).includes(sub)}
                onChange={() => toggleArrayItem('subjects', sub)}
              />
              <span>{sub}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group full-width">
        <label>Assigned Ancillary / Coordinatorship</label>
        <p className="field-help-text">
          Non-teaching duties such as coordinator roles, clubs, committees, or special school assignments.
        </p>
        <textarea
          name="assignedReports"
          value={formData.assignedReports || ''}
          onChange={handleChange}
          placeholder="e.g. Math Coordinator, BSP Coordinator, GSP Adviser"
          rows={3}
        />
      </div>

      <div className="form-group full-width">
        <label>Assigned Sections</label>
        <div className="section-checkbox-list">
          {sections.length === 0 && (
            <p className="no-sections-msg">No sections available. Create sections first.</p>
          )}
          {sections.map((section) => (
            <label key={section.id} className="section-checkbox-item">
              <input
                type="checkbox"
                checked={(formData.assignedSections || []).includes(section.id)}
                onChange={() => toggleArrayItem('assignedSections', section.id)}
                disabled={!isAdmin}
              />
              <span>
                {section?.name || 'Unnamed'} ({section?.gradeLevel || 'N/A'})
              </span>
            </label>
          ))}
        </div>
      </div>

      {customFieldsConfig.length > 0 && (
        <div className="custom-fields-section full-width">
          <h3>Custom Details</h3>
          <div className="custom-fields-grid">
            {customFieldsConfig.map((field) => (
              <div key={field.id} className="form-group">
                <label>{field.label}</label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={formData.customFields?.[field.id] || ''}
                    onChange={(e) => onCustomFieldChange(field.id, e.target.value)}
                    rows={2}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formData.customFields?.[field.id] || ''}
                    onChange={(e) => onCustomFieldChange(field.id, e.target.value)}
                  >
                    <option value="">-- Select {field.label} --</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <label className="section-checkbox-item">
                    <input
                      type="checkbox"
                      checked={!!formData.customFields?.[field.id]}
                      onChange={(e) => onCustomFieldChange(field.id, e.target.checked)}
                    />
                    <span>Yes / Enabled</span>
                  </label>
                ) : (
                  <input
                    type={field.type}
                    value={formData.customFields?.[field.id] || ''}
                    onChange={(e) => onCustomFieldChange(field.id, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="admin-permissions-section full-width" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--gray-200)' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', color: 'var(--primary-blue)' }}>🔐 Permissions & Access Control</h3>
          <div className="admin-permissions-grid">
            <label className="section-checkbox-item">
              <input
                type="checkbox"
                checked={!!formData.isEnrolmentCoordinator}
                onChange={(e) => onChange({ ...formData, isEnrolmentCoordinator: e.target.checked })}
              />
              <span style={{ fontWeight: 600 }}>Designate as Enrolment Coordinator (Grants access to Enrolment Lister)</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonnelFormFields;
