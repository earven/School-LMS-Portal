import React, { useState, useEffect } from 'react';
import { buildFullName } from '../../utils/personnelName';
import { useStudentForm } from '../../hooks/useStudentForm';

const StudentProfileDrawer = ({
  selectedStudent,
  onClose,
  sections = [],
  assignedSections = [],
  isAdmin = false,
  onUpdateStudent,
  onDeleteStudent,
  onAddAnecdotalNote,
  onDeleteAnecdotalNote,
  onOpenIdCards
}) => {
  const [profileTab, setProfileTab] = useState('demographics'); // 'demographics' | 'health' | 'academic' | 'guidance'
  const [isEditing, setIsEditing] = useState(false);

  // Form state and auto-calculated BMI powered by useStudentForm hook
  const {
    formData: editForm,
    setFormData: setEditForm,
    handleChange: handleEditChange
  } = useStudentForm({
    initialData: selectedStudent || {}
  });

  // Anecdotal Note Form
  const [anecdotalDate, setAnecdotalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [anecdotalCategory, setAnecdotalCategory] = useState('Behavioral / Guidance Concern');
  const [anecdotalNotes, setAnecdotalNotes] = useState('');
  const [anecdotalAction, setAnecdotalAction] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    if (selectedStudent) {
      setIsEditing(false);
      setProfileTab('demographics');
      setEditForm({
        ...selectedStudent,
        heightCm: selectedStudent.heightCm || '',
        weightKg: selectedStudent.weightKg || '',
        psaBirthCertNo: selectedStudent.psaBirthCertNo || '',
        motherTongue: selectedStudent.motherTongue || 'Filipino',
        ipEthnicGroup: selectedStudent.ipEthnicGroup || 'N/A',
        religion: selectedStudent.religion || 'Christianity',
        fatherName: selectedStudent.fatherName || '',
        motherMaidenName: selectedStudent.motherMaidenName || '',
        guardianName: selectedStudent.guardianName || '',
        guardianRelationship: selectedStudent.guardianRelationship || '',
        contactNumber: selectedStudent.contactNumber || selectedStudent.phone || '',
        bmi: selectedStudent.bmi || '',
        nutritionalStatus: selectedStudent.nutritionalStatus || 'Normal',
        heightForAge: selectedStudent.heightForAge || 'Normal'
      });
    }
  }, [selectedStudent, setEditForm]);

  if (!selectedStudent || !editForm) return null;

  const handleSave = async () => {
    try {
      await onUpdateStudent(editForm);
      setIsEditing(false);
      alert('Learner profile updated successfully!');
    } catch (e) {
      alert(`Update failed: ${e.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this student record? This action cannot be undone.")) {
      await onDeleteStudent(id);
    }
  };

  const handleAddAnecdotalSubmit = async (e) => {
    e.preventDefault();
    if (!anecdotalNotes.trim()) return;

    setIsSavingNote(true);
    try {
      const res = await onAddAnecdotalNote(selectedStudent.id, {
        date: anecdotalDate,
        category: anecdotalCategory,
        notes: anecdotalNotes.trim(),
        actionTaken: anecdotalAction.trim()
      });

      if (res?.success) {
        setAnecdotalNotes('');
        setAnecdotalAction('');
        alert('Anecdotal note recorded successfully.');
      }
    } catch (err) {
      alert(`Failed to save note: ${err.message}`);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteAnecdotal = async (noteId) => {
    if (window.confirm("Are you sure you want to delete this anecdotal note?")) {
      await onDeleteAnecdotalNote(selectedStudent.id, noteId);
    }
  };

  const canEditOrDelete = isAdmin || assignedSections.some(s => s.id === selectedStudent.sectionId);

  return (
    <div className="student-detail-panel">
      <div className="detail-header">
        <div>
          <h2>Learner Profile</h2>
          <span className="lrn-header-badge">LRN: {selectedStudent.id}</span>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close Profile">&times;</button>
      </div>

      {/* Profile Drawer Tabs */}
      <div className="profile-drawer-tabs">
        <button 
          type="button"
          className={`drawer-tab-btn ${profileTab === 'demographics' ? 'active' : ''}`}
          onClick={() => setProfileTab('demographics')}
        >
          Demographics
        </button>
        <button 
          type="button"
          className={`drawer-tab-btn ${profileTab === 'health' ? 'active' : ''}`}
          onClick={() => setProfileTab('health')}
        >
          Health (BMI)
        </button>
        <button 
          type="button"
          className={`drawer-tab-btn ${profileTab === 'academic' ? 'active' : ''}`}
          onClick={() => setProfileTab('academic')}
        >
          Academic History
        </button>
        <button 
          type="button"
          className={`drawer-tab-btn ${profileTab === 'guidance' ? 'active' : ''}`}
          onClick={() => setProfileTab('guidance')}
        >
          Guidance Log ({selectedStudent.anecdotalNotes?.length || 0})
        </button>
      </div>

      <div className="detail-body">
        {!isEditing ? (
          <div className="profile-view">
            {/* TAB 1: DEMOGRAPHICS */}
            {profileTab === 'demographics' && (
              <div className="tab-pane">
                <div className="profile-group">
                  <label>Full Name:</label>
                  <p className="val-highlight">
                    {buildFullName({
                      lastName: selectedStudent.lastName,
                      firstName: selectedStudent.firstName,
                      middleName: selectedStudent.middleName,
                      nameExtension: selectedStudent.extension
                    })}
                  </p>
                </div>

                <div className="grid-2-col">
                  <div className="profile-group">
                    <label>Gender:</label>
                    <p>{selectedStudent.gender || 'Male'}</p>
                  </div>
                  <div className="profile-group">
                    <label>Birthdate:</label>
                    <p>{selectedStudent.birthdate || 'Not specified'}</p>
                  </div>
                </div>

                <div className="grid-2-col">
                  <div className="profile-group">
                    <label>PSA Birth Certificate No.:</label>
                    <p>{selectedStudent.psaBirthCertNo || 'N/A'}</p>
                  </div>
                  <div className="profile-group">
                    <label>Mother Tongue:</label>
                    <p>{selectedStudent.motherTongue || 'Filipino'}</p>
                  </div>
                </div>

                <div className="grid-2-col">
                  <div className="profile-group">
                    <label>IP (Ethnic Group):</label>
                    <p>{selectedStudent.ipEthnicGroup || 'N/A'}</p>
                  </div>
                  <div className="profile-group">
                    <label>Religion:</label>
                    <p>{selectedStudent.religion || 'Christianity'}</p>
                  </div>
                </div>

                <div className="profile-group">
                  <label>Complete Address:</label>
                  <p>{selectedStudent.address || 'Address on file'}</p>
                </div>

                <div className="profile-divider">Family & Emergency Contacts</div>

                <div className="grid-2-col">
                  <div className="profile-group">
                    <label>Father's Name:</label>
                    <p>{selectedStudent.fatherName || 'N/A'}</p>
                  </div>
                  <div className="profile-group">
                    <label>Mother's Maiden Name:</label>
                    <p>{selectedStudent.motherMaidenName || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid-2-col">
                  <div className="profile-group">
                    <label>Guardian Name:</label>
                    <p>{selectedStudent.guardianName ? `${selectedStudent.guardianName} (${selectedStudent.guardianRelationship || 'Guardian'})` : 'N/A'}</p>
                  </div>
                  <div className="profile-group">
                    <label>Contact Number:</label>
                    <p>{selectedStudent.contactNumber || selectedStudent.phone || 'N/A'}</p>
                  </div>
                </div>

                <div className="profile-group">
                  <label>4Ps CCT Beneficiary:</label>
                  <p>{selectedStudent.is4Ps ? '✅ Yes (4Ps Recipient)' : '❌ No'}</p>
                </div>
              </div>
            )}

            {/* TAB 2: HEALTH & NUTRITIONAL PROFILE */}
            {profileTab === 'health' && (
              <div className="tab-pane">
                <div className="bmi-metrics-card">
                  <div className="bmi-stat-col">
                    <span className="stat-label">Height</span>
                    <span className="stat-num">{selectedStudent.heightCm ? `${selectedStudent.heightCm} cm` : '—'}</span>
                  </div>
                  <div className="bmi-stat-col">
                    <span className="stat-label">Weight</span>
                    <span className="stat-num">{selectedStudent.weightKg ? `${selectedStudent.weightKg} kg` : '—'}</span>
                  </div>
                  <div className="bmi-stat-col">
                    <span className="stat-label">Computed BMI</span>
                    <span className="stat-num stat-bmi">{selectedStudent.bmi || '—'}</span>
                  </div>
                </div>

                <div className="profile-group margin-top-md">
                  <label>Nutritional Status (BMI-for-Age):</label>
                  <div className={`status-pill pill-${(selectedStudent.nutritionalStatus || 'normal').toLowerCase().replace(/\s+/g, '-')}`}>
                    {selectedStudent.nutritionalStatus || 'Normal'}
                  </div>
                </div>

                <div className="profile-group">
                  <label>Height-for-Age (HFA):</label>
                  <p><strong>{selectedStudent.heightForAge || 'Normal'}</strong></p>
                </div>

                <div className="deped-form8-note">
                  ℹ️ Baseline DepEd Health & Nutrition Bureau standard assessment for secondary learners.
                </div>
              </div>
            )}

            {/* TAB 3: ACADEMIC HISTORY */}
            {profileTab === 'academic' && (
              <div className="tab-pane">
                <div className="profile-group">
                  <label>Current Enrollment:</label>
                  <p><strong>{selectedStudent.gradeLevel}</strong> — {sections.find(s => s.id === selectedStudent.sectionId)?.name || selectedStudent.sectionId}</p>
                </div>

                <div className="profile-group">
                  <label>Academic Status:</label>
                  <p><strong>{selectedStudent.status || 'Active'}</strong> {selectedStudent.eosyStatus ? `(EOSY: ${selectedStudent.eosyStatus})` : ''}</p>
                </div>

                <div className="profile-divider">Historical Academic Records</div>
                {(!selectedStudent.history || selectedStudent.history.length === 0) ? (
                  <p className="no-history-text">No previous school year rollover records on file.</p>
                ) : (
                  <div className="history-timeline">
                    {selectedStudent.history.map((h, i) => (
                      <div key={i} className="timeline-item">
                        <span className="timeline-year">SY {h.academicYear}</span>
                        <span className="timeline-grade">{h.gradeLevel} - {sections.find(s => s.id === h.sectionId)?.name || h.sectionId}</span>
                        {h.eosyStatus && <span className="timeline-status">{h.eosyStatus}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: GUIDANCE & ANECDOTAL LOG */}
            {profileTab === 'guidance' && (
              <div className="tab-pane">
                {/* Record Note Form */}
                <form onSubmit={handleAddAnecdotalSubmit} className="anecdotal-form card">
                  <h4>+ Record Anecdotal / Guidance Note</h4>
                  <div className="grid-2-col">
                    <div className="form-group">
                      <label>Date *</label>
                      <input
                        type="date"
                        required
                        value={anecdotalDate}
                        onChange={e => setAnecdotalDate(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Category *</label>
                      <select
                        value={anecdotalCategory}
                        onChange={e => setAnecdotalCategory(e.target.value)}
                      >
                        <option value="Behavioral / Guidance Concern">Behavioral / Guidance Concern</option>
                        <option value="Positive Recognition">Positive Recognition</option>
                        <option value="Academic Intervention">Academic Intervention</option>
                        <option value="Attendance / Habitual Tardiness">Attendance / Habitual Tardiness</option>
                        <option value="Parent-Teacher Conference">Parent-Teacher Conference</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Incident Details & Observations *</label>
                    <textarea
                      required
                      rows="2"
                      value={anecdotalNotes}
                      onChange={e => setAnecdotalNotes(e.target.value)}
                      placeholder="Observations or incident summary..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Action Taken / Agreements (Optional)</label>
                    <input
                      type="text"
                      value={anecdotalAction}
                      onChange={e => setAnecdotalAction(e.target.value)}
                      placeholder="Counseling, parent consultation, agreement..."
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button type="submit" className="primary-btn" disabled={isSavingNote}>
                      {isSavingNote ? 'Saving...' : 'Save Anecdotal Note'}
                    </button>
                  </div>
                </form>

                {/* Notes List */}
                <div className="anecdotal-list">
                  {(!selectedStudent.anecdotalNotes || selectedStudent.anecdotalNotes.length === 0) ? (
                    <p className="no-notes-text">No anecdotal or guidance notes on record for this learner.</p>
                  ) : (
                    selectedStudent.anecdotalNotes.map((note) => (
                      <div key={note.id} className="anecdotal-card">
                        <div className="anecdotal-card-header">
                          <span className="anecdotal-category-tag">{note.category}</span>
                          <span className="anecdotal-date">📅 {note.date}</span>
                          <button 
                            type="button"
                            className="del-note-btn"
                            onClick={() => handleDeleteAnecdotal(note.id)}
                            title="Delete Note"
                          >
                            &times;
                          </button>
                        </div>
                        <p className="anecdotal-text">{note.notes}</p>
                        {note.actionTaken && (
                          <p className="anecdotal-action">
                            <strong>Action Taken:</strong> {note.actionTaken}
                          </p>
                        )}
                        <div className="anecdotal-author">Recorded by: {note.recordedBy}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Profile Actions */}
            <div className="profile-actions">
              <button 
                type="button" 
                className="btn-print-single-id"
                onClick={() => onOpenIdCards([selectedStudent])}
              >
                🪪 Print ID Badge
              </button>
              {canEditOrDelete && (
                <>
                  <button type="button" className="edit-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
                  <button type="button" className="delete-btn-outline" onClick={() => handleDelete(selectedStudent.id)}>Delete Record</button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* EDIT PROFILE FORM */
          <div className="profile-edit">
            <div className="form-row">
              <div className="form-group">
                <label>Last Name *</label>
                <input type="text" name="lastName" value={editForm.lastName} onChange={handleEditChange} required />
              </div>
              <div className="form-group">
                <label>First Name *</label>
                <input type="text" name="firstName" value={editForm.firstName} onChange={handleEditChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Middle Name</label>
                <input type="text" name="middleName" value={editForm.middleName} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label>Extension</label>
                <input type="text" name="extension" value={editForm.extension} onChange={handleEditChange} placeholder="Jr., III, etc." />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Gender *</label>
                <select name="gender" value={editForm.gender} onChange={handleEditChange}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Birthdate</label>
                <input type="date" name="birthdate" value={editForm.birthdate || ''} onChange={handleEditChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Grade Level</label>
                <select name="gradeLevel" value={editForm.gradeLevel} onChange={handleEditChange}>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>
              <div className="form-group">
                <label>Section</label>
                <select name="sectionId" value={editForm.sectionId} onChange={handleEditChange}>
                  <option value="">Select Section</option>
                  {assignedSections.map(section => (
                    <option key={section.id} value={section.id}>{section.name} ({section.gradeLevel})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="profile-divider">Health & Nutritional Profile (DepEd Form 8)</div>

            <div className="form-row">
              <div className="form-group">
                <label>Height (cm)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  name="heightCm" 
                  value={editForm.heightCm || ''} 
                  onChange={handleEditChange} 
                  placeholder="e.g. 155" 
                />
              </div>
              <div className="form-group">
                <label>Weight (kg)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  name="weightKg" 
                  value={editForm.weightKg || ''} 
                  onChange={handleEditChange} 
                  placeholder="e.g. 48" 
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Computed BMI</label>
                <input type="text" readOnly value={editForm.bmi || '—'} className="readonly-input" />
              </div>
              <div className="form-group">
                <label>Nutritional Status</label>
                <select name="nutritionalStatus" value={editForm.nutritionalStatus} onChange={handleEditChange}>
                  <option value="Normal">Normal</option>
                  <option value="Wasted / Underweight">Wasted / Underweight</option>
                  <option value="Severely Wasted">Severely Wasted</option>
                  <option value="Overweight">Overweight</option>
                  <option value="Obese">Obese</option>
                </select>
              </div>
            </div>

            <div className="profile-divider">Family & Demographics</div>

            <div className="form-group">
              <label>PSA Birth Certificate No.</label>
              <input type="text" name="psaBirthCertNo" value={editForm.psaBirthCertNo || ''} onChange={handleEditChange} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Father's Name</label>
                <input type="text" name="fatherName" value={editForm.fatherName || ''} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label>Mother's Maiden Name</label>
                <input type="text" name="motherMaidenName" value={editForm.motherMaidenName || ''} onChange={handleEditChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Guardian Name</label>
                <input type="text" name="guardianName" value={editForm.guardianName || ''} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label>Guardian Relationship</label>
                <input type="text" name="guardianRelationship" value={editForm.guardianRelationship || ''} onChange={handleEditChange} placeholder="e.g. Mother, Aunt, Grandparent" />
              </div>
            </div>

            <div className="form-group">
              <label>Emergency Contact Number</label>
              <input type="text" name="contactNumber" value={editForm.contactNumber || ''} onChange={handleEditChange} placeholder="09XX-XXX-XXXX" />
            </div>

            <div className="form-group">
              <label>Complete Residential Address</label>
              <textarea name="address" value={editForm.address} onChange={handleEditChange} rows="2" />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" name="is4Ps" checked={editForm.is4Ps} onChange={handleEditChange} />
                4Ps CCT Beneficiary
              </label>
            </div>

            <div className="edit-actions">
              <button type="button" className="save-btn" onClick={handleSave}>Save Changes</button>
              <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfileDrawer;
