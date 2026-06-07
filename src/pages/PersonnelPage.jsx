import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersonnel } from '../context/PersonnelContext';
import { useAuth } from '../context/AuthContext.jsx';
import { useSections } from '../context/SectionContext';
import {
  normalizePersonnelRecord,
  preparePersonnelForSave,
  personMatchesSearch,
  comparePersonnel,
  buildFullName,
  hasRequiredNameFields,
} from '../utils/personnelName';
import './PersonnelPage.css';

const PersonnelPage = () => {
  const navigate = useNavigate();
  const { 
    personnel, 
    loading, 
    error, 
    customFieldsConfig, 
    addPersonnel, 
  } = usePersonnel();
  const { user } = useAuth();
  const { sections } = useSections(); // Fetch sections
  const [searchTerm, setSearchTerm] = useState('');
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [sortField, setSortField] = useState('lastName');
  const [sortDirection, setSortDirection] = useState('asc');

  const SUBJECT_SPECIALIZATIONS = ['AP', 'English', 'Mathematics', 'Science', 'Filipino', 'MAPEH', 'TLE', 'ESP'];

  const SORTABLE_COLUMNS = [
    { key: 'lastName', label: 'Last Name' },
    { key: 'firstName', label: 'First Name' },
    { key: 'middleName', label: 'Middle Name' },
    { key: 'nameExtension', label: 'Ext.' },
    { key: 'email', label: 'Email' },
    { key: 'position', label: 'Position' },
    { key: 'role', label: 'Role' },
  ];

  const isAdmin = ['admin', 'system_admin'].includes(user?.role);
  // Find current authenticated user's personnel record from the fetched personnel list
  const currentUserPersonnel = personnel.find(p => p.id === (user?.uid || user?.id));

  // If not admin, restrict view to own profile or assigned sections
  const [filterAdviser, setFilterAdviser] = useState('all'); // 'all', 'advisers', 'non-advisers'
  const [filterSubject, setFilterSubject] = useState('all'); // 'all' or specific subject

  const adviserIds = useMemo(
    () => new Set(sections.map((s) => s.adviserId).filter(Boolean)),
    [sections]
  );

  const normalizedPersonnel = useMemo(
    () => personnel.map((p) => normalizePersonnelRecord(p)),
    [personnel]
  );

  const filteredList = useMemo(() => {
    return normalizedPersonnel.filter((p) => {
      if (!personMatchesSearch(p, searchTerm)) return false;

      const isAdviser = adviserIds.has(p.id);
      if (filterAdviser === 'advisers' && !isAdviser) return false;
      if (filterAdviser === 'non-advisers' && isAdviser) return false;

      if (filterSubject !== 'all' && !(p.subjects || []).includes(filterSubject)) return false;

      return true;
    });
  }, [normalizedPersonnel, searchTerm, filterAdviser, filterSubject, adviserIds]);

  const displayedPersonnel = useMemo(() => {
    const list = isAdmin
      ? [...filteredList]
      : currentUserPersonnel
        ? [normalizePersonnelRecord(currentUserPersonnel)]
        : [];

    return list.sort((a, b) => comparePersonnel(a, b, sortField, sortDirection));
  }, [isAdmin, filteredList, currentUserPersonnel, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIndicator = (field) => {
    if (sortField !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const handleRowClick = (person) => {
    if (isAdmin || person.id === (user?.uid || user?.id)) {
      navigate(`/personnel/${person.id}`);
    }
  };

  const handleExportCSV = () => {
    const baseHeaders = ['ID', 'Email', 'Last Name', 'First Name', 'Middle Initial', 'Extension', 'Position', 'Role', 'Assigned Ancillary', 'Assigned Sections', 'Specializations'];
    const customHeaders = customFieldsConfig.map(f => f.label);
    const headers = [...baseHeaders, ...customHeaders];

    const csvContent = [
      headers.join(','),
      ...displayedPersonnel.map(p => {
        const row = [
          p.id,
          p.email || '',
          `"${p.lastName || ''}"`,
          `"${p.firstName || ''}"`,
          `"${p.middleName || ''}"`,
          `"${p.nameExtension || ''}"`,
          `"${p.position}"`,
          p.role,
          `"${p.assignedReports || ''}"`,
          `"${(p.assignedSections || []).join(';')}"`,
          `"${(p.subjects || []).join(';')}"`
        ];
        
        customFieldsConfig.forEach(field => {
          const val = p.customFields?.[field.id] ?? '';
          row.push(`"${val}"`);
        });
        
        return row.join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `personnel_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePersonnelCSVTemplate = () => {
    const baseHeaders = ['Email', 'Password', 'LastName', 'FirstName', 'MiddleName', 'Extension', 'Position', 'Role', 'AssignedAncillary', 'Specializations'];
    const customHeaders = customFieldsConfig.map(f => f.label);
    const headers = [...baseHeaders, ...customHeaders];
    
    const dummyVals = customFieldsConfig.map(f => {
      if (f.type === 'date') return '1990-01-01';
      if (f.type === 'number') return '123';
      if (f.type === 'checkbox') return 'false';
      if (f.type === 'select') return f.options?.[0] || '';
      return 'Sample';
    });

    const csvContent = headers.join(',') + '\n' + 
      'teacher@example.com,password123,"Dela Cruz","Juan","M","Jr.","Teacher I",teacher,"Math Coordinator, BSP Adviser","AP;English"' +
      (dummyVals.length > 0 ? ',' + dummyVals.map(v => `"${v}"`).join(',') : '');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'personnel_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit. Please upload a smaller CSV file.");
      event.target.value = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/ /g, ''));

      let successCount = 0;
      let failCount = 0;
      let errors = [];

      for (let i = 1; i < lines.length; i++) {
        // Simple CSV parser that handles quotes and empty fields
        const values = [];
        let current = "";
        let inQuotes = false;
        
        for (let char of lines[i]) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim()); // Push last field

        const cleanedValues = values.map(v => v.replace(/^"|"$/g, '').trim());

        if (cleanedValues.length < 3 || !cleanedValues[0]) {
          continue;
        }

        const personData = {};
        const customFieldsData = {};
        
        headers.forEach((header, index) => {
          const cleanVal = cleanedValues[index];
          if (cleanVal !== undefined) {
            personData[header] = cleanVal;
            
            // Check if this matches a custom field label
            const matchedField = customFieldsConfig.find(f => 
              f.label.trim().toLowerCase().replace(/ /g, '') === header
            );
            if (matchedField) {
              if (matchedField.type === 'checkbox') {
                customFieldsData[matchedField.id] = cleanVal.toLowerCase() === 'true' || cleanVal.toLowerCase() === 'yes';
              } else {
                customFieldsData[matchedField.id] = cleanVal;
              }
            }
          }
        });

        const legacyFullName = personData.fullname || personData.name || personData['fullname'] || '';
        const formattedData = preparePersonnelForSave({
          email: personData.email,
          lastName: personData.lastname || personData['lastname'] || '',
          firstName: personData.firstname || personData['firstname'] || '',
          middleName: personData.middlename || personData['middlename'] || '',
          nameExtension: personData.extension || personData.nameextension || personData['nameextension'] || '',
          position: personData.position || 'Teacher I',
          role: (personData.role || 'teacher').toLowerCase(),
          assignedReports:
            personData.assignedancillary ||
            personData.assignedcoordinatorship ||
            personData.assignedreports ||
            '',
          assignedSections: [],
          subjects: (personData.specializations || personData.subjects || '').split(';').map(s => s.trim()).filter(Boolean),
          customFields: customFieldsData,
          fullName: legacyFullName,
        });

        if (!formattedData.email || !hasRequiredNameFields(formattedData)) continue;

        const result = await addPersonnel(formattedData, personData.password || 'password123');
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          errors.push(`${formattedData.email}: ${result.error}`);
        }
      }

      alert(`Bulk upload complete!\n\n✅ Success: ${successCount}\n❌ Failed: ${failCount}${errors.length > 0 ? '\n\nErrors:\n' + errors.join('\n') : ''}`);
      setShowBulkUpload(false);
      event.target.value = null;
    };
    reader.readAsText(file);
  };

  if (loading) {
    return <div className="loading-indicator">Loading personnel...</div>;
  }
  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="personnel-container">
      <div className="personnel-header">
        <div className="header-title-row">
          <h1>{isAdmin ? 'Personnel Management' : 'My Profile'}</h1>
          {isAdmin && (
            <div className="header-actions">
              <button className="export-btn-outline" onClick={handleExportCSV}>
                📥 Export CSV
              </button>
              <button className="export-btn-outline" onClick={() => navigate('/personnel/configure-fields')}>
                ⚙️ Configure Fields
              </button>
              <button className="add-btn-primary" onClick={() => {
                setShowBulkUpload(true);
              }}>
                ⬆️ Bulk Upload
              </button>
              <button className="add-btn-primary" onClick={() => navigate('/personnel/new')}>
                + Add New Personnel
              </button>
            </div>
          )}
        </div>
        {isAdmin && (
          <div className="personnel-filters-bar">
            <div className="search-box">
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-dropdowns">
              <div className="filter-group">
                <label>Nature of Task:</label>
                <select value={filterAdviser} onChange={(e) => setFilterAdviser(e.target.value)}>
                  <option value="all">All Nature</option>
                  <option value="advisers">Advisers Only</option>
                  <option value="non-advisers">Non-Advisers Only</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Specialization:</label>
                <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                  <option value="all">All Subjects</option>
                  {SUBJECT_SPECIALIZATIONS.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="personnel-content">
        {isAdmin ? (
          <div className="table-wrapper">
            <table className="personnel-table">
              <thead>
                <tr>
                  {SORTABLE_COLUMNS.map((col) => (
                    <th key={col.key}>
                      <button
                        type="button"
                        className="sortable-header-btn"
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label} <span className="sort-indicator">{getSortIndicator(col.key)}</span>
                      </button>
                    </th>
                  ))}
                  <th>Nature of Task</th>
                  <th>Specializations</th>
                  <th>Sections</th>
                </tr>
              </thead>
              <tbody>
                {displayedPersonnel.map(p => {
                  const isAdviser = adviserIds.has(p.id);
                  return (
                    <tr key={p.id} onClick={() => handleRowClick(p)}>
                      <td>{p.lastName || '—'}</td>
                      <td>{p.firstName || '—'}</td>
                      <td>{p.middleName || '—'}</td>
                      <td>{p.nameExtension || '—'}</td>
                      <td>{p.email}</td>
                      <td>{p.position}</td>
                      <td className="capitalize" style={{ textTransform: 'capitalize' }}>{p.role.replace('_', ' ')}</td>
                      <td>{isAdviser ? 'Adviser' : 'Non-Adviser'}</td>
                      <td>{(p.subjects || []).join(', ') || 'None'}</td>
                      <td>{(p.assignedSections || []).map(id => sections.find(s => s.id === id)?.name || id).join(', ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          currentUserPersonnel && (() => {
            const displayPerson = normalizePersonnelRecord(currentUserPersonnel);
            const sectionNames = (currentUserPersonnel.assignedSections || [])
              .map((id) => sections.find((s) => s.id === id)?.name || id)
              .join(', ');
            return (
              <div className="profile-dashboard-view">
                <div className="profile-dashboard-card">
                  <div className="profile-dashboard-header">
                    <div className="profile-avatar-large-container">
                      <div className="profile-avatar-large">
                        {(displayPerson.firstName || 'U').charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="profile-header-info">
                      <h2>{buildFullName(displayPerson)}</h2>
                      <div className="profile-badges-row">
                        <span className="profile-position-badge">
                          {currentUserPersonnel.position || 'Teacher I'}
                        </span>
                        <span className="profile-role-badge">
                          {(currentUserPersonnel.role || 'Teacher').replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="edit-profile-btn-primary"
                      onClick={() => navigate(`/personnel/${currentUserPersonnel.id}/edit`)}
                    >
                      ✏️ Edit Profile Details
                    </button>
                  </div>

                  <div className="profile-dashboard-sections">
                    <div className="profile-info-section">
                      <h3>📋 Personal Information</h3>
                      <div className="profile-info-grid-aligned">
                        <div className="info-cell">
                          <span className="info-cell-label">First Name</span>
                          <span className="info-cell-value">{displayPerson.firstName || '—'}</span>
                        </div>
                        <div className="info-cell">
                          <span className="info-cell-label">Middle Name</span>
                          <span className="info-cell-value">{displayPerson.middleName || '—'}</span>
                        </div>
                        <div className="info-cell">
                          <span className="info-cell-label">Last Name</span>
                          <span className="info-cell-value">{displayPerson.lastName || '—'}</span>
                        </div>
                        <div className="info-cell">
                          <span className="info-cell-label">Name Extension</span>
                          <span className="info-cell-value">{displayPerson.nameExtension || '—'}</span>
                        </div>
                        <div className="info-cell full-width">
                          <span className="info-cell-label">Email Address</span>
                          <span className="info-cell-value">{currentUserPersonnel.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="profile-info-section">
                      <h3>🏫 School Assignments & Roles</h3>
                      <div className="profile-info-grid-aligned">
                        <div className="info-cell">
                          <span className="info-cell-label">Employee ID</span>
                          <span className="info-cell-value">{currentUserPersonnel.id}</span>
                        </div>
                        <div className="info-cell">
                          <span className="info-cell-label">Subject Specializations</span>
                          <span className="info-cell-value">{(currentUserPersonnel.subjects || []).join(', ') || 'None'}</span>
                        </div>
                        <div className="info-cell full-width">
                          <span className="info-cell-label">Assigned Sections</span>
                          <span className="info-cell-value">{sectionNames || 'None'}</span>
                        </div>
                        <div className="info-cell full-width">
                          <span className="info-cell-label">Assigned Ancillary / Coordinatorship</span>
                          <span className="info-cell-value">{currentUserPersonnel.assignedReports || 'None'}</span>
                        </div>
                      </div>
                    </div>

                    {customFieldsConfig.length > 0 && (
                      <div className="profile-info-section full-width">
                        <h3>⚙️ Custom Information</h3>
                        <div className="profile-info-grid-aligned">
                          {customFieldsConfig.map((field) => {
                            const val = currentUserPersonnel.customFields?.[field.id];
                            return (
                              <div key={field.id} className="info-cell">
                                <span className="info-cell-label">{field.label}</span>
                                <span className="info-cell-value">
                                  {val === undefined || val === null || val === ''
                                    ? '—'
                                    : field.type === 'checkbox'
                                    ? val ? 'Yes' : 'No'
                                    : String(val)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        )}

        {isAdmin && showBulkUpload && (
          <div className="personnel-detail-panel">
            <div className="detail-header">
              <h2>Bulk Upload Personnel</h2>
              <button className="close-btn" onClick={() => setShowBulkUpload(false)}>×</button>
            </div>
            <div className="detail-body">
              <p>Upload a CSV file containing personnel data. The CSV should have the following headers (case-insensitive):</p>
              <ul style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--gray-600)' }}>
                <li>`Email` (required)</li>
                <li>`Password` (required)</li>
                <li>`LastName` (required)</li>
                <li>`FirstName` (required)</li>
                <li>`MiddleInitial` (optional)</li>
                <li>`Extension` (optional, e.g. Jr., Sr., III)</li>
                <li>`FullName` (legacy — used only if Last/First are empty)</li>
                <li>`Position` (e.g. Teacher I)</li>
                <li>`Role` (admin, teacher, staff)</li>
                <li>`AssignedAncillary` (coordinator roles, clubs, committees)</li>
                <li>`Specializations` (semicolon-separated, e.g. AP;English)</li>
                {customFieldsConfig.map(f => (
                  <li key={f.id}>`{f.label}` (Custom Field)</li>
                ))}
              </ul>
              <button className="edit-btn" style={{ marginBottom: '1rem' }} onClick={generatePersonnelCSVTemplate}>
                Download CSV Template
              </button>
              <div className="form-group">
                <label htmlFor="csvUpload">Select CSV File</label>
                <input type="file" id="csvUpload" accept=".csv" onChange={handleBulkUpload} />
              </div>
              <div className="edit-actions">
                <button className="cancel-btn" onClick={() => setShowBulkUpload(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonnelPage;
