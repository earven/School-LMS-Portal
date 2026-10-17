import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDisplayName } from '../../../utils/personnelName';
import { printSF1Register, exportSF1ToCSV } from '../../../utils/sf1Generator';

const SectionDetailDrawer = ({
  isOpen,
  onClose,
  section,
  sectionStudents = [],
  sectionIntakeQueue = [],
  isAdmin = false,
  settings,
  availableTeachers = [],
  onUpdateSection,
  onDeleteSection,
  onAddStudent,
  onBulkEnrollStudents,
  onDeleteStudent,
  onAssignIntake,
  onBulkAssignIntake,
  onTriggerBeef,
  initialTab = 'details'
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab || 'details'); // 'details' | 'students' | 'intake'
  const [editSectionForm, setEditSectionForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const strandPresets = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL-ICT', 'TVL-HE'];

  // Inline add student state
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    id: '',
    lastName: '',
    firstName: '',
    middleName: '',
    extension: '',
    gender: 'Male',
    birthdate: '',
    psaBirthCertNo: '',
    motherTongue: 'Filipino',
    religion: 'Christianity',
    address: '',
    is4Ps: false,
    nutritionalStatus: 'Normal'
  });

  // Intake selection state
  const [selectedEnrolleeIds, setSelectedEnrolleeIds] = useState([]);
  const [intakeSearchQuery, setIntakeSearchQuery] = useState('');
  const [enrolledSearchQuery, setEnrolledSearchQuery] = useState('');
  const [isIntakeProcessing, setIsIntakeProcessing] = useState(false);

  useEffect(() => {
    if (section) {
      setEditSectionForm({ ...section });
      setActiveTab(initialTab || 'details');
      setIsAddingStudent(false);
      setSelectedEnrolleeIds([]);
      setIntakeSearchQuery('');
      setEnrolledSearchQuery('');
    }
  }, [section, isOpen, initialTab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !section || !editSectionForm) return null;

  const handleEditSectionChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditSectionForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAdviserSelect = (e) => {
    const teacherId = e.target.value;
    const teacher = availableTeachers.find(t => t.id === teacherId);
    setEditSectionForm(prev => ({
      ...prev,
      adviserId: teacher ? teacher.id : '',
      adviserName: teacher ? getDisplayName(teacher) : '',
    }));
  };

  const handleNewStudentChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'id') {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length > 12) return;
      setNewStudentForm(prev => ({ ...prev, id: numericValue }));
      return;
    }
    setNewStudentForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddStudentSubmit = async () => {
    if (!newStudentForm.id || !newStudentForm.lastName || !newStudentForm.firstName) {
      alert('LRN, Last Name, and First Name are required.');
      return;
    }
    if (newStudentForm.id.length !== 12) {
      alert('LRN must be exactly 12 digits.');
      return;
    }

    await onAddStudent({
      ...newStudentForm,
      gradeLevel: section.gradeLevel,
      sectionId: section.id
    });
    setIsAddingStudent(false);
    setNewStudentForm({
      id: '',
      lastName: '',
      firstName: '',
      middleName: '',
      extension: '',
      gender: 'Male',
      birthdate: '',
      psaBirthCertNo: '',
      motherTongue: 'Filipino',
      religion: 'Christianity',
      address: '',
      is4Ps: false,
      nutritionalStatus: 'Normal'
    });
    alert('Student enrolled successfully!');
  };

  const downloadStudentTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,LRN,Last Name,First Name,Middle Name,Extension,Gender,Address,4Ps (TRUE/FALSE)\n123456789012,DELA CRUZ,JUAN,SANTOS,,Male,Barangay 1,FALSE";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_enrollment_template_${section?.name || 'section'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkEnrollFile = (event) => {
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
      const lines = text.split("\n").filter(line => line.trim() !== "");
      if (lines.length <= 1) {
        alert("CSV file contains no student data.");
        return;
      }

      const newStudents = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        if (values.length < 3) continue;

        const id = values[0];
        const lastName = values[1]?.toUpperCase();
        const firstName = values[2]?.toUpperCase();
        const middleName = values[3]?.toUpperCase() || "";
        const extension = values[4]?.toUpperCase() || "";
        const gender = values[5] || "Male";
        const address = values[6] || "";
        const is4Ps = values[7]?.toLowerCase() === "true";

        if (id && lastName && firstName) {
          newStudents.push({
            id,
            lrn: id,
            lastName,
            firstName,
            middleName,
            extension,
            gender,
            address,
            is4Ps,
            gradeLevel: section.gradeLevel || "",
            sectionId: section.id || "",
            nutritionalStatus: 'Normal'
          });
        }
      }

      if (newStudents.length > 0) {
        await onBulkEnrollStudents(newStudents);
        alert(`Successfully enrolled ${newStudents.length} learners!`);
      } else {
        alert("No valid learner rows found.");
      }
      event.target.value = null;
    };
    reader.readAsText(file);
  };

  const handleBulkAssignClick = async () => {
    if (selectedEnrolleeIds.length === 0) return;
    setIsIntakeProcessing(true);
    try {
      await onBulkAssignIntake(selectedEnrolleeIds);
      setSelectedEnrolleeIds([]);
    } finally {
      setIsIntakeProcessing(false);
    }
  };

  const handleResetSection = () => {
    if (section) {
      setEditSectionForm({ ...section });
    }
  };

  const handleSelectStrandPreset = (strand) => {
    if (!isAdmin) return;
    setEditSectionForm(prev => ({
      ...prev,
      trackStrand: strand
    }));
  };

  const handleDeleteSectionClick = () => {
    if (!isAdmin) return;
    if (window.confirm(`Are you sure you want to delete section "${section.name}"? All learners currently assigned to this section will become unassigned.`)) {
      onDeleteSection(section.id);
    }
  };

  const handleSaveSection = async () => {
    if (!editSectionForm.name || !editSectionForm.gradeLevel) {
      alert('Section Name and Grade Level are required.');
      return;
    }
    setIsSaving(true);
    try {
      await onUpdateSection(editSectionForm);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update section:', err);
      alert('Error saving section changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const maleCount = sectionStudents.filter(s => s.gender === 'Male').length;
  const femaleCount = sectionStudents.filter(s => s.gender === 'Female').length;

  const filteredStudents = sectionStudents.filter(s => {
    if (!enrolledSearchQuery.trim()) return true;
    const q = enrolledSearchQuery.toLowerCase().trim();
    return (s.lastName || '').toLowerCase().includes(q) ||
           (s.firstName || '').toLowerCase().includes(q) ||
           (s.id || '').includes(q) ||
           (s.lrn || '').includes(q);
  });

  const filteredIntake = sectionIntakeQueue.filter(e => {
    if (!intakeSearchQuery.trim()) return true;
    const q = intakeSearchQuery.toLowerCase().trim();
    return (e.lastName || '').toLowerCase().includes(q) ||
           (e.firstName || '').toLowerCase().includes(q) ||
           (e.lrn || '').includes(q);
  });

  return (
    <div className="section-drawer-overlay" onClick={onClose}>
      <div className="section-detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <div className="title-with-tabs">
            <div className="section-title-line">
              <h2>{section.name}</h2>
              <span className="grade-badge-title">{section.gradeLevel}</span>
            </div>
            <div className="tab-bar">
              <button 
                type="button"
                className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                ⚙️ Section Info
              </button>
              <button 
                type="button"
                className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
                onClick={() => setActiveTab('students')}
              >
                👥 Enrolled ({sectionStudents.length})
              </button>
              <button 
                type="button"
                className={`tab-btn ${activeTab === 'intake' ? 'active' : ''}`}
                onClick={() => setActiveTab('intake')}
              >
                📥 Enrolment Intake ({sectionIntakeQueue.length})
              </button>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} title="Close drawer (Esc)">×</button>
        </div>
      
        <div className="detail-body">
          {/* TAB 1: SECTION INFO & CONFIGURATION */}
          {activeTab === 'details' && (
            <div className="section-info-form-modern">
              {/* Top Identity Hero Banner */}
              <div className="sec-edit-hero-banner">
                <div className="sec-edit-hero-main">
                  <div className="sec-edit-avatar">
                    {editSectionForm.gradeLevel === 'Grade 11' || editSectionForm.gradeLevel === 'Grade 12' ? '🎓' : '🏫'}
                  </div>
                  <div className="sec-edit-hero-info">
                    <div className="sec-edit-title-row">
                      <h3>{editSectionForm.name || 'Untitled Section'}</h3>
                      <span className="sec-badge-grade">{editSectionForm.gradeLevel}</span>
                      {editSectionForm.trackStrand && (
                        <span className="sec-badge-strand">{editSectionForm.trackStrand}</span>
                      )}
                      <span className={`sec-badge-status ${editSectionForm.isActive ? 'active' : 'inactive'}`}>
                        {editSectionForm.isActive ? '● Active' : '○ Archived'}
                      </span>
                    </div>
                    <div className="sec-edit-meta-chips">
                      <span className="sec-meta-chip">
                        👥 <strong>{sectionStudents.length}</strong> Enrolled Learners
                      </span>
                      <span className="sec-meta-chip">
                        📍 {editSectionForm.room ? editSectionForm.room : 'No Room Specified'}
                      </span>
                      <span className="sec-meta-chip">
                        👨‍🏫 {editSectionForm.adviserName ? editSectionForm.adviserName : 'No Adviser Assigned'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="sec-open-masterlist-btn"
                  onClick={() => navigate(`/students?section=${encodeURIComponent(section.name)}`)}
                  title="Open this section in Learner Masterlist"
                >
                  📋 Open in Masterlist →
                </button>
              </div>

              {/* Non-Admin Notice Banner */}
              {!isAdmin && (
                <div className="sec-admin-notice">
                  <span>🔒</span>
                  <div>
                    <strong>Read-Only Mode:</strong> Only administrators can edit section attributes, rename sections, or reassign advisers.
                  </div>
                </div>
              )}

              {/* CARD 1: Basic Information & Room/Adviser Allocation */}
              <div className="sec-form-card">
                <div className="sec-form-card-header">
                  <h4 className="sec-form-card-title">🏷️ Classification & Logistics</h4>
                </div>
                <div className="form-grid-2col">
                  <div className="form-group-modern">
                    <label>
                      Section Name <span className="required-dot">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={editSectionForm.name || ''}
                      onChange={handleEditSectionChange}
                      placeholder="e.g. Rizal, Emerald, STEM-A"
                      disabled={!isAdmin}
                      required
                    />
                  </div>

                  <div className="form-group-modern">
                    <label>
                      Grade Level <span className="required-dot">*</span>
                    </label>
                    <select
                      name="gradeLevel"
                      value={editSectionForm?.gradeLevel || 'Grade 7'}
                      onChange={handleEditSectionChange}
                      disabled={!isAdmin}
                    >
                      <option value="Grade 7">Grade 7 (Junior High)</option>
                      <option value="Grade 8">Grade 8 (Junior High)</option>
                      <option value="Grade 9">Grade 9 (Junior High)</option>
                      <option value="Grade 10">Grade 10 (Junior High)</option>
                      <option value="Grade 11">Grade 11 (Senior High)</option>
                      <option value="Grade 12">Grade 12 (Senior High)</option>
                    </select>
                  </div>

                  <div className="form-group-modern">
                    <label>Room / Building</label>
                    <input
                      type="text"
                      name="room"
                      value={editSectionForm?.room || ''}
                      onChange={handleEditSectionChange}
                      placeholder="e.g. Room 204, Academic Bldg"
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="form-group-modern">
                    <label>Class Adviser</label>
                    <select
                      name="adviserId"
                      value={editSectionForm.adviserId || ''}
                      onChange={handleAdviserSelect}
                      disabled={!isAdmin}
                    >
                      <option value="">-- No Adviser Assigned --</option>
                      {availableTeachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {getDisplayName(teacher)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {(editSectionForm?.gradeLevel === 'Grade 11' || editSectionForm?.gradeLevel === 'Grade 12') && (
                  <div className="form-group-modern" style={{ marginTop: '0.45rem' }}>
                    <label>Senior High Track & Strand</label>
                    <input
                      type="text"
                      name="trackStrand"
                      value={editSectionForm?.trackStrand || ''}
                      onChange={handleEditSectionChange}
                      placeholder="e.g. Academic - STEM / TVL-ICT"
                      disabled={!isAdmin}
                    />
                    {isAdmin && (
                      <div className="strand-suggestions">
                        <span className="strand-suggestions-label">Suggestions:</span>
                        {strandPresets.map((strand) => (
                          <button
                            key={strand}
                            type="button"
                            className={`strand-chip ${editSectionForm.trackStrand === strand ? 'active' : ''}`}
                            onClick={() => handleSelectStrandPreset(strand)}
                          >
                            {strand}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CARD 2: Academic Year & Status Lifecycle */}
              <div className="sec-form-card">
                <div className="sec-form-card-header">
                  <h4 className="sec-form-card-title">⚙️ Academic Year & Status Lifecycle</h4>
                </div>
                <div className="form-grid-2col" style={{ alignItems: 'center' }}>
                  <div className="form-group-modern">
                    <label>Academic Year / Batch</label>
                    <input
                      type="text"
                      name="yearCreated"
                      value={editSectionForm.yearCreated || ''}
                      onChange={handleEditSectionChange}
                      placeholder="e.g. 2025-2026"
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="form-group-modern">
                    <label>Section Lifecycle</label>
                    <div
                      className={`status-toggle-card ${editSectionForm.isActive ? 'is-active' : ''}`}
                      onClick={() => {
                        if (!isAdmin) return;
                        setEditSectionForm(prev => ({ ...prev, isActive: !prev.isActive }));
                      }}
                      role="button"
                      tabIndex={isAdmin ? 0 : -1}
                    >
                      <div className="status-toggle-left">
                        <span className="status-toggle-title">
                          {editSectionForm.isActive ? '🟢 Active' : '⚪ Archived'}
                        </span>
                        <span className="status-toggle-desc">
                          {editSectionForm.isActive ? 'Available for enrollment.' : 'Hidden from active menus.'}
                        </span>
                      </div>
                      <div className="status-toggle-switch" />
                    </div>
                  </div>
                </div>

                {/* Inline Action Bar */}
                {isAdmin && (
                  <div className="sec-form-actions-bar" style={{ marginTop: '0.45rem' }}>
                    <button
                      type="button"
                      className="reset-btn-secondary"
                      onClick={handleResetSection}
                      disabled={isSaving}
                    >
                      🔄 Discard
                    </button>
                    <button
                      type="button"
                      className="save-btn-primary"
                      onClick={handleSaveSection}
                      disabled={isSaving}
                    >
                      {isSaving ? '💾 Saving...' : saveSuccess ? '✅ Saved!' : '💾 Save Changes'}
                    </button>
                  </div>
                )}
              </div>

              {/* Danger Zone for Deletion */}
              {isAdmin && (
                <div className="danger-zone-card">
                  <div className="danger-zone-info">
                    <span className="danger-zone-tag">⚠️ Danger Zone</span>
                    <span className="danger-zone-desc">
                      Permanently delete <strong>{section.name}</strong>. Enrolled learners will be unassigned safely.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="danger-zone-btn"
                    onClick={handleDeleteSectionClick}
                  >
                    🗑️ Delete Section
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ENROLLED LEARNERS */}
          {activeTab === 'students' && (
            <div className="section-students-view">
              <div className="section-roster-summary-banner">
                <div className="roster-meta-pill">
                  <span className="meta-label">Total Enrolled</span>
                  <strong className="meta-val">👥 {sectionStudents.length} Learners</strong>
                </div>
                <div className="roster-meta-pill">
                  <span className="meta-label">Gender Breakdown</span>
                  <strong className="meta-val">
                    👦 {maleCount} M • 👧 {femaleCount} F
                  </strong>
                </div>
                <div className="roster-meta-pill">
                  <span className="meta-label">Class Adviser</span>
                  <strong className="meta-val">👤 {section?.adviserName || 'Unassigned'}</strong>
                </div>
                <div className="roster-meta-pill">
                  <span className="meta-label">Room / Building</span>
                  <strong className="meta-val">📍 {section?.room || 'Unassigned'}</strong>
                </div>
              </div>

              <div className="student-actions-row">
                <div className="action-buttons-left">
                  <button 
                    type="button" 
                    className="export-btn-outline" 
                    onClick={() => printSF1Register(sectionStudents, settings, section)}
                    title="Print DepEd SF1 School Register for this Section"
                  >
                    🖨️ SF1 Register
                  </button>
                  <button 
                    type="button" 
                    className="export-btn-outline" 
                    onClick={() => exportSF1ToCSV(sectionStudents, settings, section)}
                    title="Export SF1 to CSV"
                  >
                    📥 SF1 (CSV)
                  </button>
                  <button 
                    type="button" 
                    className="export-btn-outline btn-drawer-masterlist" 
                    onClick={() => navigate(`/students?sectionId=${section.id}`)}
                    title="Open full Learner Masterlist with batch actions, ID badges, and 360° profiles"
                  >
                    📋 Open in Masterlist
                  </button>
                  {isAdmin && (
                    <button 
                      type="button" 
                      className="export-btn-outline btn-drawer-promo" 
                      onClick={() => navigate(`/students?sectionId=${section.id}&openPromo=true`)}
                      title="Promote this section's learners to the next school year (EOSY)"
                    >
                      🎓 EOSY Promotion
                    </button>
                  )}
                </div>

                <div className="action-buttons">
                  <button type="button" className="export-btn-outline" onClick={downloadStudentTemplate}>
                    📄 Template
                  </button>
                  <label className="add-btn-primary" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                    ⬆️ Bulk Enroll
                    <input type="file" accept=".csv" onChange={handleBulkEnrollFile} style={{ display: 'none' }} />
                  </label>
                  <button 
                    type="button"
                    className="add-btn-primary" 
                    onClick={() => setIsAddingStudent(!isAddingStudent)}
                  >
                    {isAddingStudent ? 'Cancel' : '+ Add Learner'}
                  </button>
                </div>
              </div>

              {/* Quick Search Box */}
              <div className="intake-search-row" style={{ marginBottom: '0.75rem' }}>
                <input 
                  type="text" 
                  placeholder="Filter enrolled learners by name or 12-digit LRN..."
                  value={enrolledSearchQuery}
                  onChange={(e) => setEnrolledSearchQuery(e.target.value)}
                  className="intake-search-input"
                />
                {enrolledSearchQuery && (
                  <button type="button" className="clear-btn" onClick={() => setEnrolledSearchQuery('')}>×</button>
                )}
              </div>

              {isAddingStudent && (
                <div className="inline-add-student">
                  <div className="inline-form-row">
                    <input 
                      type="text" 
                      placeholder="12-digit LRN *" 
                      name="id" 
                      value={newStudentForm.id} 
                      onChange={handleNewStudentChange} 
                      maxLength={12}
                    />
                    <input 
                      type="text" 
                      placeholder="Last Name *" 
                      name="lastName" 
                      value={newStudentForm.lastName} 
                      onChange={handleNewStudentChange} 
                    />
                    <input 
                      type="text" 
                      placeholder="First Name *" 
                      name="firstName" 
                      value={newStudentForm.firstName} 
                      onChange={handleNewStudentChange} 
                    />
                  </div>
                  <div className="inline-form-row">
                    <input 
                      type="text" 
                      placeholder="Middle Name" 
                      name="middleName" 
                      value={newStudentForm.middleName} 
                      onChange={handleNewStudentChange} 
                    />
                    <select name="gender" value={newStudentForm.gender} onChange={handleNewStudentChange}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    <button type="button" className="save-btn" onClick={handleAddStudentSubmit}>Enroll Learner</button>
                  </div>
                </div>
              )}

              <div className="mini-student-table">
                <table>
                  <thead>
                    <tr>
                      <th>LRN</th>
                      <th>Learner Name</th>
                      <th>Gender</th>
                      <th>4Ps</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length > 0 ? (
                      [...filteredStudents]
                        .sort((a, b) => {
                          if (a.gender !== b.gender) return a.gender === 'Male' ? -1 : 1;
                          return (a.lastName || '').localeCompare(b.lastName || '');
                        })
                        .map(student => (
                          <tr key={student.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{student.id}</td>
                            <td style={{ fontWeight: 600 }}>
                              <span
                                className="drawer-student-name-link"
                                onClick={() => navigate(`/students?sectionId=${section.id}&studentId=${student.id}`)}
                                title="Open 360° Learner Profile in Masterlist"
                              >
                                {student.lastName}, {student.firstName} {student.middleName || ''} {student.extension || ''}
                              </span>
                            </td>
                            <td>
                              <span className={`gender-tag tag-${(student.gender || 'male').toLowerCase()}`}>
                                {student.gender || 'Male'}
                              </span>
                            </td>
                            <td>{student.is4Ps ? <span className="badge-4ps">4Ps</span> : '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button 
                                  type="button"
                                  className="btn-tbl-action"
                                  onClick={() => navigate(`/students?sectionId=${section.id}&studentId=${student.id}`)}
                                  title="Open 360° Profile Inspector in Masterlist"
                                >
                                  👁️ Profile
                                </button>
                                <button 
                                  type="button"
                                  className="btn-tbl-action"
                                  onClick={() => onTriggerBeef(student)}
                                  title="Print DepEd BEEF Form"
                                >
                                  📄 BEEF
                                </button>
                                <button 
                                  type="button"
                                  className="text-delete-btn" 
                                  onClick={() => onDeleteStudent(student.id)}
                                  title="Remove from Section"
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                          {enrolledSearchQuery
                            ? `No enrolled learners found matching "${enrolledSearchQuery}".`
                            : 'No learners enrolled in this section yet. Use "+ Add Learner" or assign from the "Enrolment Intake" tab.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ENROLMENT INTAKE PIPELINE */}
          {activeTab === 'intake' && (
            <div className="section-intake-view">
              <div className="intake-banner">
                <div>
                  <h4>Incoming {section.gradeLevel} Enrollees</h4>
                  <p>Pick applicants from the General Enrolment database and assign them directly to <strong>{section.name}</strong>.</p>
                </div>
                {selectedEnrolleeIds.length > 0 && (
                  <button 
                    type="button"
                    className="primary-btn btn-bulk-assign"
                    onClick={handleBulkAssignClick}
                    disabled={isIntakeProcessing}
                  >
                    📥 Assign ({selectedEnrolleeIds.length}) to Section
                  </button>
                )}
              </div>

              <div className="intake-search-row">
                <input 
                  type="text" 
                  placeholder="Filter intake applicants by name/LRN..."
                  value={intakeSearchQuery}
                  onChange={(e) => setIntakeSearchQuery(e.target.value)}
                  className="intake-search-input"
                />
                {intakeSearchQuery && (
                  <button type="button" className="clear-btn" onClick={() => setIntakeSearchQuery('')}>×</button>
                )}
              </div>

              <div className="mini-student-table">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '35px' }}>
                        <input 
                          type="checkbox"
                          checked={filteredIntake.length > 0 && selectedEnrolleeIds.length === filteredIntake.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEnrolleeIds(filteredIntake.map(i => i.id));
                            } else {
                              setSelectedEnrolleeIds([]);
                            }
                          }}
                        />
                      </th>
                      <th>Applicant</th>
                      <th>LRN</th>
                      <th>Gender</th>
                      <th>Type / Prev School</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIntake.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                          {intakeSearchQuery
                            ? `No pending intake applicants match "${intakeSearchQuery}".`
                            : `No pending enrolment applicants found for ${section.gradeLevel}.`}
                        </td>
                      </tr>
                    ) : (
                      filteredIntake.map(enrollee => {
                        const isSelected = selectedEnrolleeIds.includes(enrollee.id);
                        return (
                          <tr key={enrollee.id} className={isSelected ? 'selected-row' : ''}>
                            <td>
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setSelectedEnrolleeIds(prev => 
                                    prev.includes(enrollee.id) ? prev.filter(x => x !== enrollee.id) : [...prev, enrollee.id]
                                  );
                                }}
                              />
                            </td>
                            <td>
                              <strong>{enrollee.lastName}, {enrollee.firstName}</strong>
                              {enrollee.is4Ps && <span className="badge-4ps" style={{ marginLeft: '4px' }}>4Ps</span>}
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{enrollee.lrn || '—'}</td>
                            <td>
                              <span className={`gender-tag tag-${(enrollee.gender || 'male').toLowerCase()}`}>
                                {enrollee.gender || 'Male'}
                              </span>
                            </td>
                            <td>
                              <small>{enrollee.learnerType || 'New'} {enrollee.prevSchool ? `(${enrollee.prevSchool})` : ''}</small>
                            </td>
                            <td>
                              <span className="enr-status-badge status-verified">
                                {enrollee.status || 'Verified'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button 
                                  type="button"
                                  className="btn-tbl-action"
                                  onClick={() => onTriggerBeef(enrollee)}
                                  title="Print DepEd BEEF Form"
                                >
                                  📄 BEEF
                                </button>
                                <button 
                                  type="button"
                                  className="btn-assign-row"
                                  onClick={() => onAssignIntake(enrollee)}
                                  disabled={isIntakeProcessing}
                                  title="Enroll into Section"
                                >
                                  + Enroll
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SectionDetailDrawer;
