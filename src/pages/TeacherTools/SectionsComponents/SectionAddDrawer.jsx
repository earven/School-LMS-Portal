import React, { useState } from 'react';
import { getDisplayName } from '../../../utils/personnelName';

const defaultForm = {
  name: '',
  gradeLevel: 'Grade 7',
  trackStrand: '',
  room: '',
  capacity: 45,
  adviserId: '',
  adviserName: '',
  yearCreated: new Date().getFullYear().toString(),
  isActive: true,
};

const SectionAddDrawer = ({
  isOpen,
  onClose,
  availableTeachers = [],
  onAddSection
}) => {
  const [newSectionForm, setNewSectionForm] = useState(defaultForm);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewSectionForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAdviserSelect = (e) => {
    const teacherId = e.target.value;
    const teacher = availableTeachers.find(t => t.id === teacherId);
    setNewSectionForm(prev => ({
      ...prev,
      adviserId: teacher ? teacher.id : '',
      adviserName: teacher ? getDisplayName(teacher) : '',
    }));
  };

  const handleSubmit = async () => {
    if (!newSectionForm.name || !newSectionForm.gradeLevel) {
      alert('Section Name and Grade Level are required.');
      return;
    }
    await onAddSection(newSectionForm);
    setNewSectionForm(defaultForm);
    onClose();
  };

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div className="section-drawer-overlay" onClick={onClose}>
      <div className="section-detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <h2>Add New Classroom Section</h2>
          <button type="button" className="close-btn" onClick={onClose} title="Close drawer (Esc)">×</button>
        </div>
      <div className="detail-body">
        <div className="form-group">
          <label>Section Name *</label>
          <input 
            type="text" 
            name="name" 
            value={newSectionForm.name} 
            onChange={handleChange} 
            placeholder="e.g. Diamond, Archimedes" 
          />
        </div>
        <div className="form-group">
          <label>Grade Level *</label>
          <select name="gradeLevel" value={newSectionForm.gradeLevel} onChange={handleChange}>
            <option value="Grade 7">Grade 7</option>
            <option value="Grade 8">Grade 8</option>
            <option value="Grade 9">Grade 9</option>
            <option value="Grade 10">Grade 10</option>
            <option value="Grade 11">Grade 11</option>
            <option value="Grade 12">Grade 12</option>
          </select>
        </div>

        {(newSectionForm.gradeLevel === 'Grade 11' || newSectionForm.gradeLevel === 'Grade 12') && (
          <div className="form-group">
            <label>SHS Track & Strand</label>
            <input 
              type="text" 
              name="trackStrand" 
              value={newSectionForm.trackStrand} 
              onChange={handleChange} 
              placeholder="e.g. STEM, HUMSS, TVL-ICT" 
            />
          </div>
        )}

        <div className="form-group">
          <label>Room / Building Location</label>
          <input 
            type="text" 
            name="room" 
            value={newSectionForm.room} 
            onChange={handleChange} 
            placeholder="e.g. Room 302, Bldg C" 
          />
        </div>

        <div className="form-group">
          <label>Class Adviser</label>
          <select name="adviserId" value={newSectionForm.adviserId} onChange={handleAdviserSelect}>
            <option value="">Select an Adviser</option>
            {availableTeachers.map(teacher => (
              <option key={teacher.id} value={teacher.id}>{getDisplayName(teacher)}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Year Created</label>
          <input 
            type="text" 
            name="yearCreated" 
            value={newSectionForm.yearCreated} 
            onChange={handleChange} 
          />
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              name="isActive" 
              checked={newSectionForm.isActive} 
              onChange={handleChange} 
            />
            Active Section
          </label>
        </div>

        <div className="edit-actions">
          <button type="button" className="save-btn" onClick={handleSubmit}>Create Section</button>
          <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  </div>
);
};

export default SectionAddDrawer;
