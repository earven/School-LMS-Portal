import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePersonnel } from '../context/PersonnelContext';
import { useAuth } from '../context/AuthContext';
import { useSections } from '../context/SectionContext';
import PersonnelFormFields from '../components/PersonnelFormFields';
import {
  normalizePersonnelRecord,
  preparePersonnelForSave,
  getDisplayName,
  hasRequiredNameFields,
} from '../utils/personnelName';
import './PersonnelPage.css';
import './PersonnelDetailPage.css';

const PersonnelDetailPage = ({ mode = 'view' }) => {
  const { personnelId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sections } = useSections();
  const {
    personnel,
    loading,
    error,
    customFieldsConfig,
    updatePersonnel,
    addPersonnel,
    deletePersonnel,
  } = usePersonnel();

  // Determine if we are creating a new personnel record. Treat absence of ID as new.
  const isNew = !personnelId || personnelId === 'new';
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);
  const isEditMode = mode === 'edit' || isNew;
  const selectedPerson = isNew ? null : personnel.find((p) => p.id === personnelId);

  console.log("DEBUG PersonnelDetailPage:", {
    user,
    userId: user?.uid || user?.id,
    selectedPersonId: selectedPerson?.id,
    match: selectedPerson?.id === (user?.uid || user?.id),
    isAdmin,
    isEditMode
  });

  const [formData, setFormData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isNew) {
      if (!isAdmin) {
        navigate('/personnel', { replace: true });
        return;
      }
      setFormData({
          email: '',
          password: '',
          lastName: '',
          firstName: '',
          middleName: '',
          nameExtension: '',
          position: 'Teacher I',
          role: 'teacher',
          assignedReports: '',
          assignedSections: [],
          subjects: [],
          customFields: {},
      });
      return;
    }

    if (!selectedPerson) return;

    const canAccess = isAdmin || selectedPerson.id === (user?.uid || user?.id);
    if (!canAccess) {
      navigate('/personnel', { replace: true });
      return;
    }

    if (isEditMode && (isAdmin || selectedPerson?.id === (user?.uid || user?.id))) {
        const normalized = normalizePersonnelRecord(selectedPerson);
        setFormData({
          ...normalized,
          middleName: normalized.middleName || '',
          customFields: { ...(selectedPerson.customFields || {}) },
        });
    }
  }, [isNew, isAdmin, isEditMode, navigate, selectedPerson, user?.uid, user?.id]);

  const handleCustomFieldChange = (fieldId, value) => {
    setFormData((prev) => ({
      ...prev,
      customFields: {
        ...(prev.customFields || {}),
        [fieldId]: value,
      },
    }));
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

  const sectionNames = (selectedPerson?.assignedSections || [])
    .map((id) => sections.find((s) => s.id === id)?.name || id)
    .join(', ');

  const displayPerson = selectedPerson ? normalizePersonnelRecord(selectedPerson) : null;

  return (
    <div className="personnel-detail-page">
      <div className="personnel-detail-topbar">
        <button type="button" className="back-btn" onClick={() => navigate('/personnel')}>
          ← Back to Personnel
        </button>
      </div>

      <div className="personnel-detail-card">
        <div className="personnel-detail-header">
          <div>
            <h1>
              {isNew ? 'Add New Personnel' : isEditMode ? 'Edit Personnel Record' : getDisplayName(displayPerson)}
            </h1>
            {!isNew && !isEditMode && (
              <p className="personnel-detail-subtitle">
                {selectedPerson.position || 'N/A'} • {(selectedPerson.role || 'N/A').replace('_', ' ').toUpperCase()}
              </p>
            )}
            {isEditMode && !isNew && (
              <p className="personnel-detail-subtitle">Update personnel information below.</p>
            )}
            {isNew && (
              <p className="personnel-detail-subtitle">Create a new personnel account and profile.</p>
            )}
          </div>

          {!isEditMode && (isAdmin || selectedPerson?.id === (user?.uid || user?.id)) && (
            <div className="personnel-detail-actions">
              <button
                type="button"
                className="personnel-action-btn personnel-action-btn--edit"
                onClick={() => navigate(`/personnel/${personnelId}/edit`)}
              >
                Edit Record
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="personnel-action-btn personnel-action-btn--delete"
                  onClick={handleDelete}
                >
                  Delete Record
                </button>
              )}
            </div>
          )}
        </div>

        {isEditMode ? (
          <div className="personnel-detail-form">
            <PersonnelFormFields
              formData={formData || {}}
              onChange={setFormData}
              onCustomFieldChange={handleCustomFieldChange}
              customFieldsConfig={customFieldsConfig}
              sections={sections}
              showAuthFields={isNew}
              isAdmin={isAdmin}
            />

            <div className="personnel-detail-form-actions">
              <button
                type="button"
                className="personnel-action-btn personnel-action-btn--save"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : isNew ? 'Add Personnel' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="personnel-action-btn personnel-action-btn--cancel"
                onClick={() => navigate(isNew ? '/personnel' : `/personnel/${personnelId}`)}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="personnel-detail-view">
            <div className="profile-info-grid">
              <div className="info-item">
                <label>Employee ID</label>
                <span>{selectedPerson.id}</span>
              </div>
              <div className="info-item">
                <label>Email</label>
                <span>{selectedPerson.email}</span>
              </div>
              <div className="info-item">
                <label>Last Name</label>
                <span>{displayPerson.lastName || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>First Name</label>
                <span>{displayPerson.firstName || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Middle Name</label>
                <span>{displayPerson.middleName || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Extension</label>
                <span>{displayPerson.nameExtension || 'N/A'}</span>
              </div>
              <div className="info-item full-width">
                <label>Full Name (Formatted)</label>
                <span>{getDisplayName(displayPerson)}</span>
              </div>
              <div className="info-item">
                <label>Position</label>
                <span>{selectedPerson.position || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Role</label>
                <span className="capitalize" style={{ textTransform: 'capitalize' }}>{(selectedPerson.role || 'N/A').replace('_', ' ')}</span>
              </div>
              <div className="info-item">
                <label>Specializations</label>
                <span>{(selectedPerson.subjects || []).join(', ') || 'None'}</span>
              </div>
              <div className="info-item full-width">
                <label>Assigned Ancillary / Coordinatorship</label>
                <span>{selectedPerson.assignedReports || 'N/A'}</span>
              </div>
              <div className="info-item full-width">
                <label>Assigned Sections</label>
                <span>{sectionNames || 'N/A'}</span>
              </div>

              {customFieldsConfig.map((field) => {
                const val = selectedPerson.customFields?.[field.id];
                if (val === undefined || val === null || val === '') return null;
                return (
                  <div key={field.id} className="info-item">
                    <label>{field.label}</label>
                    <span>{field.type === 'checkbox' ? (val ? 'Yes' : 'No') : String(val)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonnelDetailPage;
