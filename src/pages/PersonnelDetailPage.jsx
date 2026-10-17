import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePersonnel } from '../context/PersonnelContext';
import { useAuth } from '../context/AuthContext';
import { useSections } from '../context/SectionContext';
import { useSettings } from '../context/SettingsContext';
import PersonnelFormFields from '../components/PersonnelFormFields';
import FacultyIdCardModal from '../components/FacultyIdCardModal';
import {
  normalizePersonnelRecord,
  preparePersonnelForSave,
  getDisplayName,
  hasRequiredNameFields,
} from '../utils/personnelName';
import './PersonnelPage.css';
import './PersonnelDetailPage.css';

const ANCILLARY_OPTIONS = [
  'ICT Coordinator',
  'SDRRM Coordinator',
  'School Paper / Journalism Adviser',
  'School Property Custodian',
  'Guidance Counselor / Designate',
  'BAC Member',
  'School Feeding Program (SBFP) Coordinator',
  'Clinic Teacher In-Charge',
  'Sports / Athletic Coordinator',
  'GAD Coordinator',
  'Reading / Literacy Coordinator',
  'Youth Formation / SSLG Adviser'
];

const PersonnelDetailPage = ({ mode = 'view' }) => {
  const { personnelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sections } = useSections();
  const { settings } = useSettings();
  const {
    personnel,
    loading,
    error,
    customFieldsConfig,
    updatePersonnel,
    addPersonnel,
    deletePersonnel,
    addTrainingRecord,
    deleteTrainingRecord
  } = usePersonnel();

  const isNew = !personnelId || personnelId === 'new';
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);
  const isEditMode = mode === 'edit' || isNew;
  const selectedPerson = isNew ? null : personnel.find((p) => p.id === personnelId);

  // Tab State
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'teaching' | 'ancillary' | 'trainings'

  // ID Card Modal
  const [showIdCardModal, setShowIdCardModal] = useState(false);

  // Training Form State
  const [trainingTitle, setTrainingTitle] = useState('');
  const [trainingLevel, setTrainingLevel] = useState('Division');
  const [trainingHours, setTrainingHours] = useState('');
  const [trainingStartDate, setTrainingStartDate] = useState('');
  const [trainingEndDate, setTrainingEndDate] = useState('');
  const [trainingConductedBy, setTrainingConductedBy] = useState('DepEd');
  const [isAddingTraining, setIsAddingTraining] = useState(false);

  const formatRole = (role) =>
    (role || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const [formData, setFormData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(null);
  }, [personnelId]);

  useEffect(() => {
    if (isNew) {
      if (!isAdmin) {
        navigate('/personnel', { replace: true });
        return;
      }
      if (!formData) {
        setFormData({
          email: '',
          password: '',
          employeeNumber: '',
          lastName: '',
          firstName: '',
          middleName: '',
          nameExtension: '',
          position: 'Teacher I',
          role: 'teacher',
          fundSource: 'Nationally-Funded (DepEd)',
          plantillaItemNo: '',
          highestDegree: "Bachelor's Degree",
          major: '',
          contactNumber: '',
          address: '',
          assignedReports: '',
          assignedSections: [],
          subjects: [],
          ancillaryDuties: [],
          trainings: [],
          customFields: {},
        });
      }
      return;
    }

    if (!selectedPerson) return;

    const canAccess = isAdmin || selectedPerson.id === (user?.uid || user?.id);
    if (!canAccess) {
      navigate('/personnel', { replace: true });
      return;
    }

    if (isEditMode && !formData && (isAdmin || selectedPerson?.id === (user?.uid || user?.id))) {
      const normalized = normalizePersonnelRecord(selectedPerson);
      setFormData({
        ...normalized,
        middleName: normalized.middleName || '',
        fundSource: selectedPerson.fundSource || 'Nationally-Funded (DepEd)',
        plantillaItemNo: selectedPerson.plantillaItemNo || '',
        highestDegree: selectedPerson.highestDegree || "Bachelor's Degree",
        major: selectedPerson.major || '',
        contactNumber: selectedPerson.contactNumber || selectedPerson.phone || '',
        address: selectedPerson.address || '',
        ancillaryDuties: selectedPerson.ancillaryDuties || [],
        trainings: selectedPerson.trainings || [],
        customFields: { ...(selectedPerson.customFields || {}) },
      });
    }
  }, [isNew, isAdmin, isEditMode, navigate, selectedPerson, user?.uid, user?.id, formData]);

  const handleCustomFieldChange = (fieldId, value) => {
    setFormData((prev) => ({
      ...prev,
      customFields: {
        ...(prev.customFields || {}),
        [fieldId]: value,
      },
    }));
  };

  const handleToggleAncillary = (duty) => {
    if (!formData) return;
    const current = formData.ancillaryDuties || [];
    const updated = current.includes(duty)
      ? current.filter(d => d !== duty)
      : [...current, duty];
    setFormData({ ...formData, ancillaryDuties: updated });
  };

  const handleSave = async () => {
    if (!formData) return;

    setIsSaving(true);
    try {
      const payload = preparePersonnelForSave({
        ...formData,
        middleInitial: formData.middleName,
      });

      if (isNew) {
        if (!payload.email || !payload.password) {
          alert('Please fill in Email and Password.');
          return;
        }
        if (!hasRequiredNameFields(payload)) {
          alert('Please fill in Last Name and First Name.');
          return;
        }

        const result = await addPersonnel(payload, payload.password);
        if (result.success) {
          alert('New personnel record and account created successfully!');
          navigate('/personnel');
        } else {
          alert(`Error creating personnel: ${result.error}`);
        }
      } else {
        if (!hasRequiredNameFields(payload)) {
          alert('Please fill in Last Name and First Name.');
          return;
        }
        await updatePersonnel(payload);
        alert('Personnel record updated successfully!');
        navigate(`/personnel/${personnelId}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this personnel record? This action cannot be undone.')) {
      return;
    }

    await deletePersonnel(personnelId);
    alert('Personnel record deleted.');
    navigate('/personnel');
  };

  // Add Training Record
  const handleAddTrainingSubmit = async (e) => {
    e.preventDefault();
    if (!trainingTitle.trim() || !selectedPerson) return;

    setIsAddingTraining(true);
    try {
      const res = await addTrainingRecord(selectedPerson.id, {
        title: trainingTitle.trim(),
        level: trainingLevel,
        hours: trainingHours,
        startDate: trainingStartDate,
        endDate: trainingEndDate,
        conductedBy: trainingConductedBy.trim()
      });

      if (res?.success) {
        setTrainingTitle('');
        setTrainingHours('');
        setTrainingStartDate('');
        setTrainingEndDate('');
        alert('Training / INSET record added successfully!');
      }
    } catch (err) {
      alert(`Failed to add training: ${err.message}`);
    } finally {
      setIsAddingTraining(false);
    }
  };

  const handleDeleteTraining = async (trainingId) => {
    if (window.confirm("Delete this training record?")) {
      await deleteTrainingRecord(selectedPerson.id, trainingId);
    }
  };

  if (loading) {
    return <div className="personnel-detail-loading">Loading personnel...</div>;
  }

  if (error) {
    return <div className="personnel-detail-error">{error}</div>;
  }

  if (isEditMode && !isNew && selectedPerson && !formData) {
    return <div className="personnel-detail-loading">Loading personnel form...</div>;
  }

  if (!isNew && !selectedPerson) {
    return (
      <div className="personnel-detail-page">
        <div className="personnel-detail-card">
          <h1>Personnel Not Found</h1>
          <p>The requested personnel record could not be found.</p>
          <button type="button" className="back-btn" onClick={() => navigate('/personnel')}>
            Back to Personnel List
          </button>
        </div>
      </div>
    );
  }

  const assignedSectionsList = sections.filter(s => s.adviserId === selectedPerson?.id);
  const sectionNames = assignedSectionsList.map(s => `${s.gradeLevel} - ${s.name}`).join(', ');
  const displayPerson = selectedPerson ? normalizePersonnelRecord(selectedPerson) : null;

  return (
    <div className="personnel-detail-page">
      <div className="personnel-detail-topbar">
        <button type="button" className="back-btn" onClick={() => navigate('/personnel')}>
          ← Back to Personnel
        </button>

        {!isNew && !isEditMode && (
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button 
              type="button" 
              className="btn-header-action btn-faculty-ids"
              onClick={() => setShowIdCardModal(true)}
            >
              🪪 Print ID Badge
            </button>
            {(isAdmin || selectedPerson?.id === (user?.uid || user?.id)) && (
              <button 
                type="button" 
                className="edit-btn"
                onClick={() => navigate(`/personnel/${personnelId}/edit`)}
              >
                Edit Profile
              </button>
            )}
          </div>
        )}
      </div>

      <div className="personnel-detail-card">
        <div className="personnel-detail-header">
          <div>
            <h1>
              {isNew ? 'Add New Personnel' : isEditMode ? 'Edit Personnel Record' : getDisplayName(displayPerson)}
            </h1>
            {!isNew && !isEditMode && (
              <p className="personnel-detail-subtitle">
                {selectedPerson.position || 'Teacher I'} • {formatRole(selectedPerson.role)} • Emp #: {selectedPerson.employeeNumber || selectedPerson.id}
              </p>
            )}
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        {!isEditMode && !isNew && (
          <div className="personnel-tabs-bar">
            <button 
              className={`p-tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              Credentials & Info
            </button>
            <button 
              className={`p-tab-btn ${activeTab === 'teaching' ? 'active' : ''}`}
              onClick={() => setActiveTab('teaching')}
            >
              Teaching & Advisership
            </button>
            <button 
              className={`p-tab-btn ${activeTab === 'ancillary' ? 'active' : ''}`}
              onClick={() => setActiveTab('ancillary')}
            >
              Ancillary Designations ({selectedPerson.ancillaryDuties?.length || 0})
            </button>
            <button 
              className={`p-tab-btn ${activeTab === 'trainings' ? 'active' : ''}`}
              onClick={() => setActiveTab('trainings')}
            >
              INSET & Seminars ({selectedPerson.trainings?.length || 0})
            </button>
          </div>
        )}

        {/* EDIT / NEW MODE */}
        {isEditMode ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="personnel-form"
          >
            <PersonnelFormFields
              formData={formData}
              setFormData={setFormData}
              isNew={isNew}
              isAdmin={isAdmin}
              sections={sections}
              customFieldsConfig={customFieldsConfig}
              onCustomFieldChange={handleCustomFieldChange}
            />

            {/* Fund Source & Plantilla Item */}
            <div className="form-section">
              <h3 className="section-title">Employment & Plantilla</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Funding Source</label>
                  <select
                    value={formData.fundSource || 'Nationally-Funded (DepEd)'}
                    onChange={(e) => setFormData({ ...formData, fundSource: e.target.value })}
                  >
                    <option value="Nationally-Funded (DepEd)">Nationally-Funded (DepEd)</option>
                    <option value="Local Government Unit (LGU)">Local Government Unit (LGU)</option>
                    <option value="School PTA Funded">School PTA Funded</option>
                    <option value="Other Fund Source">Other Fund Source</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Plantilla Item Number</label>
                  <input
                    type="text"
                    value={formData.plantillaItemNo || ''}
                    onChange={(e) => setFormData({ ...formData, plantillaItemNo: e.target.value })}
                    placeholder="e.g. TCH1-123456-2020"
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Highest Educational Attainment</label>
                  <input
                    type="text"
                    value={formData.highestDegree || ''}
                    onChange={(e) => setFormData({ ...formData, highestDegree: e.target.value })}
                    placeholder="e.g. Bachelor of Secondary Education"
                  />
                </div>

                <div className="form-group">
                  <label>Major / Area of Specialization</label>
                  <input
                    type="text"
                    value={formData.major || ''}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    placeholder="e.g. Mathematics, English, General Science"
                  />
                </div>
              </div>
            </div>

            {/* Ancillary Duties Selector */}
            <div className="form-section">
              <h3 className="section-title">Ancillary & Non-Teaching Designations</h3>
              <p className="field-hint">Select all designated school-level special responsibilities.</p>
              <div className="ancillary-grid">
                {ANCILLARY_OPTIONS.map((duty) => {
                  const isChecked = (formData.ancillaryDuties || []).includes(duty);
                  return (
                    <label key={duty} className={`ancillary-chip ${isChecked ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleAncillary(duty)}
                      />
                      <span>{duty}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-btn" disabled={isSaving}>
                {isSaving ? 'Saving...' : isNew ? 'Create Personnel' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => navigate(isNew ? '/personnel' : `/personnel/${personnelId}`)}
              >
                Cancel
              </button>
              {!isNew && isAdmin && (
                <button type="button" className="delete-btn" onClick={handleDelete}>
                  Delete Personnel
                </button>
              )}
            </div>
          </form>
        ) : (
          /* VIEW MODE */
          <div className="personnel-view-tab-content">
            {/* TAB 1: BASIC INFORMATION */}
            {activeTab === 'basic' && (
              <div className="view-grid">
                <div className="view-group">
                  <label>Full Name</label>
                  <p className="val-highlight">{getDisplayName(displayPerson)}</p>
                </div>

                <div className="view-row-2">
                  <div className="view-group">
                    <label>Employee Number</label>
                    <p style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#047857' }}>
                      {selectedPerson.employeeNumber || selectedPerson.id || 'N/A'}
                    </p>
                  </div>
                  <div className="view-group">
                    <label>Official Email</label>
                    <p>{selectedPerson.email || 'N/A'}</p>
                  </div>
                </div>

                <div className="view-row-2">
                  <div className="view-group">
                    <label>Position / Title</label>
                    <p><strong>{selectedPerson.position || 'Teacher I'}</strong></p>
                  </div>
                  <div className="view-group">
                    <label>System Role</label>
                    <p>{formatRole(selectedPerson.role)}</p>
                  </div>
                </div>

                <div className="view-row-2">
                  <div className="view-group">
                    <label>Funding Source</label>
                    <p>{selectedPerson.fundSource || 'Nationally-Funded (DepEd)'}</p>
                  </div>
                  <div className="view-group">
                    <label>Plantilla Item Number</label>
                    <p style={{ fontFamily: 'monospace' }}>{selectedPerson.plantillaItemNo || 'N/A'}</p>
                  </div>
                </div>

                <div className="view-row-2">
                  <div className="view-group">
                    <label>Highest Degree Attained</label>
                    <p>{selectedPerson.highestDegree || "Bachelor's Degree"}</p>
                  </div>
                  <div className="view-group">
                    <label>Major / Specialization</label>
                    <p>{selectedPerson.major || 'General'}</p>
                  </div>
                </div>

                <div className="view-group">
                  <label>Contact Number</label>
                  <p>{selectedPerson.contactNumber || selectedPerson.phone || selectedPerson.customFields?.contactNumber || 'N/A'}</p>
                </div>

                {customFieldsConfig.map((field) => {
                  const val = selectedPerson.customFields?.[field.id];
                  if (!val) return null;
                  return (
                    <div key={field.id} className="view-group">
                      <label>{field.label}</label>
                      <p>{String(val)}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: TEACHING & ADVISERSHIP */}
            {activeTab === 'teaching' && (
              <div className="view-grid">
                <div className="view-group">
                  <label>Class Advisership</label>
                  <p className="val-highlight">
                    {sectionNames ? `🏫 ${sectionNames}` : 'No assigned advisory section'}
                  </p>
                </div>

                <div className="view-group">
                  <label>Subject Specializations Taught</label>
                  <div className="subject-tags-list">
                    {(selectedPerson.subjects || []).length > 0 ? (
                      selectedPerson.subjects.map(s => (
                        <span key={s} className="subject-badge">{s}</span>
                      ))
                    ) : (
                      <p>No subject specialization tagged.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ANCILLARY DUTIES */}
            {activeTab === 'ancillary' && (
              <div className="view-grid">
                <div className="view-group">
                  <label>Designated Ancillary & Special Responsibilities</label>
                  {(!selectedPerson.ancillaryDuties || selectedPerson.ancillaryDuties.length === 0) ? (
                    <p className="empty-text">No ancillary duties designated for this personnel.</p>
                  ) : (
                    <div className="ancillary-badges-list">
                      {selectedPerson.ancillaryDuties.map(d => (
                        <div key={d} className="ancillary-pill">⭐ {d}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: TRAININGS & PROFESSIONAL DEVELOPMENT */}
            {activeTab === 'trainings' && (
              <div className="trainings-container">
                {/* Add Training Form */}
                <form onSubmit={handleAddTrainingSubmit} className="training-form card">
                  <h4>+ Log INSET / Seminar / Training Record</h4>
                  <div className="form-group">
                    <label>Training / Seminar Title *</label>
                    <input
                      type="text"
                      required
                      value={trainingTitle}
                      onChange={e => setTrainingTitle(e.target.value)}
                      placeholder="e.g. Mid-Year In-Service Training for Teachers (INSET)"
                    />
                  </div>

                  <div className="form-row-3">
                    <div className="form-group">
                      <label>Level *</label>
                      <select value={trainingLevel} onChange={e => setTrainingLevel(e.target.value)}>
                        <option value="School / LAC">School / LAC</option>
                        <option value="District">District</option>
                        <option value="Division">Division</option>
                        <option value="Regional">Regional</option>
                        <option value="National">National</option>
                        <option value="International">International</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Total Hours *</label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={trainingHours}
                        onChange={e => setTrainingHours(e.target.value)}
                        placeholder="e.g. 24"
                      />
                    </div>

                    <div className="form-group">
                      <label>Conducted / Sponsored By</label>
                      <input
                        type="text"
                        value={trainingConductedBy}
                        onChange={e => setTrainingConductedBy(e.target.value)}
                        placeholder="e.g. DepEd NEAP"
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Start Date</label>
                      <input
                        type="date"
                        value={trainingStartDate}
                        onChange={e => setTrainingStartDate(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>End Date</label>
                      <input
                        type="date"
                        value={trainingEndDate}
                        onChange={e => setTrainingEndDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button type="submit" className="primary-btn" disabled={isAddingTraining}>
                      {isAddingTraining ? 'Saving...' : 'Add Training Record'}
                    </button>
                  </div>
                </form>

                {/* Training List */}
                <div className="trainings-list">
                  {(!selectedPerson.trainings || selectedPerson.trainings.length === 0) ? (
                    <p className="empty-text">No professional development or INSET records logged.</p>
                  ) : (
                    selectedPerson.trainings.map(t => (
                      <div key={t.id} className="training-card">
                        <div className="training-card-header">
                          <span className="training-level-tag">{t.level}</span>
                          <span className="training-hours-tag">⏱️ {t.hours} Hours</span>
                          {(isAdmin || selectedPerson.id === (user?.uid || user?.id)) && (
                            <button
                              type="button"
                              className="del-training-btn"
                              onClick={() => handleDeleteTraining(t.id)}
                              title="Delete Record"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                        <h4 className="training-title">{t.title}</h4>
                        <div className="training-meta">
                          {t.startDate && <span>📅 {t.startDate} {t.endDate ? `to ${t.endDate}` : ''}</span>}
                          <span>🏛️ {t.conductedBy || 'DepEd'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ID Card Modal */}
      {showIdCardModal && (
        <FacultyIdCardModal
          personnelList={[selectedPerson]}
          settings={settings}
          onClose={() => setShowIdCardModal(false)}
        />
      )}
    </div>
  );
};

export default PersonnelDetailPage;
