import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePersonnel } from '../context/PersonnelContext';
import './PersonnelPage.css';
import './PersonnelDetailPage.css';
import './PersonnelFieldsConfigPage.css';

const PersonnelFieldsConfigPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { customFieldsConfig, saveCustomFieldsConfig, loading, error } = usePersonnel();

  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = ['admin', 'system_admin'].includes(user?.role);

  useEffect(() => {
    if (user && !isAdmin) {
      navigate('/personnel', { replace: true });
    }
  }, [user, isAdmin, navigate]);

  const handleAddField = async () => {
    if (!newFieldLabel.trim()) {
      alert('Please enter a field label.');
      return;
    }

    const fieldId = newFieldLabel
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();

    if (!fieldId) {
      alert('Invalid field label.');
      return;
    }

    if (customFieldsConfig.some((f) => f.id === fieldId)) {
      alert('A field with a similar label already exists.');
      return;
    }

    const newField = {
      id: fieldId,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: false,
    };

    if (newFieldType === 'select') {
      const opts = newFieldOptions
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
      if (opts.length === 0) {
        alert('Please specify at least one dropdown option.');
        return;
      }
      newField.options = opts;
    }

    setIsSaving(true);
    try {
      const updatedFields = [...customFieldsConfig, newField];
      const res = await saveCustomFieldsConfig(updatedFields);
      if (res.success) {
        setNewFieldLabel('');
        setNewFieldType('text');
        setNewFieldOptions('');
        alert(`Field "${newField.label}" added successfully.`);
      } else {
        alert(`Error saving field: ${res.error}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveField = async (fieldId) => {
    if (
      !window.confirm(
        'Are you sure you want to remove this custom field? Historical values stored in existing records will be preserved, but they will not be visible unless the field is re-created.'
      )
    ) {
      return;
    }

    setIsSaving(true);
    try {
      const updatedFields = customFieldsConfig.filter((f) => f.id !== fieldId);
      const res = await saveCustomFieldsConfig(updatedFields);
      if (res.success) {
        alert('Field removed successfully.');
      } else {
        alert(`Error removing field: ${res.error}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="personnel-detail-loading">Loading field configuration...</div>;
  }

  if (error) {
    return <div className="personnel-detail-error">{error}</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="personnel-detail-page">
      <div className="personnel-detail-topbar">
        <button type="button" className="back-btn" onClick={() => navigate('/personnel')}>
          ← Back to Personnel
        </button>
      </div>

      <div className="personnel-detail-card fields-config-page">
        <div className="personnel-detail-header">
          <div>
            <h1>Configure Profile Fields</h1>
            <p className="personnel-detail-subtitle">
              Add or remove custom details collected for personnel records. Changes apply to all profiles.
            </p>
          </div>
        </div>

        <div className="fields-config-layout">
          <section className="fields-config-section">
            <div className="section-heading">
              <h2>Active Custom Fields</h2>
              <span className="field-count-badge">{customFieldsConfig.length}</span>
            </div>

            {customFieldsConfig.length === 0 ? (
              <p className="no-sections-msg">No custom fields defined yet.</p>
            ) : (
              <div className="field-config-list">
                {customFieldsConfig.map((field) => (
                  <div key={field.id} className="field-config-item">
                    <div className="field-config-info">
                      <strong>{field.label}</strong>
                      <span>
                        Type: <span className="capitalize">{field.type}</span>
                        {field.options && ` • Options: ${field.options.join(', ')}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="delete-field-btn"
                      onClick={() => handleRemoveField(field.id)}
                      disabled={isSaving}
                      title="Remove Field"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="fields-config-section add-field-section">
            <div className="section-heading">
              <h2>Add Custom Field</h2>
            </div>

            <div className="add-field-form">
              <div className="form-group">
                <label>Field Label</label>
                <input
                  type="text"
                  placeholder="e.g. Birthplace"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Field Type</label>
                <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)}>
                  <option value="text">Single Line Text</option>
                  <option value="textarea">Multi-line Text (Textarea)</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="checkbox">Checkbox (Yes/No)</option>
                  <option value="select">Dropdown (Select)</option>
                </select>
              </div>

              {newFieldType === 'select' && (
                <div className="form-group">
                  <label>Dropdown Options (comma separated)</label>
                  <textarea
                    placeholder="Option 1, Option 2, Option 3"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              <button
                type="button"
                className="edit-btn add-field-btn"
                onClick={handleAddField}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Add Field'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PersonnelFieldsConfigPage;
