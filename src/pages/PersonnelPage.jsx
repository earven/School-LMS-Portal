import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersonnel } from '../context/PersonnelContext';
import { useAuth } from '../context/AuthContext.jsx';
import { useSections } from '../context/SectionContext';
import { useSettings } from '../context/SettingsContext';
import {
  normalizePersonnelRecord,
  preparePersonnelForSave,
  personMatchesSearch,
  comparePersonnel,
  buildFullName,
  hasRequiredNameFields,
} from '../utils/personnelName';
import { SUBJECT_SPECIALIZATIONS } from '../components/PersonnelFormFields';
import { printSF7Register, exportSF7ToCSV } from '../utils/sf7Generator';
import FacultyIdCardModal from '../components/FacultyIdCardModal';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import './PersonnelPage.css';

const PersonnelPage = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { 
    personnel, 
    loading, 
    error, 
    customFieldsConfig, 
    addPersonnel,
    batchUpdatePosition,
    migratePersonnelCasing,
  } = usePersonnel();
  const { user } = useAuth();
  const { sections } = useSections();
  const [searchTerm, setSearchTerm] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [sortField, setSortField] = useState('lastName');
  const [sortDirection, setSortDirection] = useState('asc');

  // Filters
  const [filterAdviser, setFilterAdviser] = useState('all'); // 'all', 'advisers', 'non-advisers', 'with-ancillary'
  const [filterSubject, setFilterSubject] = useState('all'); // 'all' or specific subject

  // Multi-Select & Bulk Actions State
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState([]);
  const [showBulkPositionModal, setShowBulkPositionModal] = useState(false);
  const [bulkTargetPosition, setBulkTargetPosition] = useState('Teacher I');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Faculty ID Card Modal
  const [showFacultyIdModal, setShowFacultyIdModal] = useState(false);
  const [idCardTargetPersonnel, setIdCardTargetPersonnel] = useState([]);

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

  const formatRole = (role) =>
    (role || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const handleMigrateCasing = async () => {
    if (!window.confirm(
      'This will update ALL existing personnel records in Firestore to use the new uniform casing rules\n\n'
      + '• Names → UPPERCASE\n'
      + '• Position → Title Case\n'
      + '• Employee Number → UPPERCASE\n\n'
      + 'Only fields that differ will be written. Continue?'
    )) return;

    setIsMigrating(true);
    try {
      const { updated, skipped, errors } = await migratePersonnelCasing();
      const msg = [
        `✅ Migration complete!`,
        ``,
        `• Updated : ${updated} record(s)`,
        `• Already clean: ${skipped} record(s)`,
        errors.length > 0 ? `• Errors   : ${errors.length}\n${errors.join('\n')}` : '',
      ].filter(Boolean).join('\n');
      alert(msg);
    } catch (e) {
      alert(`Migration failed: ${e.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

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
      if (!personMatchesSearch(p, searchTerm, sections)) return false;

      const isAdviser = adviserIds.has(p.id);
      if (filterAdviser === 'advisers' && !isAdviser) return false;
      if (filterAdviser === 'non-advisers' && isAdviser) return false;
      if (filterAdviser === 'with-ancillary') {
        const hasAncillary = (Array.isArray(p.ancillaryDuties) && p.ancillaryDuties.length > 0) || (p.ancillaryDuties && p.ancillaryDuties !== 'None');
        if (!hasAncillary) return false;
      }

      if (filterSubject !== 'all') {
        const subjects = p.subjects || [];
        if (!subjects.includes(filterSubject)) return false;
      }

      return true;
    });
  }, [normalizedPersonnel, searchTerm, filterAdviser, filterSubject, adviserIds, sections]);

  const sortedPersonnel = useMemo(() => {
    const list = [...filteredList];
    return list.sort((a, b) => {
      return comparePersonnel(a, b, sortField, sortDirection);
    });
  }, [filteredList, sortField, sortDirection]);

  const handleSort = (key) => {
    if (sortField === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(key);
      setSortDirection('asc');
    }
  };

  const handleToggleSelectPersonnel = (id, e) => {
    e.stopPropagation();
    setSelectedPersonnelIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = (e) => {
    if (e.target.checked) {
      setSelectedPersonnelIds(sortedPersonnel.map(p => p.id));
    } else {
      setSelectedPersonnelIds([]);
    }
  };

  // Open Faculty ID Card Modal
  const handleOpenFacultyIds = (targetList = null) => {
    const listToPrint = targetList || (selectedPersonnelIds.length > 0
      ? personnel.filter(p => selectedPersonnelIds.includes(p.id))
      : sortedPersonnel);

    if (listToPrint.length === 0) {
      alert('No faculty/staff records available to generate ID badges.');
      return;
    }

    setIdCardTargetPersonnel(listToPrint);
    setShowFacultyIdModal(true);
  };

  // SF7 Exports
  const handlePrintSF7 = () => {
    printSF7Register(sortedPersonnel, sections, settings);
  };

  const handleExportSF7CSV = () => {
    exportSF7ToCSV(sortedPersonnel, sections, settings);
  };

  // Bulk Position Submit
  const handleBulkPositionSubmit = async () => {
    setIsBulkProcessing(true);
    try {
      const res = await batchUpdatePosition(selectedPersonnelIds, bulkTargetPosition);
      if (res?.success) {
        alert(`Successfully updated position of ${selectedPersonnelIds.length} staff to "${bulkTargetPosition}"!`);
        setShowBulkPositionModal(false);
        setSelectedPersonnelIds([]);
      }
    } catch (err) {
      alert(`Bulk update failed: ${err.message}`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return (
    <div className="personnel-container">
      {/* Top Header */}
      <div className="personnel-header">
        <div className="header-title-group">
          <h1>Faculty & Staff Management</h1>
          <span className="personnel-count-pill">{sortedPersonnel.length} Personnel</span>
        </div>

        <div className="header-actions">
          {/* Print SF7 */}
          <button 
            type="button" 
            className="btn-header-action btn-sf7-print"
            onClick={handlePrintSF7}
            title="Print Official DepEd Form 7 (School Personnel Assignment List)"
          >
            📋 Print SF7 Register
          </button>

          {/* Export SF7 CSV */}
          <button 
            type="button" 
            className="btn-header-action btn-sf7-csv"
            onClick={handleExportSF7CSV}
            title="Export SF7 to CSV / Excel"
          >
            📥 SF7 (CSV)
          </button>

          {/* Print Faculty IDs */}
          <button 
            type="button" 
            className="btn-header-action btn-faculty-ids"
            onClick={() => handleOpenFacultyIds()}
            title="Print Faculty & Staff ID Badges with QR Code"
          >
            🪪 Print Staff IDs
          </button>

          {isAdmin && (
            <button
              type="button"
              className="btn-header-action"
              onClick={handleMigrateCasing}
              disabled={isMigrating}
              title="Apply uniform UPPERCASE casing to all names and employee numbers in Firestore"
            >
              {isMigrating ? 'Migrating...' : '🔤 Clean Casing'}
            </button>
          )}

          {isAdmin && (
            <button
              className="primary-btn"
              onClick={() => navigate('/personnel/new')}
            >
              + Add Personnel
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-bar card">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, employee #, advisory section..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-btn" onClick={() => setSearchTerm('')}>×</button>
          )}
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Designation:</label>
            <select
              value={filterAdviser}
              onChange={(e) => setFilterAdviser(e.target.value)}
            >
              <option value="all">All Staff</option>
              <option value="advisers">Class Advisers Only</option>
              <option value="non-advisers">Non-Advisers Only</option>
              <option value="with-ancillary">With Ancillary Duties</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Subject Area:</label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="all">All Subjects</option>
              {SUBJECT_SPECIALIZATIONS.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Data Grid */}
      <div className="table-wrapper card">
        {loading && <div className="loading-state">Loading personnel records...</div>}

        <table className="personnel-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input 
                  type="checkbox"
                  checked={sortedPersonnel.length > 0 && selectedPersonnelIds.length === sortedPersonnel.length}
                  onChange={handleSelectAllFiltered}
                />
              </th>
              {SORTABLE_COLUMNS.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`sortable-th ${sortField === key ? 'sorted' : ''}`}
                >
                  <div className="th-content">
                    {label}
                    <span className="sort-icon">
                      {sortField === key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                    </span>
                  </div>
                </th>
              ))}
              <th>Advisory Section</th>
              <th>Ancillary Duties</th>
              <th>Actions</th>
            </tr>
          </thead>
        {loading ? (
          <TableSkeleton rows={8} columns={10} hasCheckbox={true} />
        ) : (
          <tbody>
            {sortedPersonnel.length === 0 ? (
              <tr>
                <td colSpan="11" className="empty-state-table-cell">
                  <EmptyState
                    icon="🧑‍🏫"
                    title="No Personnel Found"
                    description={
                      searchTerm || filterAdviser !== 'all' || filterSubject !== 'all'
                        ? "No faculty members match your search or filter settings."
                        : "No personnel records have been added to the system yet."
                    }
                    actionLabel={
                      searchTerm || filterAdviser !== 'all' || filterSubject !== 'all'
                        ? "Clear Filters"
                        : isAdmin
                        ? "+ Add Personnel"
                        : undefined
                    }
                    onAction={
                      searchTerm || filterAdviser !== 'all' || filterSubject !== 'all'
                        ? () => {
                            setSearchTerm('');
                            setFilterAdviser('all');
                            setFilterSubject('all');
                          }
                        : isAdmin
                        ? () => navigate('/personnel/new')
                        : undefined
                    }
                    compact
                  />
                </td>
              </tr>
            ) : null}

            {sortedPersonnel.map((person) => {
              const isSelected = selectedPersonnelIds.includes(person.id);
              const assignedSecs = sections.filter(s => s.adviserId === person.id);
              const isClassAdviser = assignedSecs.length > 0;
              const isCurrentUser = person.id === (user?.uid || user?.id);

              return (
                <tr
                  key={person.id}
                  className={`table-row ${isSelected ? 'selected-row' : ''} ${isCurrentUser ? 'current-user-row' : ''}`}
                  onClick={() => navigate(`/personnel/${person.id}`)}
                >
                  <td onClick={e => e.stopPropagation()}>
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleToggleSelectPersonnel(person.id, e)}
                    />
                  </td>
                  <td><strong>{person.lastName || '—'}</strong></td>
                  <td>{person.firstName || '—'}</td>
                  <td>{person.middleName || '—'}</td>
                  <td>{person.nameExtension || '—'}</td>
                  <td className="email-cell">{person.email || '—'}</td>
                  <td>
                    <span className="position-tag">{person.position || 'Teacher I'}</span>
                  </td>
                  <td>
                    <span className={`role-badge role-${(person.role || 'teacher').toLowerCase()}`}>
                      {formatRole(person.role)}
                    </span>
                  </td>
                  <td>
                    {isClassAdviser ? (
                      <span className="adviser-badge">
                        🏫 {assignedSecs.map(s => `${s.gradeLevel} - ${s.name}`).join(', ')}
                      </span>
                    ) : (
                      <span className="no-adviser-tag">—</span>
                    )}
                  </td>
                  <td>
                    {person.ancillaryDuties && person.ancillaryDuties.length > 0 ? (
                      <span className="ancillary-tag">
                        ⭐ {Array.isArray(person.ancillaryDuties) ? person.ancillaryDuties.join(', ') : person.ancillaryDuties}
                      </span>
                    ) : (
                      <span className="no-ancillary-tag">—</span>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button 
                        type="button"
                        className="btn-tbl-action"
                        onClick={() => handleOpenFacultyIds([person])}
                        title="Print ID Card"
                      >
                        🪪
                      </button>
                      <button 
                        type="button"
                        className="btn-tbl-action"
                        onClick={() => navigate(`/personnel/${person.id}`)}
                        title="View Profile"
                      >
                        👁️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        )}
        </table>
      </div>

      {/* Floating Bulk Action Toolbar */}
      {selectedPersonnelIds.length > 0 && (
        <div className="bulk-actions-toolbar">
          <div className="bulk-toolbar-info">
            <span className="bulk-count-badge">{selectedPersonnelIds.length}</span>
            <span>staff members selected</span>
          </div>

          <div className="bulk-toolbar-actions">
            <button 
              type="button" 
              className="bulk-btn btn-bulk-id"
              onClick={() => handleOpenFacultyIds()}
            >
              🪪 Print Staff IDs
            </button>

            {isAdmin && (
              <button 
                type="button" 
                className="bulk-btn btn-bulk-position"
                onClick={() => setShowBulkPositionModal(true)}
              >
                🏷️ Update Position
              </button>
            )}

            <button 
              type="button" 
              className="bulk-btn btn-bulk-csv"
              onClick={handleExportSF7CSV}
            >
              📥 Export SF7
            </button>

            <button 
              type="button" 
              className="bulk-btn btn-bulk-clear"
              onClick={() => setSelectedPersonnelIds([])}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Bulk Position Modal */}
      {showBulkPositionModal && (
        <div className="modal-overlay" onClick={() => setShowBulkPositionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update Position for {selectedPersonnelIds.length} Personnel</h2>
              <button className="close-btn" onClick={() => setShowBulkPositionModal(false)}>&times;</button>
            </div>
            <div style={{ padding: '1rem 0' }}>
              <div className="form-group">
                <label>Select New Position / Title *</label>
                <select 
                  value={bulkTargetPosition} 
                  onChange={e => setBulkTargetPosition(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem' }}
                >
                  <option value="Teacher I">Teacher I</option>
                  <option value="Teacher II">Teacher II</option>
                  <option value="Teacher III">Teacher III</option>
                  <option value="Master Teacher I">Master Teacher I</option>
                  <option value="Master Teacher II">Master Teacher II</option>
                  <option value="Head Teacher I">Head Teacher I</option>
                  <option value="Head Teacher II">Head Teacher II</option>
                  <option value="Head Teacher III">Head Teacher III</option>
                  <option value="Principal I">Principal I</option>
                  <option value="Administrative Officer II">Administrative Officer II</option>
                  <option value="Administrative Assistant II">Administrative Assistant II</option>
                  <option value="Administrative Aide VI">Administrative Aide VI</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="secondary-btn" onClick={() => setShowBulkPositionModal(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleBulkPositionSubmit} disabled={isBulkProcessing}>
                {isBulkProcessing ? 'Updating...' : 'Apply Position'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Faculty ID Badges Modal */}
      {showFacultyIdModal && (
        <FacultyIdCardModal
          personnelList={idCardTargetPersonnel}
          settings={settings}
          onClose={() => setShowFacultyIdModal(false)}
        />
      )}
    </div>
  );
};

export default PersonnelPage;
