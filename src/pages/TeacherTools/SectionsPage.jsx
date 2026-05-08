// src/pages/SectionsPage.jsx
import React, { useState, useEffect } from 'react';
import { useSections } from "../../context/SectionContext";
import { usePersonnel } from '../../context/PersonnelContext'; // To assign teachers
import './SectionsPage.css'; // You'll need to create this CSS file

const SectionsPage = () => {
  const { sections, loading, error, addSection, updateSection, deleteSection } = useSections();
  const { personnel } = usePersonnel(); // All personnel to select advisors from

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [newSectionForm, setNewSectionForm] = useState({
    name: '',
    gradeLevel: 'Grade 7',
    adviserId: '',
    adviserName: '',
    yearCreated: new Date().getFullYear().toString(),
    isActive: true,
  });
  const [editSectionForm, setEditSectionForm] = useState(null);

  const availableTeachers = personnel.filter(p => p.role === 'teacher');

  const handleNewSectionChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewSectionForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEditSectionChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditSectionForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAdviserSelect = (e, formType) => {
    const teacherId = e.target.value;
    const teacher = availableTeachers.find(t => t.id === teacherId);
    if (formType === 'new') {
      setNewSectionForm(prev => ({
        ...prev,
        adviserId: teacher ? teacher.id : '',
        adviserName: teacher ? teacher.fullName : '',
      }));
    } else {
      setEditSectionForm(prev => ({
        ...prev,
        adviserId: teacher ? teacher.id : '',
        adviserName: teacher ? teacher.fullName : '',
      }));
    }
  };

  const handleAddSection = async () => {
    if (!newSectionForm.name || !newSectionForm.gradeLevel) {
      alert('Section Name and Grade Level are required.');
      return;
    }
    await addSection(newSectionForm);
    setIsAdding(false);
    setNewSectionForm({
      name: '',
      gradeLevel: 'Grade 7',
      adviserId: '',
      adviserName: '',
      yearCreated: new Date().getFullYear().toString(),
      isActive: true,
    });
    alert('Section added successfully!');
  };

  const handleUpdateSection = async () => {
    if (!editSectionForm.name || !editSectionForm.gradeLevel) {
      alert('Section Name and Grade Level are required.');
      return;
    }
    await updateSection(editSectionForm);
    setIsEditing(false);
    setSelectedSection(editSectionForm); // Update selected section details
    alert('Section updated successfully!');
  };

  const handleDeleteSection = async (id) => {
    if (window.confirm('Are you sure you want to delete this section? This action cannot be undone.')) {
      await deleteSection(id);
      setSelectedSection(null);
      alert('Section deleted successfully!');
    }
  };

  if (loading) {
    return <div className="loading-indicator">Loading sections...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="sections-container">
      <div className="sections-header">
        <h1>Section Management</h1>
        <button className="add-btn-primary" onClick={() => {
          setIsAdding(true);
          setIsEditing(false);
          setSelectedSection(null);
        }}>
          + Add New Section
        </button>
      </div>

      <div className="sections-content">
        <div className="table-wrapper">
          <table className="sections-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Grade Level</th>
                <th>Adviser</th>
                <th>Year Created</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sections.map(section => (
                <tr key={section.id} onClick={() => {
                  setSelectedSection(section);
                  setEditSectionForm(section);
                  setIsEditing(true);
                  setIsAdding(false);
                }}>
                  <td>{section.name}</td>
                  <td>{section.gradeLevel}</td>
                  <td>{section.adviserName || 'N/A'}</td>
                  <td>{section.yearCreated}</td>
                  <td>{section.isActive ? 'Yes' : 'No'}</td>
                  <td>
                    <button className="delete-btn-outline" onClick={(e) => {
                      e.stopPropagation(); // Prevent row click
                      handleDeleteSection(section.id);
                    }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isAdding && (
          <div className="section-detail-panel">
            <div className="detail-header">
              <h2>Add New Section</h2>
              <button className="close-btn" onClick={() => setIsAdding(false)}>×</button>
            </div>
            <div className="detail-body">
              <div className="form-group">
                <label>Section Name</label>
                <input type="text" name="name" value={newSectionForm.name} onChange={handleNewSectionChange} />
              </div>
              <div className="form-group">
                <label>Grade Level</label>
                <select name="gradeLevel" value={newSectionForm.gradeLevel} onChange={handleNewSectionChange}>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>
              <div className="form-group">
                <label>Adviser</label>
                <select name="adviserId" value={newSectionForm.adviserId} onChange={(e) => handleAdviserSelect(e, 'new')}>
                  <option value="">Select an Adviser</option>
                  {availableTeachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Year Created</label>
                <input type="text" name="yearCreated" value={newSectionForm.yearCreated} onChange={handleNewSectionChange} />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="isActive" checked={newSectionForm.isActive} onChange={handleNewSectionChange} />
                  Is Active
                </label>
              </div>
              <div className="edit-actions">
                <button className="save-btn" onClick={handleAddSection}>Add Section</button>
                <button className="cancel-btn" onClick={() => setIsAdding(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {isEditing && selectedSection && (
          <div className="section-detail-panel">
            <div className="detail-header">
              <h2>Edit Section: {selectedSection.name}</h2>
              <button className="close-btn" onClick={() => setIsEditing(false)}>×</button>
            </div>
            <div className="detail-body">
              <div className="form-group">
                <label>Section Name</label>
                <input type="text" name="name" value={editSectionForm.name} onChange={handleEditSectionChange} />
              </div>
              <div className="form-group">
                <label>Grade Level</label>
                <select name="gradeLevel" value={editSectionForm.gradeLevel} onChange={handleEditSectionChange}>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>
              <div className="form-group">
                <label>Adviser</label>
                <select name="adviserId" value={editSectionForm.adviserId} onChange={(e) => handleAdviserSelect(e, 'edit')}>
                  <option value="">Select an Adviser</option>
                  {availableTeachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Year Created</label>
                <input type="text" name="yearCreated" value={editSectionForm.yearCreated} onChange={handleEditSectionChange} />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="isActive" checked={editSectionForm.isActive} onChange={handleEditSectionChange} />
                  Is Active
                </label>
              </div>
              <div className="edit-actions">
                <button className="save-btn" onClick={handleUpdateSection}>Save Changes</button>
                <button className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionsPage;
