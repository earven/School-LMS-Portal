import React, { useState } from 'react';
import { usePersonnel } from '../context/PersonnelContext';
import { useAuth } from '../context/AuthContext.jsx';
import './PersonnelPage.css';

const PersonnelPage = () => {
  const { personnel, loading, error, updatePersonnel, addPersonnel, deletePersonnel } = usePersonnel();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const [newPersonForm, setNewPersonForm] = useState({
    id: '', // This will be the UID from Firebase Auth if creating a new user
    email: '', // Required for Firebase Auth
    password: '', // Required for Firebase Auth
    fullName: '',
    position: 'Teacher I',
    role: 'teacher',
    teachingLoad: '',
    assignedReports: '',
    assignedSections: [], // New field for sections
  });

  const isAdmin = user?.role === 'admin';
  // Find current authenticated user's personnel record from the fetched personnel list
  const currentUserPersonnel = personnel.find(p => p.id === user?.uid);

  // If not admin, restrict view to own profile or assigned sections
  const displayedPersonnel = isAdmin 
    ? personnel.filter(p => 
        p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : (currentUserPersonnel ? [currentUserPersonnel] : []);

  const handleRowClick = (person) => {
    if (isAdmin || person.id === user?.uid) { // Allow teachers to view their own profile
      setSelectedPerson(person);
      setEditForm(person);
      setIsEditing(false);
      setIsAdding(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleNewPersonChange = (e) => {
    const { name, value } = e.target;
    setNewPersonForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    await updatePersonnel(editForm);
    setSelectedPerson(editForm);
    setIsEditing(false);
    alert('Personnel record updated successfully!');
  };

  const handleAddNew = async () => {
    if (!newPersonForm.email || !newPersonForm.password || !newPersonForm.fullName) {
      alert('Please fill in the Email, Password, and Full Name.');
      return;
    }
    // The actual Firebase Auth user creation will happen elsewhere (e.g. via Cloud Function)
    // For now, we'll just add the personnel data to Firestore. The ID should come from Auth.
    // For this example, we'll create a dummy ID. In a real app, you'd link this to Auth user creation.
    const newPersonWithId = { ...newPersonForm, id: newPersonForm.id || `temp_${Date.now()}` };
    await addPersonnel(newPersonWithId);
    setIsAdding(false);
    setNewPersonForm({
      id: '',
      email: '',
      password: '',
      fullName: '',
      position: 'Teacher I',
      role: 'teacher',
      teachingLoad: '',
      assignedReports: '',
      assignedSections: [],
    });
    alert('New personnel record added successfully!');
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Email', 'Full Name', 'Position', 'Role', 'Teaching Load', 'Assigned Reports', 'Assigned Sections'];
    const csvContent = [
      headers.join(','),
      ...displayedPersonnel.map(p => [
        p.id,
        p.email || '',
        `"${p.fullName}"`,
        `"${p.position}"`,
        p.role,
        `"${p.teachingLoad || ''}"`,
        `"${p.assignedReports || ''}"`,
        `"${(p.assignedSections || []).join(';')}"`
      ].join(','))
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

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this personnel record? This action cannot be undone.')) {
      await deletePersonnel(id);
      setSelectedPerson(null);
      alert('Personnel record deleted.');
    }
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
              <button className="add-btn-primary" onClick={() => {
                setIsAdding(true);
                setSelectedPerson(null);
              }}>
                + Add New Personnel
              </button>
            </div>
          )}
        </div>
        {isAdmin && (
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        )}
      </div>

      <div className="personnel-content">
        {isAdmin ? (
          <div className="table-wrapper">
            <table className="personnel-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Full Name</th>
                  <th>Position</th>
                  <th>Role</th>
                  <th>Sections</th>
                </tr>
              </thead>
              <tbody>
                {displayedPersonnel.map(p => (
                  <tr key={p.id} onClick={() => handleRowClick(p)} className={selectedPerson?.id === p.id ? 'selected' : ''}>
                    <td>{p.email}</td>
                    <td>{p.fullName}</td>
                    <td>{p.position}</td>
                    <td className="capitalize">{p.role}</td>
                    <td>{(p.assignedSections || []).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          showOwnProfileOnly && (
            <div className="profile-view-only">
               <div className="profile-card">
                  <h2>{currentUserPersonnel.fullName}</h2>
                  <p className="position-tag">{currentUserPersonnel.position} • {currentUserPersonnel.role.toUpperCase()}</p>
                  <hr />
                  <div className="profile-info-grid">
                    <div className="info-item">
                      <label>Personnel ID</label>
                      <span>{currentUserPersonnel.id}</span>
                    </div>
                    <div className="info-item">
                      <label>Email</label>
                      <span>{currentUserPersonnel.email}</span>
                    </div>
                    <div className="info-item">
                      <label>Teaching Load</label>
                      <span>{currentUserPersonnel.teachingLoad || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <label>Assigned Reports</label>
                      <span>{currentUserPersonnel.assignedReports || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <label>Assigned Sections</label>
                      <span>{(currentUserPersonnel.assignedSections || []).join(', ') || 'N/A'}</span>
                    </div>
                  </div>
               </div>
            </div>
          )
        )}

        {isAdmin && selectedPerson && (
          <div className="personnel-detail-panel">
            <div className="detail-header">
              <h2>Personnel Profile</h2>
              <button className="close-btn" onClick={() => setSelectedPerson(null)}>×</button>
            </div>
            
            <div className="detail-body">
              {!isEditing ? (
                <div className="profile-view">
                  <div className="profile-group">
                    <label>ID:</label>
                    <p>{selectedPerson.id}</p>
                  </div>
                  <div className="profile-group">
                    <label>Email:</label>
                    <p>{selectedPerson.email}</p>
                  </div>
                  <div className="profile-group">
                    <label>Full Name:</label>
                    <p>{selectedPerson.fullName}</p>
                  </div>
                  <div className="profile-group">
                    <label>Position:</label>
                    <p>{selectedPerson.position}</p>
                  </div>
                  <div className="profile-group">
                    <label>Role:</label>
                    <p className="capitalize">{selectedPerson.role}</p>
                  </div>
                  <div className="profile-group">
                    <label>Teaching Load:</label>
                    <p>{selectedPerson.teachingLoad || 'N/A'}</p>
                  </div>
                  <div className="profile-group">
                    <label>Assigned Reports:</label>
                    <p>{selectedPerson.assignedReports || 'N/A'}</p>
                  </div>
                  <div className="profile-group">
                    <label>Assigned Sections:</label>
                    <p>{(selectedPerson.assignedSections || []).join(', ') || 'N/A'}</p>
                  </div>
                  <div className="profile-actions">
                    <button className="edit-btn" onClick={() => setIsEditing(true)}>Edit Record</button>
                    <button className="delete-btn-outline" onClick={() => handleDelete(selectedPerson.id)}>Delete Record</button>
                  </div>
                </div>
              ) : (
                <div className="profile-edit">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" name="fullName" value={editForm.fullName} onChange={handleEditChange} />
                  </div>
                  <div className="form-group">
                    <label>Position</label>
                    <input type="text" name="position" value={editForm.position} onChange={handleEditChange} />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <select name="role" value={editForm.role} onChange={handleEditChange}>
                      <option value="admin">Admin</option>
                      <option value="teacher">Teacher</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Teaching Load</label>
                    <input type="text" name="teachingLoad" value={editForm.teachingLoad} onChange={handleEditChange} />
                  </div>
                  <div className="form-group">
                    <label>Assigned Reports</label>
                    <textarea name="assignedReports" value={editForm.assignedReports} onChange={handleEditChange} />
                  </div>
                  <div className="form-group">
                    <label>Assigned Sections (comma-separated IDs)</label>
                    <input 
                      type="text" 
                      name="assignedSections" 
                      value={(editForm.assignedSections || []).join(', ')} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, assignedSections: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                    />
                  </div>
                  <div className="edit-actions">
                    <button className="save-btn" onClick={handleSave}>Save Changes</button>
                    <button className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isAdmin && isAdding && (
          <div className="personnel-detail-panel">
            <div className="detail-header">
              <h2>Add New Personnel</h2>
              <button className="close-btn" onClick={() => setIsAdding(false)}>×</button>
            </div>
            
            <div className="detail-body">
              <div className="profile-edit">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" value={newPersonForm.email} onChange={handleNewPersonChange} placeholder="personnel@example.com" />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" name="password" value={newPersonForm.password} onChange={handleNewPersonChange} placeholder="******" />
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" name="fullName" value={newPersonForm.fullName} onChange={handleNewPersonChange} placeholder="Enter full name" />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input type="text" name="position" value={newPersonForm.position} onChange={handleNewPersonChange} placeholder="e.g. Teacher II" />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select name="role" value={newPersonForm.role} onChange={handleNewPersonChange}>
                    <option value="admin">Admin</option>
                    <option value="teacher">Teacher</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Teaching Load</label>
                  <input type="text" name="teachingLoad" value={newPersonForm.teachingLoad} onChange={handleNewPersonChange} placeholder="e.g. Math 10, Science 9" />
                </div>
                <div className="form-group">
                  <label>Assigned Reports</label>
                  <textarea name="assignedReports" value={newPersonForm.assignedReports} onChange={handleNewPersonChange} placeholder="Assigned reports and tasks" />
                </div>
                <div className="form-group">
                    <label>Assigned Sections (comma-separated IDs)</label>
                    <input 
                      type="text" 
                      name="assignedSections" 
                      value={(newPersonForm.assignedSections || []).join(', ')} 
                      onChange={(e) => setNewPersonForm(prev => ({ ...prev, assignedSections: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                      placeholder="e.g., Grade7-A, Grade8-B"
                    />
                  </div>
                <div className="edit-actions">
                  <button className="save-btn" onClick={handleAddNew}>Add Personnel</button>
                  <button className="cancel-btn" onClick={() => setIsAdding(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonnelPage;
