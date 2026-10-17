import React, { useState } from 'react';
import { useStudentForm } from '../../hooks/useStudentForm';

const initialStudentState = {
  id: '',
  lastName: '',
  firstName: '',
  middleName: '',
  extension: '',
  gender: 'Male',
  birthdate: '',
  psaBirthCertNo: '',
  motherTongue: 'Filipino',
  ipEthnicGroup: 'N/A',
  religion: 'Christianity',
  address: '',
  gradeLevel: 'Grade 7',
  sectionId: '',
  fatherName: '',
  motherMaidenName: '',
  guardianName: '',
  guardianRelationship: '',
  contactNumber: '',
  is4Ps: false,
  heightCm: '',
  weightKg: '',
  nutritionalStatus: 'Normal',
  heightForAge: 'Normal'
};

const StudentAddModal = ({
  isOpen,
  onClose,
  sections = [],
  assignedSections = [],
  students = [],
  enrolmentStudents = [],
  onAddStudent,
  onAddBulkStudents
}) => {
  const [activeTab, setActiveTab] = useState('masterlist'); // 'masterlist' | 'manual'

  // Custom hook managing form state, 12-digit LRN formatting, and auto BMI calculations
  const {
    formData: newStudentForm,
    handleChange: handleNewStudentChange,
    validate,
    resetForm
  } = useStudentForm({
    initialData: initialStudentState,
    existingStudents: students
  });

  // Enrolment Masterlist Pick state
  const [selectedEnrolmentIds, setSelectedEnrolmentIds] = useState([]);
  const [targetSectionId, setTargetSectionId] = useState('');
  const [masterlistSearchTerm, setMasterlistSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddNewStudent = async (e) => {
    e.preventDefault();
    const lrn = (newStudentForm.id || '').trim();

    // 12-Digit LRN Validation via hook
    if (!validate(true)) {
      alert('Invalid learner data. Please ensure LRN is 12 digits, and Last Name & First Name are provided.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddStudent({
        ...newStudentForm,
        id: lrn,
        lrn: lrn
      });
      resetForm();
      onClose();
      alert('Learner registered successfully!');
    } catch (err) {
      alert(`Registration failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickFromEnrolment = async () => {
    if (selectedEnrolmentIds.length === 0 || !targetSectionId) {
      alert('Please select at least one learner and target section.');
      return;
    }

    const targetSec = sections.find(s => s.id === targetSectionId);
    const selectedRecords = enrolmentStudents.filter(s => selectedEnrolmentIds.includes(s.lrn));

    const formattedStudents = selectedRecords.map(s => ({
      id: s.lrn,
      lrn: s.lrn,
      lastName: s.lastName || '',
      firstName: s.firstName || '',
      middleName: s.middleName || '',
      extension: s.extension || '',
      gender: s.gender || 'Male',
      birthdate: s.birthdate || '',
      psaBirthCertNo: s.psaBirthCertNo || '',
      motherTongue: s.motherTongue || 'Filipino',
      ipEthnicGroup: s.ipEthnicGroup || 'N/A',
      religion: s.religion || 'Christianity',
      address: s.address || '',
      gradeLevel: targetSec ? targetSec.gradeLevel : 'Grade 7',
      sectionId: targetSectionId,
      fatherName: s.fatherName || '',
      motherMaidenName: s.motherMaidenName || '',
      guardianName: s.guardianName || '',
      guardianRelationship: s.guardianRelationship || '',
      contactNumber: s.contactNumber || s.phone || '',
      is4Ps: !!s.is4Ps,
      nutritionalStatus: 'Normal'
    }));

    setIsSubmitting(true);
    try {
      await onAddBulkStudents(formattedStudents);
      alert(`Successfully enrolled ${formattedStudents.length} learners into section ${targetSec?.name}!`);
      setSelectedEnrolmentIds([]);
      onClose();
    } catch (err) {
      alert(`Enrollment failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEnrolment = enrolmentStudents.filter(s => {
    const q = masterlistSearchTerm.toLowerCase();
    return (s.lastName || '').toLowerCase().includes(q) ||
           (s.firstName || '').toLowerCase().includes(q) ||
           (s.lrn || '').includes(q);
  });

  return (
    <div className="student-detail-overlay">
      <div className="student-detail-panel" style={{ maxWidth: activeTab === 'masterlist' ? '820px' : '580px' }}>
        <div className="detail-header">
          <h2>Add New Learner</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close dialog">&times;</button>
        </div>

        <div className="tabs-header">
          <button 
            type="button"
            className={`tab-btn ${activeTab === 'masterlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('masterlist')}
          >
            Pick from Enrolment Masterlist
          </button>
          <button 
            type="button"
            className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            Manual Registration
          </button>
        </div>
      
        <div className="detail-body">
          {activeTab === 'manual' ? (
            <form onSubmit={handleAddNewStudent} className="profile-edit">
              <div className="form-group">
                <label>12-Digit LRN *</label>
                <input 
                  type="text" 
                  name="id" 
                  required
                  pattern="\d{12}"
                  maxLength="12"
                  value={newStudentForm.id} 
                  onChange={handleNewStudentChange} 
                  placeholder="12-digit Learner Reference Number" 
                />
                <small className="help-text">Must be exactly 12 numeric digits.</small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Last Name *</label>
                  <input type="text" name="lastName" required value={newStudentForm.lastName} onChange={handleNewStudentChange} />
                </div>
                <div className="form-group">
                  <label>First Name *</label>
                  <input type="text" name="firstName" required value={newStudentForm.firstName} onChange={handleNewStudentChange} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Middle Name</label>
                  <input type="text" name="middleName" value={newStudentForm.middleName} onChange={handleNewStudentChange} />
                </div>
                <div className="form-group">
                  <label>Extension</label>
                  <input type="text" name="extension" value={newStudentForm.extension} onChange={handleNewStudentChange} placeholder="Jr., III" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Gender *</label>
                  <select name="gender" value={newStudentForm.gender} onChange={handleNewStudentChange}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Birthdate</label>
                  <input type="date" name="birthdate" value={newStudentForm.birthdate} onChange={handleNewStudentChange} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Grade Level *</label>
                  <select name="gradeLevel" value={newStudentForm.gradeLevel} onChange={handleNewStudentChange}>
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Section *</label>
                  <select name="sectionId" required value={newStudentForm.sectionId} onChange={handleNewStudentChange}>
                    <option value="">Select Section</option>
                    {assignedSections.map(section => (
                      <option key={section.id} value={section.id}>{section.name} ({section.gradeLevel})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="profile-divider">Health & Nutritional Profile</div>

              <div className="form-row">
                <div className="form-group">
                  <label>Height (cm)</label>
                  <input type="number" step="0.1" name="heightCm" value={newStudentForm.heightCm} onChange={handleNewStudentChange} placeholder="e.g. 155" />
                </div>
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input type="number" step="0.1" name="weightKg" value={newStudentForm.weightKg} onChange={handleNewStudentChange} placeholder="e.g. 48" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Computed BMI</label>
                  <input type="text" readOnly value={newStudentForm.bmi || '—'} className="readonly-input" />
                </div>
                <div className="form-group">
                  <label>Nutritional Status</label>
                  <select name="nutritionalStatus" value={newStudentForm.nutritionalStatus} onChange={handleNewStudentChange}>
                    <option value="Normal">Normal</option>
                    <option value="Wasted / Underweight">Wasted / Underweight</option>
                    <option value="Severely Wasted">Severely Wasted</option>
                    <option value="Overweight">Overweight</option>
                    <option value="Obese">Obese</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Emergency Contact Number</label>
                <input type="text" name="contactNumber" value={newStudentForm.contactNumber} onChange={handleNewStudentChange} placeholder="09XX-XXX-XXXX" />
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea name="address" value={newStudentForm.address} onChange={handleNewStudentChange} rows="2" />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="is4Ps" checked={newStudentForm.is4Ps} onChange={handleNewStudentChange} />
                  4Ps CCT Beneficiary
                </label>
              </div>

              <div className="edit-actions">
                <button type="submit" className="save-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Registering...' : 'Register Learner'}
                </button>
                <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
              </div>
            </form>
          ) : (
            /* ENROLMENT MASTERLIST PICK */
            <div className="masterlist-picker">
              <div className="picker-controls">
                <input 
                  type="text" 
                  placeholder="Search enrolment masterlist by name or LRN..." 
                  value={masterlistSearchTerm}
                  onChange={e => setMasterlistSearchTerm(e.target.value)}
                  className="picker-search"
                />
                <div className="picker-section-select">
                  <label>Target Section:</label>
                  <select value={targetSectionId} onChange={e => setTargetSectionId(e.target.value)}>
                    <option value="">-- Choose Section --</option>
                    {assignedSections.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.name} ({sec.gradeLevel})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="picker-table-wrapper">
                <table className="picker-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input 
                          type="checkbox" 
                          checked={filteredEnrolment.length > 0 && selectedEnrolmentIds.length === filteredEnrolment.length}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedEnrolmentIds(filteredEnrolment.map(s => s.lrn));
                            } else {
                              setSelectedEnrolmentIds([]);
                            }
                          }}
                          aria-label="Select all enrolment learners"
                        />
                      </th>
                      <th>LRN</th>
                      <th>Name</th>
                      <th>Gender</th>
                      <th>Grade Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnrolment.map(s => (
                      <tr key={s.lrn}>
                        <td>
                          <input 
                            type="checkbox"
                            checked={selectedEnrolmentIds.includes(s.lrn)}
                            onChange={() => {
                              setSelectedEnrolmentIds(prev => 
                                prev.includes(s.lrn) ? prev.filter(id => id !== s.lrn) : [...prev, s.lrn]
                              );
                            }}
                            aria-label={`Select ${s.lastName}`}
                          />
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{s.lrn}</td>
                        <td><strong>{s.lastName}, {s.firstName}</strong></td>
                        <td>{s.gender}</td>
                        <td>{s.gradeLevel || 'Grade 7'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="picker-footer">
                <span>Selected: <strong>{selectedEnrolmentIds.length}</strong> learners</span>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
                  <button 
                    type="button" 
                    className="primary-btn" 
                    disabled={selectedEnrolmentIds.length === 0 || !targetSectionId || isSubmitting}
                    onClick={handlePickFromEnrolment}
                  >
                    {isSubmitting ? 'Enrolling...' : `Enroll ${selectedEnrolmentIds.length} Selected`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAddModal;
