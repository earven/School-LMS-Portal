import React, { useState, useMemo } from 'react';
import { useStudents } from '../context/StudentContext';
import { useAuth } from '../context/AuthContext.jsx';
import { useSections } from '../context/SectionContext'; // Import useSections
import './StudentsPage.css';

const StudentsPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { students, loading, error, updateStudent, addStudent, addBulkStudents, deleteStudent } = useStudents();
  const { sections, loading: sectionsLoading, error: sectionsError } = useSections(); // Fetch sections

  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('All');
  const [filterSection, setFilterSection] = useState('All'); // New filter for sections
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const [newStudentForm, setNewStudentForm] = useState({
    id: '',
    fullName: '',
    address: '',
    gradeLevel: 'Grade 7',
    sectionId: '',
    is4Ps: false,
    nutritionalStatus: 'Normal'
  });

  const assignedSections = useMemo(() => {
    if (isAdmin) return sections;
    if (user?.assignedSections) {
      return sections.filter(section => user.assignedSections.includes(section.id));
    }
    return [];
  }, [sections, user, isAdmin]);

  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Filter by assigned sections for teachers
    if (!isAdmin && user?.assignedSections) {
      filtered = filtered.filter(student => user.assignedSections.includes(student.sectionId));
    }

    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterGrade !== 'All') {
      filtered = filtered.filter(student => student.gradeLevel === filterGrade);
    }

    if (filterSection !== 'All') {
      filtered = filtered.filter(student => student.sectionId === filterSection);
    }

    return filtered;
  }, [students, searchTerm, filterGrade, filterSection, isAdmin, user]);

  const handleRowClick = (student) => {
    setSelectedStudent(student);
    setEditForm(student);
    setIsEditing(false);
    setIsAdding(false);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNewStudentChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewStudentForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    await updateStudent(editForm);
    setSelectedStudent(editForm);
    setIsEditing(false);
    alert('Student profile updated successfully!');
  };

  const handleAddNew = async () => {
    if (!newStudentForm.id || !newStudentForm.fullName || !newStudentForm.sectionId) {
      alert('Please fill in at least the Student ID, Full Name, and Section.');
      return;
    }
    await addStudent(newStudentForm);
    setIsAdding(false);
    setNewStudentForm({
      id: '',
      fullName: '',
      address: '',
      gradeLevel: 'Grade 7',
      sectionId: '',
      is4Ps: false,
      nutritionalStatus: 'Normal'
    });
    alert('New student added successfully!');
  };

  const generateStudentCSVTemplate = () => {
    const headers = ['id', 'fullName', 'address', 'gradeLevel', 'sectionId', 'is4Ps', 'nutritionalStatus'];
    const csvContent = headers.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'student_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const handleBulkUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/ /g, ''));

        const studentsToBulkAdd = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length !== headers.length) {
            console.warn(`Skipping malformed row: ${lines[i]}`);
            continue;
          }

          const studentData = {};
          headers.forEach((header, index) => {
            let value = values[index];
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.substring(1, value.length - 1);
            }

            if (header === 'is4ps') {
              studentData[header] = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
            } else if (header === 'id') {
              studentData[header] = value;
            } else {
              studentData[header] = value;
            }
          });

          // Basic validation for required fields
          if (studentData.id && studentData.fullname) {
            studentsToBulkAdd.push({
              id: studentData.id,
              fullName: studentData.fullname,
              address: studentData.address || '',
              gradeLevel: studentData.gradelevel || 'Grade 7',
              sectionId: studentData.sectionid || '', // Changed from 'section' to 'sectionId'
              is4Ps: studentData.is4ps || false,
              nutritionalStatus: studentData.nutritionalstatus || 'Normal',
            });
          } else {
            console.warn(`Skipping student with missing ID or Full Name: ${JSON.stringify(studentData)}`);
          }
        }
        await addBulkStudents(studentsToBulkAdd);
        setShowBulkUpload(false);
        alert(`${studentsToBulkAdd.length} students added successfully from CSV!`);
      };
      reader.readAsText(file);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Student ID', 'Full Name', 'Grade Level', 'Section ID', 'Address', '4Ps', 'Nutritional Status']; // Changed header
    const csvContent = [
      headers.join(','),
      ...filteredStudents.map(s => [
        s.id,
        `"${s.fullName}"`,
        s.gradeLevel,
        s.sectionId, // Changed from 'section' to 'sectionId'
        `"${s.address}"`,
        s.is4Ps ? 'Yes' : 'No',
        s.nutritionalStatus
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student record? This action cannot be undone.')) {
      await deleteStudent(id);
      setSelectedStudent(null);
      alert('Student record deleted.');
    }
  };

  if (loading || sectionsLoading) {
    return <div className="loading-indicator">Loading Students and Sections...</div>;
  }

  if (error || sectionsError) {
    return <div className="error-message">Error: {error || sectionsError}</div>;
  }

  return (
    <div className="students-container">
      <div className="students-header">
        <div className="header-title-row">
          <h1>Student Management</h1>
          {(isAdmin || assignedSections.length > 0) && (
            <div className="header-actions">
              <button className="export-btn-outline" onClick={handleExportCSV}>
                📥 Export CSV
              </button>
              <button className="add-btn-primary" onClick={() => {
                setIsAdding(true);
                setSelectedStudent(null);
                setShowBulkUpload(false);
              }}>
                + Add New Student
              </button>
              <button className="bulk-upload-btn" onClick={() => {
                setShowBulkUpload(true);
                setIsAdding(false);
                setSelectedStudent(null);
              }}>
                ⬆️ Bulk Upload
              </button>
            </div>
          )}
        </div>
        <div className="search-filter-bar">
          <input 
            type="text" 
            placeholder="Search by name or ID..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select 
            value={filterGrade} 
            onChange={(e) => setFilterGrade(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Grade Levels</option>
            <option value="Grade 7">Grade 7</option>
            <option value="Grade 8">Grade 8</option>
            <option value="Grade 9">Grade 9</option>
            <option value="Grade 10">Grade 10</option>
            <option value="Grade 11">Grade 11</option>
            <option value="Grade 12">Grade 12</option>
          </select>
          <select 
            value={filterSection} 
            onChange={(e) => setFilterSection(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Sections</option>
            {assignedSections.map(section => (
              <option key={section.id} value={section.id}>{section.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="students-content">
        <div className="table-wrapper">
          <table className="students-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Full Name</th>
                <th>Grade Level</th>
                <th>Section ID</th> {/* Changed header */}
                <th>4Ps</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => {
                const studentSection = sections.find(s => s.id === student.sectionId);
                return (
                  <tr key={student.id} onClick={() => handleRowClick(student)} className={selectedStudent?.id === student.id ? 'selected' : ''}>
                    <td>{student.id}</td>
                    <td>{student.fullName}</td>
                    <td>{student.gradeLevel}</td>
                    <td>{studentSection ? studentSection.name : student.sectionId || 'N/A'}</td>
                    <td>{student.is4Ps ? <span className="badge is-4ps">Yes</span> : <span className="badge">No</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {selectedStudent && (
          <div className="student-detail-panel">
            <div className="detail-header">
              <h2>Student Profile</h2>
              <button className="close-btn" onClick={() => setSelectedStudent(null)}>×</button>
            </div>
            
            <div className="detail-body">
              {!isEditing ? (
                <div className="profile-view">
                  <div className="profile-group">
                    <label>Student ID:</label>
                    <p>{selectedStudent.id}</p>
                  </div>
                  <div className="profile-group">
                    <label>Full Name:</label>
                    <p>{selectedStudent.fullName}</p>
                  </div>
                  <div className="profile-group">
                    <label>Grade & Section:</label>
                    <p>{selectedStudent.gradeLevel} - {sections.find(s => s.id === selectedStudent.sectionId)?.name || selectedStudent.sectionId}</p>
                  </div>
                  <div className="profile-group">
                    <label>Address:</label>
                    <p>{selectedStudent.address}</p>
                  </div>
                  <div className="profile-group">
                    <label>Nutritional Status:</label>
                    <p>{selectedStudent.nutritionalStatus}</p>
                  </div>
                  <div className="profile-group">
                    <label>4Ps Recipient:</label>
                    <p>{selectedStudent.is4Ps ? 'Yes' : 'No'}</p>
                  </div>
                  {(isAdmin || assignedSections.find(s => s.id === selectedStudent.sectionId)) && (
                    <div className="profile-actions">
                      <button className="edit-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
                      <button className="delete-btn-outline" onClick={() => handleDelete(selectedStudent.id)}>Delete Record</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="profile-edit">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" name="fullName" value={editForm.fullName} onChange={handleEditChange} />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <textarea name="address" value={editForm.address} onChange={handleEditChange} />
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
                          <option key={section.id} value={section.id}>{section.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Nutritional Status</label>
                    <select name="nutritionalStatus" value={editForm.nutritionalStatus} onChange={handleEditChange}>
                      <option value="Normal">Normal</option>
                      <option value="Underweight">Underweight</option>
                      <option value="Overweight">Overweight</option>
                      <option value="Obese">Obese</option>
                      <option value="Severely Underweight">Severely Underweight</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input type="checkbox" name="is4Ps" checked={editForm.is4Ps} onChange={handleEditChange} />
                      4Ps Recipient
                    </label>
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

        {isAdding && (
          <div className="student-detail-panel">
            <div className="detail-header">
              <h2>Add New Student</h2>
              <button className="close-btn" onClick={() => setIsAdding(false)}>×</button>
            </div>
            
            <div className="detail-body">
              <div className="profile-edit">
                <div className="form-group">
                  <label>Student ID</label>
                  <input type="text" name="id" value={newStudentForm.id} onChange={handleNewStudentChange} placeholder="STUXXXX" />
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" name="fullName" value={newStudentForm.fullName} onChange={handleNewStudentChange} placeholder="Enter full name" />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea name="address" value={newStudentForm.address} onChange={handleNewStudentChange} placeholder="Enter address" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Grade Level</label>
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
                    <label>Section</label>
                    <select name="sectionId" value={newStudentForm.sectionId} onChange={handleNewStudentChange}>
                      <option value="">Select Section</option>
                      {assignedSections.map(section => (
                        <option key={section.id} value={section.id}>{section.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Nutritional Status</label>
                  <select name="nutritionalStatus" value={newStudentForm.nutritionalStatus} onChange={handleNewStudentChange}>
                    <option value="Normal">Normal</option>
                    <option value="Underweight">Underweight</option>
                    <option value="Overweight">Overweight</option>
                    <option value="Obese">Obese</option>
                    <option value="Severely Underweight">Severely Underweight</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input type="checkbox" name="is4Ps" checked={newStudentForm.is4Ps} onChange={handleNewStudentChange} />
                    4Ps Recipient
                  </label>
                </div>
                <div className="edit-actions">
                  <button className="save-btn" onClick={handleAddNew}>Add Student</button>
                  <button className="cancel-btn" onClick={() => setIsAdding(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showBulkUpload && (
          <div className="student-detail-panel">
            <div className="detail-header">
              <h2>Bulk Upload Students</h2>
              <button className="close-btn" onClick={() => setShowBulkUpload(false)}>×</button>
            </div>
            <div className="detail-body">
              <p>Upload a CSV file containing student data. The CSV should have the following headers (case-insensitive):</p>
              <ul>
                <li>`id` (Student ID)</li>
                <li>`fullName` (Full Name)</li>
                <li>`address`</li>
                <li>`gradeLevel` (e.g., "Grade 7")</li>
                <li>`sectionId`</li> {/* Changed header */}
                <li>`is4Ps` (true/false or yes/no)</li>
                <li>`nutritionalStatus` (e.g., "Normal")</li>
              </ul>
              <button className="download-template-btn" onClick={generateStudentCSVTemplate}>
                Download CSV Template
              </button>
              <div className="form-group">
                <label htmlFor="csvUpload">Select CSV File</label>
                <input type="file" id="csvUpload" accept=".csv" onChange={handleBulkUpload} />
              </div>
              <div className="edit-actions">
                <button className="cancel-btn" onClick={() => setShowBulkUpload(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentsPage;
