import React, { useState, useMemo, useEffect } from 'react';
import { buildFullName } from '../utils/personnelName';
import { useStudents } from '../context/StudentContext';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext';
import { useSections } from '../context/SectionContext';
import StudentPromotionModal from '../components/StudentPromotionModal';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import './StudentsPage.css';

const StudentsPage = () => {
  const { user } = useAuth();
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);
  const { students, loading, error, updateStudent, addStudent, addBulkStudents, deleteStudent } = useStudents();
  const { sections, loading: sectionsLoading, error: sectionsError } = useSections();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('All');
  const [filterSection, setFilterSection] = useState(searchParams.get('sectionId') || 'All');
  
  useEffect(() => {
    const sectionId = searchParams.get('sectionId');
    if (sectionId) {
      setFilterSection(sectionId);
    }
  }, [searchParams]);
  // Batch Promotion state
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [showPromotionModal, setShowPromotionModal] = useState(false);

  // Enrolment Masterlist integration state
  const [activeTab, setActiveTab] = useState('masterlist');
  const [enrolmentStudents, setEnrolmentStudents] = useState([]);
  const [selectedEnrolmentIds, setSelectedEnrolmentIds] = useState([]);
  const [targetSectionId, setTargetSectionId] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'enrolment_students'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), lrn: doc.id }));
      setEnrolmentStudents(data);
    });
    return () => unsub();
  }, []);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const [newStudentForm, setNewStudentForm] = useState({
    id: '',
    lastName: '',
    firstName: '',
    middleName: '',
    extension: '', // e.g., Jr., III
    gender: 'Male',
    address: '',
    gradeLevel: 'Grade 7',
    sectionId: '',
    is4Ps: false,
    nutritionalStatus: 'Normal'
  });

  const assignedSections = useMemo(() => {
    if (isAdmin) return sections;
    return sections.filter(section => section.adviserId === user?.uid);
  }, [sections, user, isAdmin]);

  const filteredStudents = useMemo(() => {
    let filtered = [...students];

    // Security: Non-admins should only see students in their assigned sections
    if (!isAdmin) {
      const assignedIds = assignedSections.map(s => s.id);
      filtered = filtered.filter(student => assignedIds.includes(student.sectionId));
    }

    if (searchTerm) {
      filtered = filtered.filter(student =>
        (student.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.middleName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.id || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterGrade !== 'All') {
      // Normalize comparison (e.g., 'Grade 7' vs '7')
      filtered = filtered.filter(student => {
        const sGrade = (student.gradeLevel || '').replace(/\D/g, '');
        const fGrade = filterGrade.replace(/\D/g, '');
        return sGrade === fGrade;
      });
    }

    if (filterSection !== 'All') {
      filtered = filtered.filter(student => student.sectionId === filterSection);
    }

    // Sort by Gender (Male first, then Female), then by Last Name
    return filtered.sort((a, b) => {
      if (a.gender !== b.gender) {
        return a.gender === 'Male' ? -1 : 1;
      }
      return (a.lastName || '').localeCompare(b.lastName || '');
    });
  }, [students, searchTerm, filterGrade, filterSection]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterGrade('All');
    setFilterSection('All');
  };

  const handleRowClick = (student) => {
    setSelectedStudent(student);
    setEditForm({
      ...student,
      lastName: student.lastName || '',
      firstName: student.firstName || '',
      middleName: student.middleName || '',
      extension: student.extension || '',
      gender: student.gender || 'Male'
    });
    setIsEditing(false);
    setIsAdding(false);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm(prev => {
      const updates = { [name]: type === 'checkbox' ? checked : value };
      if (name === 'sectionId') {
        const matchedSection = sections.find(s => s.id === value);
        if (matchedSection) {
          updates.gradeLevel = matchedSection.gradeLevel;
        }
      }
      return { ...prev, ...updates };
    });
  };

  const handleNewStudentChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Validation for LRN (id) - digits only and max 12
    if (name === 'id') {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length > 12) return;
      setNewStudentForm(prev => ({
        ...prev,
        id: numericValue
      }));
      return;
    }

    setNewStudentForm(prev => {
      const updates = { [name]: type === 'checkbox' ? checked : value };
      if (name === 'sectionId') {
        const matchedSection = sections.find(s => s.id === value);
        if (matchedSection) {
          updates.gradeLevel = matchedSection.gradeLevel;
        }
      }
      return { ...prev, ...updates };
    });
  };

  const formatName = (str) => {
    if (!str) return '';
    return str.trim().split(/\s+/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const handleSave = async () => {
    const isNameDuplicate = students.some(s => 
      s.id !== editForm.id &&
      (s.firstName || '').toLowerCase().trim() === (editForm.firstName || '').toLowerCase().trim() && 
      (s.lastName || '').toLowerCase().trim() === (editForm.lastName || '').toLowerCase().trim()
    );

    if (isNameDuplicate) {
      const proceed = window.confirm(`Another learner named ${editForm.firstName} ${editForm.lastName} already exists. Are you sure you want to proceed?`);
      if (!proceed) return;
    }

    const matchedSection = sections.find(s => s.id === editForm.sectionId);
    const finalStudentData = {
      ...editForm,
      firstName: formatName(editForm.firstName),
      lastName: formatName(editForm.lastName),
      middleName: formatName(editForm.middleName),
      gradeLevel: matchedSection ? matchedSection.gradeLevel : editForm.gradeLevel
    };

    await updateStudent(finalStudentData);
    setSelectedStudent(finalStudentData);
    setIsEditing(false);
    alert('Student profile updated successfully!');
  };

  const handleAddNew = async () => {
    if (!newStudentForm.id || !newStudentForm.lastName || !newStudentForm.firstName || !newStudentForm.sectionId) {
      alert('Please fill in at least the LRN, Last Name, First Name, and Section.');
      return;
    }
    
    if (newStudentForm.id.length !== 12) {
      alert('LRN must be exactly 12 digits.');
      return;
    }

    // Duplicate LRN Check
    const isLrnDuplicate = students.some(s => s.id === newStudentForm.id);
    if (isLrnDuplicate) {
      alert(`A learner with LRN ${newStudentForm.id} already exists in the system.`);
      return;
    }

    // Duplicate Name Check
    const isNameDuplicate = students.some(s => 
      (s.firstName || '').toLowerCase().trim() === (newStudentForm.firstName || '').toLowerCase().trim() && 
      (s.lastName || '').toLowerCase().trim() === (newStudentForm.lastName || '').toLowerCase().trim()
    );

    if (isNameDuplicate) {
      const proceed = window.confirm(`A learner named ${newStudentForm.firstName} ${newStudentForm.lastName} already exists. Are you sure you want to proceed?`);
      if (!proceed) return;
    }

    const matchedSection = sections.find(s => s.id === newStudentForm.sectionId);
    const finalStudentData = {
      ...newStudentForm,
      firstName: formatName(newStudentForm.firstName),
      lastName: formatName(newStudentForm.lastName),
      middleName: formatName(newStudentForm.middleName),
      gradeLevel: matchedSection ? matchedSection.gradeLevel : newStudentForm.gradeLevel
    };

    await addStudent(finalStudentData);
    setIsAdding(false);
    setNewStudentForm({
      id: '',
      lastName: '',
      firstName: '',
      middleName: '',
      extension: '',
      gender: 'Male',
      address: '',
      gradeLevel: 'Grade 7',
      sectionId: '',
      is4Ps: false,
      nutritionalStatus: 'Normal'
    });
    alert('New student added successfully!');
  };

  const generateStudentCSVTemplate = () => {
    const headers = ['id', 'lastName', 'firstName', 'middleName', 'extension', 'gender', 'address', 'gradeLevel', 'sectionId', 'is4Ps', 'nutritionalStatus'];
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
        const cleanText = text.replace(/^\ufeff/, '');
        const lines = cleanText.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) {
          alert('CSV file is empty or only contains headers.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, '').replace(/[._]/g, '').replace(/ /g, ''));
        console.log('Detected Headers:', headers);

        const studentsToBulkAdd = [];
        let rejectedCount = 0;
        let invalidLrnCount = 0;
        let permissionDeniedCount = 0;
        let duplicateCount = 0;
        const seenInCsv = new Set();

        for (let i = 1; i < lines.length; i++) {
          // ... [line parsing logic remains the same]
          const values = [];
          let current = "";
          let inQuotes = false;
          const line = lines[i];
          
          for (let char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ""; }
            else current += char;
          }
          values.push(current.trim());

          const studentData = {};
          headers.forEach((header, index) => {
            let value = values[index] || '';
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.substring(1, value.length - 1);
            }
            
            // Map header names
            let key = header;
            if (['id', 'lrn', 'studentid', 'studentnumber', 'stno', 'learnerreferencenumber'].includes(header)) key = 'id';
            if (['section', 'sectionname', 'sectionid', 'class'].includes(header)) key = 'sectionId';
            if (['grade', 'gradelevel', 'yearlevel', 'level'].includes(header)) key = 'gradeLevel';
            if (['lastname', 'surname', 'familyname'].includes(header)) key = 'lastName';
            if (['firstname', 'givenname'].includes(header)) key = 'firstName';
            
            if (key === 'is4ps' || key === '4ps' || key === 'pantawid') {
              studentData['is4Ps'] = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true' || value === '1';
            } else {
              studentData[key] = value;
            }
          });

          // Validation & Normalization
          const id = studentData.id || '';
          const lastName = studentData.lastName || '';
          const firstName = studentData.firstName || '';

          if (id && lastName && firstName) {
            // 1. Check for duplicates within the CSV itself
            if (seenInCsv.has(id)) {
              console.warn(`Duplicate LRN in CSV: ${id}`);
              duplicateCount++;
              continue;
            }
            seenInCsv.add(id);

            // 2. Check for duplicates in the existing masterlist
            const exists = students.some(s => s.id === id);
            if (exists) {
              console.warn(`LRN ${id} already exists in masterlist.`);
              duplicateCount++;
              continue;
            }

            // Try to resolve sectionId from name if possible
            let resolvedSectionId = studentData.sectionId || '';
            const matchedSection = sections.find(s => 
              s.name.toLowerCase() === resolvedSectionId.toLowerCase() || 
              s.id.toLowerCase() === resolvedSectionId.toLowerCase()
            );
            
            if (!matchedSection) {
              // Reject students mapped to non-existent sections
              rejectedCount++;
              continue;
            }
            
            resolvedSectionId = matchedSection.id;

            // PERMISSION CHECK
            if (!isAdmin) {
              const isAdviser = assignedSections.some(s => s.id === resolvedSectionId);
              if (!isAdviser) {
                permissionDeniedCount++;
                continue;
              }
            }

            if (id.length !== 12) {
              invalidLrnCount++;
              continue;
            }

            studentsToBulkAdd.push({
              id: id,
              lastName: formatName(lastName),
              firstName: formatName(firstName),
              middleName: formatName(studentData.middleName),
              extension: studentData.extension || '',
              gender: studentData.gender || 'Male',
              address: studentData.address || '',
              gradeLevel: studentData.gradeLevel || 'Grade 7',
              sectionId: resolvedSectionId,
              is4Ps: !!studentData.is4Ps,
              nutritionalStatus: studentData.nutritionalStatus || 'Normal',
            });
          } else {
            rejectedCount++;
          }
        }

        if (studentsToBulkAdd.length > 0) {
          try {
            await addBulkStudents(studentsToBulkAdd);
            setShowBulkUpload(false);
            
            let message = `SUCCESS! Added ${studentsToBulkAdd.length} new learners.`;
            if (duplicateCount > 0) message += `\n\n⚠️ ${duplicateCount} learners were SKIPPED because their LRN already exists in the system.`;
            if (permissionDeniedCount > 0) message += `\n\n⛔ ${permissionDeniedCount} learners were skipped (Permission Denied).`;
            if (invalidLrnCount > 0) message += `\n\n❌ ${invalidLrnCount} learners had invalid LRN lengths.`;
            
            alert(message);
          } catch (err) {
            console.error('Bulk add error:', err);
            alert(`UPLOAD FAILED: ${err.message}`);
          }
        } else {
          let message = 'No new learner data found to add.';
          if (duplicateCount > 0) message += `\n\n⚠️ All learners in the CSV already exist in the masterlist.`;
          alert(message);
        }
        event.target.value = null;
      };
      reader.readAsText(file);
    }
  };

  const handleExportCSV = () => {
    const headers = ['LRN', 'Last Name', 'First Name', 'Middle Name', 'Extension', 'Gender', 'Grade Level', 'Section ID', 'Address', '4Ps', 'Nutritional Status'];
    const csvContent = [
      headers.join(','),
      ...filteredStudents.map(s => [
        s.id,
        `"${s.lastName}"`,
        `"${s.firstName}"`,
        `"${s.middleName}"`,
        `"${s.extension}"`,
        s.gender,
        s.gradeLevel,
        s.sectionId,
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
          <h1>Learner Management</h1>
          {(isAdmin || assignedSections.length > 0) && (
            <div className="header-actions">
              {isAdmin && (
                <>
                  <button className="export-btn-outline" onClick={() => navigate('/sections?view=JHS')}>
                    ← JHS Sections
                  </button>
                  <button className="export-btn-outline" onClick={() => navigate('/sections?view=SHS')}>
                    ← SHS Sections
                  </button>
                </>
              )}
              <button className="export-btn-outline" onClick={handleExportCSV}>
                📥 Export CSV
              </button>
              <button className="add-btn-primary" onClick={() => {
                setIsAdding(true);
                setSelectedStudent(null);
                setShowBulkUpload(false);
                setActiveTab('masterlist');
                setSelectedEnrolmentIds([]);
                setTargetSectionId(filterSection !== 'All' ? filterSection : (assignedSections[0]?.id || ''));
                
                if (filterSection !== 'All') {
                  const matchedSection = sections.find(s => s.id === filterSection);
                  setNewStudentForm({
                    id: '',
                    lastName: '',
                    firstName: '',
                    middleName: '',
                    extension: '',
                    gender: 'Male',
                    address: '',
                    gradeLevel: matchedSection ? matchedSection.gradeLevel : 'Grade 7',
                    sectionId: filterSection,
                    is4Ps: false,
                    nutritionalStatus: 'Normal'
                  });
                } else {
                  setNewStudentForm({
                    id: '',
                    lastName: '',
                    firstName: '',
                    middleName: '',
                    extension: '',
                    gender: 'Male',
                    address: '',
                    gradeLevel: 'Grade 7',
                    sectionId: '',
                    is4Ps: false,
                    nutritionalStatus: 'Normal'
                  });
                }
              }}>
                + Add New Learner
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
            placeholder="Search by name or LRN..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {isAdmin && (
            <>
              <select 
                value={filterGrade} 
                onChange={(e) => {
                  setFilterGrade(e.target.value);
                  setFilterSection('All');
                }}
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
                {assignedSections
                  .filter(section => filterGrade === 'All' || section.gradeLevel === filterGrade)
                  .map(section => (
                  <option key={section.id} value={section.id}>{section.name}</option>
                ))}
              </select>
            </>
          )}
          {(searchTerm || (isAdmin && (filterGrade !== 'All' || filterSection !== 'All'))) && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      <div className="students-content">
        <div className="table-wrapper">
          <table className="students-table">
            <thead>
              <tr>
                <th>LRN</th>
                <th>Last Name</th>
                <th>First Name</th>
                <th>Middle Name</th>
                <th>Gender</th>
                <th>Grade & Section</th>
                <th>Status</th>
                <th>4Ps</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => {
                const studentSection = sections.find(s => s.id === student.sectionId);
                return (
                  <tr key={student.id} onClick={() => handleRowClick(student)} className={selectedStudent?.id === student.id ? 'selected' : ''}>
                    <td>{student.id}</td>
                    <td style={{ fontWeight: 600 }}>{student.lastName}</td>
                    <td>{student.firstName}</td>
                    <td>{student.middleName}</td>
                    <td>
                      <span className={`gender-badge ${student.gender?.toLowerCase()}`}>
                        {student.gender}
                      </span>
                    </td>
                    <td>{student.gradeLevel} - {studentSection ? studentSection.name : student.sectionId || 'N/A'}</td>
                    <td>
                      <span className="badge" style={{ 
                        background: (!student.status || student.status === 'Active') ? '#dcfce7' : '#fee2e2',
                        color: (!student.status || student.status === 'Active') ? '#166534' : '#991b1b',
                        border: `1px solid ${(!student.status || student.status === 'Active') ? '#bbf7d0' : '#fecaca'}`
                      }}>
                        {student.status || 'Active'}
                      </span>
                    </td>
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
              <h2>Learner Profile</h2>
              <button className="close-btn" onClick={() => setSelectedStudent(null)}>×</button>
            </div>
            
            <div className="detail-body">
              {!isEditing ? (
                <div className="profile-view">
                  <div className="profile-group">
                    <label>LRN:</label>
                    <p>{selectedStudent.id}</p>
                  </div>
                  <div className="profile-group">
                    <label>Full Name:</label>
                    <p>
                       {buildFullName({
                         lastName: selectedStudent.lastName,
                         firstName: selectedStudent.firstName,
                         middleName: selectedStudent.middleName,
                         nameExtension: selectedStudent.extension
                       })}
                    </p>
                  </div>
                  <div className="profile-group">
                    <label>Gender:</label>
                    <p>{selectedStudent.gender}</p>
                  </div>
                  <div className="profile-group">
                    <label>Grade & Section:</label>
                    <p>{selectedStudent.gradeLevel} - {sections.find(s => s.id === selectedStudent.sectionId)?.name || selectedStudent.sectionId}</p>
                  </div>
                  <div className="profile-group">
                    <label>Enrollment Status:</label>
                    <p style={{ fontWeight: 'bold', color: (!selectedStudent.status || selectedStudent.status === 'Active') ? '#166534' : '#991b1b' }}>
                      {selectedStudent.status || 'Active'}
                    </p>
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
                  <div className="form-row">
                    <div className="form-group">
                      <label>Last Name</label>
                      <input type="text" name="lastName" value={editForm.lastName} onChange={handleEditChange} />
                    </div>
                    <div className="form-group">
                      <label>First Name</label>
                      <input type="text" name="firstName" value={editForm.firstName} onChange={handleEditChange} />
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
                  <div className="form-group">
                    <label>Gender</label>
                    <select name="gender" value={editForm.gender} onChange={handleEditChange}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
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
          <div className="student-detail-overlay">
            <div className="student-detail-panel" style={{ maxWidth: activeTab === 'masterlist' ? '800px' : '500px' }}>
              <div className="detail-header">
                <h2>Add New Learner</h2>
                <button className="close-btn" onClick={() => setIsAdding(false)}>×</button>
              </div>

              <div className="tabs-header" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 1.5rem', marginTop: '0.5rem' }}>
                <button 
                  className={`tab-btn ${activeTab === 'masterlist' ? 'active' : ''}`}
                  onClick={() => setActiveTab('masterlist')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'masterlist' ? '3px solid var(--primary-blue)' : '3px solid transparent',
                    color: activeTab === 'masterlist' ? 'var(--primary-blue)' : 'var(--gray-500)',
                    fontWeight: activeTab === 'masterlist' ? '600' : '500',
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                >
                  Pick from Enrolment Masterlist
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
                  onClick={() => setActiveTab('manual')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'manual' ? '3px solid var(--primary-blue)' : '3px solid transparent',
                    color: activeTab === 'manual' ? 'var(--primary-blue)' : 'var(--gray-500)',
                    fontWeight: activeTab === 'manual' ? '600' : '500',
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                >
                  Manual Entry
                </button>
              </div>
            
              <div className="detail-body">
                {activeTab === 'manual' ? (
                  <div className="profile-edit">
                    <div className="form-group">
                      <label>LRN</label>
                      <input 
                        type="text" 
                        name="id" 
                        value={newStudentForm.id} 
                        onChange={handleNewStudentChange} 
                        placeholder="12-digit number" 
                        maxLength={12}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Last Name</label>
                        <input type="text" name="lastName" value={newStudentForm.lastName} onChange={handleNewStudentChange} placeholder="Dela Cruz" />
                      </div>
                      <div className="form-group">
                        <label>First Name</label>
                        <input type="text" name="firstName" value={newStudentForm.firstName} onChange={handleNewStudentChange} placeholder="Juan" />
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
                    <div className="form-group">
                      <label>Gender</label>
                      <select name="gender" value={newStudentForm.gender} onChange={handleNewStudentChange}>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Address</label>
                      <textarea name="address" value={newStudentForm.address} onChange={handleNewStudentChange} placeholder="Enter address" />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Grade Level</label>
                        <select 
                          name="gradeLevel" 
                          value={newStudentForm.gradeLevel} 
                          onChange={handleNewStudentChange}
                          disabled={filterSection !== 'All'}
                        >
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
                        <select 
                          name="sectionId" 
                          value={newStudentForm.sectionId} 
                          onChange={handleNewStudentChange}
                          disabled={filterSection !== 'All'}
                        >
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
                      <button className="save-btn" onClick={handleAddNew}>Add Learner</button>
                      <button className="cancel-btn" onClick={() => setIsAdding(false)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="enrolment-masterlist-view">
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Target Section</label>
                      <select 
                        value={targetSectionId} 
                        onChange={(e) => {
                          setTargetSectionId(e.target.value);
                          setSelectedEnrolmentIds([]);
                        }}
                        style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid #ccc' }}
                      >
                        <option value="">Select Target Section</option>
                        {assignedSections.map(section => (
                          <option key={section.id} value={section.id}>{section.name} ({section.gradeLevel})</option>
                        ))}
                      </select>
                    </div>

                    {targetSectionId ? (() => {
                      const selectedSection = sections.find(s => s.id === targetSectionId);
                      const filteredEnrollees = enrolmentStudents.filter(es => {
                        // Normalize grade level string matching
                        const sectionGrade = selectedSection?.gradeLevel.replace(/\D/g, '');
                        const enrolleeGrade = (es.gradeLevel || '').replace(/\D/g, '');
                        return sectionGrade === enrolleeGrade && !students.some(s => s.id === es.lrn);
                      });

                      if (filteredEnrollees.length === 0) {
                        return (
                          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <p style={{ color: '#666', fontSize: '1.1rem' }}>No unassigned enrollees found for {selectedSection?.gradeLevel}.</p>
                            <p style={{ color: '#999', fontSize: '0.9rem', marginTop: '0.5rem' }}>They might have been assigned to other sections.</p>
                          </div>
                        );
                      }

                      return (
                        <>
                          <div className="table-wrapper" style={{ marginTop: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                            <table className="students-table" style={{ borderTop: '1px solid #e2e8f0' }}>
                              <thead>
                                <tr>
                                  <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={selectedEnrolmentIds.length === filteredEnrollees.length && filteredEnrollees.length > 0}
                                      onChange={(e) => {
                                        if (e.target.checked) setSelectedEnrolmentIds(filteredEnrollees.map(es => es.lrn));
                                        else setSelectedEnrolmentIds([]);
                                      }}
                                    />
                                  </th>
                                  <th>LRN</th>
                                  <th>Name</th>
                                  <th>Gender</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredEnrollees.map(es => (
                                  <tr key={es.lrn} onClick={() => {
                                    if (selectedEnrolmentIds.includes(es.lrn)) setSelectedEnrolmentIds(prev => prev.filter(id => id !== es.lrn));
                                    else setSelectedEnrolmentIds(prev => [...prev, es.lrn]);
                                  }}>
                                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                      <input 
                                        type="checkbox"
                                        checked={selectedEnrolmentIds.includes(es.lrn)}
                                        onChange={(e) => {
                                          if (e.target.checked) setSelectedEnrolmentIds(prev => [...prev, es.lrn]);
                                          else setSelectedEnrolmentIds(prev => prev.filter(id => id !== es.lrn));
                                        }}
                                      />
                                    </td>
                                    <td>{es.lrn}</td>
                                    <td style={{ fontWeight: '500' }}>{formatName(es.lastName)}, {formatName(es.firstName)} {formatName(es.middleName)}</td>
                                    <td>
                                      <span className={`gender-badge ${es.gender?.toLowerCase() || 'male'}`}>
                                        {es.gender || 'Male'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="edit-actions" style={{ marginTop: '1.5rem' }}>
                            <button 
                              className="save-btn" 
                              style={{ 
                                opacity: selectedEnrolmentIds.length === 0 ? 0.6 : 1,
                                cursor: selectedEnrolmentIds.length === 0 ? 'not-allowed' : 'pointer'
                              }}
                              onClick={async () => {
                                if (selectedEnrolmentIds.length === 0) return;
                                
                                if (window.confirm(`Enroll ${selectedEnrolmentIds.length} learners to ${selectedSection.name}?`)) {
                                  const enrolleesToAdd = filteredEnrollees.filter(es => selectedEnrolmentIds.includes(es.lrn)).map(es => ({
                                    id: es.lrn,
                                    lastName: formatName(es.lastName),
                                    firstName: formatName(es.firstName),
                                    middleName: formatName(es.middleName),
                                    extension: es.extName || '',
                                    gender: es.gender || 'Male',
                                    address: '',
                                    gradeLevel: selectedSection.gradeLevel,
                                    sectionId: selectedSection.id,
                                    is4Ps: !!es.is4Ps,
                                    nutritionalStatus: 'Normal'
                                  }));
                                  
                                  try {
                                    await addBulkStudents(enrolleesToAdd);
                                    alert(`Successfully enrolled ${enrolleesToAdd.length} learners!`);
                                    setSelectedEnrolmentIds([]);
                                    setIsAdding(false);
                                  } catch (error) {
                                    console.error('Error bulk enrolling:', error);
                                    alert('Failed to enroll learners.');
                                  }
                                }
                              }}
                              disabled={selectedEnrolmentIds.length === 0}
                            >
                              Bulk Enroll Selected ({selectedEnrolmentIds.length})
                            </button>
                            <button className="cancel-btn" onClick={() => setIsAdding(false)}>Cancel</button>
                          </div>
                        </>
                      );
                    })() : (
                      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <p style={{ color: '#666', fontSize: '1.1rem' }}>Please select a target section to view available enrollees.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showBulkUpload && (
          <div className="student-detail-panel">
            <div className="detail-header">
              <h2>Bulk Upload Learners</h2>
              <button className="close-btn" onClick={() => setShowBulkUpload(false)}>×</button>
            </div>
            <div className="detail-body">
              <p>Upload a CSV file containing student data. Headers should include:</p>
              <ul>
                <li>`id` (LRN)</li>
                <li>`lastName`, `firstName`, `middleName`, `extension`</li>
                <li>`gender` (Male/Female)</li>
                <li>`address`, `gradeLevel`, `sectionId`, `is4Ps`, `nutritionalStatus`</li>
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
