import React, { useState, useEffect, useMemo } from 'react';
import { useSections } from "../../context/SectionContext";
import { usePersonnel } from '../../context/PersonnelContext';
import { useStudents } from '../../context/StudentContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './SectionsPage.css';

const SectionsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sections, loading, error, addSection, updateSection, deleteSection } = useSections();
  const { personnel } = usePersonnel();
  const { students, addStudent, addBulkStudents, updateStudent, deleteStudent } = useStudents();
  const [searchParams] = useSearchParams();
  
  // ... rest of state ...
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'overview'); // 'overview', 'JHS', 'SHS'
  const [sectionStatus, setSectionStatus] = useState('active'); // 'active', 'archived'

  useEffect(() => {
    const view = searchParams.get('view');
    if (view && ['overview', 'JHS', 'SHS'].includes(view)) {
      setViewMode(view);
    }
  }, [searchParams]);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('details'); 
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
  const [newStudentForm, setNewStudentForm] = useState({
    id: '',
    lastName: '',
    firstName: '',
    middleName: '',
    extension: '',
    gender: 'Male',
    address: '',
    gradeLevel: '',
    sectionId: '',
    is4Ps: false,
    nutritionalStatus: 'Normal',
  });
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  const availableTeachers = personnel.filter(p => p.role === 'teacher');
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);

  const displayedSections = useMemo(() => {
    let filtered = isAdmin ? sections : sections.filter(s => s.adviserId === user?.uid);
    const getGradeNum = (str) => (str || '').toString().replace(/\D/g, '');
    
    if (sectionStatus === 'archived') {
      filtered = filtered.filter(s => !s.isActive);
    } else {
      filtered = filtered.filter(s => s.isActive);
    }
    
    if (viewMode === 'JHS') {
      const jhsNums = ['7', '8', '9', '10'];
      return filtered.filter(s => jhsNums.includes(getGradeNum(s.gradeLevel)));
    } else if (viewMode === 'SHS') {
      const shsNums = ['11', '12'];
      return filtered.filter(s => shsNums.includes(getGradeNum(s.gradeLevel)));
    }
    return filtered;
  }, [sections, isAdmin, user, viewMode, sectionStatus]);

  // Statistics for Overview
  const stats = useMemo(() => {
    const getGradeNum = (str) => (str || '').toString().replace(/\D/g, '');
    
    const jhsNums = ['7', '8', '9', '10'];
    const shsNums = ['11', '12'];

    const activeSections = sections.filter(s => s.isActive);
    const archivedSections = sections.filter(s => !s.isActive);

    const jhsSections = activeSections.filter(s => jhsNums.includes(getGradeNum(s.gradeLevel)));
    const shsSections = activeSections.filter(s => shsNums.includes(getGradeNum(s.gradeLevel)));

    const activeStudentIds = students.filter(s => activeSections.some(sec => sec.id === s.sectionId));
    const archivedStudents = students.filter(s => archivedSections.some(sec => sec.id === s.sectionId));

    const jhsStudents = activeStudentIds.filter(s => jhsNums.includes(getGradeNum(s.gradeLevel)));
    const shsStudents = activeStudentIds.filter(s => shsNums.includes(getGradeNum(s.gradeLevel)));

    return {
      total: activeStudentIds.length,
      jhs: {
        students: jhsStudents.length,
        sections: jhsSections.length,
        male: jhsStudents.filter(s => s.gender === 'Male').length,
        female: jhsStudents.filter(s => s.gender === 'Female').length
      },
      shs: {
        students: shsStudents.length,
        sections: shsSections.length,
        male: shsStudents.filter(s => s.gender === 'Male').length,
        female: shsStudents.filter(s => s.gender === 'Female').length
      },
      archived: {
        students: archivedStudents.length,
        sections: archivedSections.length,
        male: archivedStudents.filter(s => s.gender === 'Male').length,
        female: archivedStudents.filter(s => s.gender === 'Female').length
      }
    };
  }, [sections, students]);

  const sectionStudents = useMemo(() => {
    if (!selectedSection) return [];
    return students.filter(s => s.sectionId === selectedSection.id);
  }, [students, selectedSection]);

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

    setNewStudentForm(prev => ({
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
    setSelectedSection(editSectionForm);
    alert('Section updated successfully!');
  };

  const handleDeleteSection = async (id) => {
    if (window.confirm('Are you sure you want to delete this section? This action cannot be undone.')) {
      await deleteSection(id);
      setSelectedSection(null);
      alert('Section deleted successfully!');
    }
  };

  const handleAddStudentToSection = async () => {
    if (!newStudentForm.id || !newStudentForm.lastName || !newStudentForm.firstName) {
      alert('LRN, Last Name, and First Name are required.');
      return;
    }

    if (newStudentForm.id.length !== 12) {
      alert('LRN must be exactly 12 digits.');
      return;
    }

    const studentData = {
      ...newStudentForm,
      gradeLevel: selectedSection?.gradeLevel || '',
      sectionId: selectedSection?.id || '',
    };
    await addStudent(studentData);
    setIsAddingStudent(false);
    setNewStudentForm({
      id: '',
      lastName: '',
      firstName: '',
      middleName: '',
      extension: '',
      gender: 'Male',
      address: '',
      gradeLevel: '',
      sectionId: '',
      is4Ps: false,
      nutritionalStatus: 'Normal',
    });
    alert('Student enrolled successfully!');
  };

  const handleBulkEnroll = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      // Remove UTF-8 BOM if present
      const cleanText = text.replace(/^\ufeff/, '');
      const lines = cleanText.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) {
        alert('CSV file is empty or only contains headers.');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, '').replace(/[._]/g, '').replace(/ /g, ''));
      console.log('Detected Enroll Headers:', headers);

      const studentsToBulkAdd = [];
      let rejectedCount = 0;
      let invalidLrnCount = 0;
      let duplicateCount = 0;
      const seenInCsv = new Set();

      for (let i = 1; i < lines.length; i++) {
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
          
          // Map common headers
          let key = header;
          if (['id', 'lrn', 'studentid', 'studentnumber', 'stno', 'learnerreferencenumber'].includes(header)) key = 'id';
          if (['section', 'sectionname', 'sectionid', 'class'].includes(header)) key = 'sectionId';
          if (['grade', 'gradelevel', 'yearlevel', 'level'].includes(header)) key = 'gradeLevel';
          if (['lastname', 'surname', 'familyname'].includes(header)) key = 'lastName';
          if (['firstname', 'givenname'].includes(header)) key = 'firstName';
          
          if (key === 'is4ps' || key === '4ps') {
            studentData['is4Ps'] = value.toLowerCase() === 'yes' || value.toLowerCase() === 'true' || value === '1';
          } else {
            studentData[key] = value;
          }
        });

        const id = studentData.id || '';
        const lastName = studentData.lastName || studentData.lastname || '';
        const firstName = studentData.firstName || studentData.firstname || '';

        if (id && lastName && firstName) {
          // 1. Check for duplicates within the CSV itself
          if (seenInCsv.has(id)) {
            duplicateCount++;
            continue;
          }
          seenInCsv.add(id);

          // 2. Check for duplicates in the existing masterlist
          const exists = students.some(s => s.id === id);
          if (exists) {
            duplicateCount++;
            continue;
          }

          // VERIFICATION: Only allow students that match the selected section/grade
          const csvGrade = studentData.gradeLevel || '';
          const csvSection = studentData.sectionId || '';

          const gradeMatch = !csvGrade || csvGrade.toLowerCase() === selectedSection.gradeLevel.toLowerCase();
          const sectionMatch = !csvSection || 
                              csvSection.toLowerCase() === selectedSection.name.toLowerCase() || 
                              csvSection.toLowerCase() === selectedSection.id.toLowerCase();

          if (!gradeMatch || !sectionMatch) {
            rejectedCount++;
            continue;
          }

          if (id.length !== 12) {
            invalidLrnCount++;
            continue;
          }

          studentsToBulkAdd.push({
            id: id,
            lastName: lastName,
            firstName: firstName,
            middleName: studentData.middleName || studentData.middlename || '',
            extension: studentData.extension || '',
            gender: studentData.gender || 'Male',
            address: studentData.address || '',
            gradeLevel: selectedSection.gradeLevel,
            sectionId: selectedSection.id,
            is4Ps: !!studentData.is4Ps,
            nutritionalStatus: studentData.nutritionalStatus || studentData.nutritionalstatus || 'Normal',
          });
        }
      }

      if (studentsToBulkAdd.length > 0) {
        try {
          await addBulkStudents(studentsToBulkAdd);
          setShowBulkEnroll(false);
          
          let message = `Successfully enrolled ${studentsToBulkAdd.length} new learners to ${selectedSection.name}.`;
          if (duplicateCount > 0) message += `\n\n⚠️ ${duplicateCount} learners were SKIPPED because their LRN is already registered in the system.`;
          if (rejectedCount > 0) message += `\n\n⛔ ${rejectedCount} learners were rejected (Grade/Section mismatch).`;
          if (invalidLrnCount > 0) message += `\n\n❌ ${invalidLrnCount} learners had invalid LRNs.`;
          
          alert(message);
        } catch (err) {
          console.error('Bulk enroll error:', err);
          alert(`Failed to enroll learners: ${err.message}`);
        }
      } else {
        let message = `No new learners found for ${selectedSection.name}.`;
        if (duplicateCount > 0) message += `\n\n⚠️ All learners in your CSV are already registered in the system.`;
        alert(message);
      }
      event.target.value = null;
    };
    reader.readAsText(file);
  };

  const downloadStudentTemplate = () => {
    const headers = ['id', 'lastName', 'firstName', 'middleName', 'extension', 'gender', 'address', 'is4Ps', 'nutritionalStatus'];
    const csvContent = headers.join(',') + '\n' + '123456789012,"Dela Cruz","Juan","Santos","",Male,"Barangay 1, City",no,Normal';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `student_enrollment_template_${selectedSection?.name || 'section'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to remove this student from the section?')) {
      await deleteStudent(studentId);
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
        <div className="header-title-row">
          <div className="title-group">
            {viewMode !== 'overview' && (
              <button className="back-btn-minimal" onClick={() => {
                setViewMode('overview');
                setSectionStatus('active');
              }}>
                ← Back to Overview
              </button>
            )}
            <h1>
              {viewMode === 'overview' ? 'General Enrollment Data' : 
               viewMode === 'JHS' ? 'Junior High School Sections' : 
               'Senior High School Sections'}
            </h1>
          </div>
          {isAdmin && viewMode !== 'overview' && (
            <button className="add-btn-primary" onClick={() => {
              setIsAdding(true);
              setIsEditing(false);
              setSelectedSection(null);
            }}>
              + Add New Section
            </button>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <p className="header-subtitle" style={{ margin: 0 }}>
            {viewMode === 'overview' 
              ? 'A comprehensive summary of the school enrollment status.' 
              : `Manage ${viewMode === 'JHS' ? 'Junior' : 'Senior'} High School sections and learners.`}
          </p>
          {viewMode !== 'overview' && (
            <div className="tab-bar" style={{ gap: '1rem', borderBottom: 'none' }}>
              <button 
                className={`tab-btn ${sectionStatus === 'active' ? 'active' : ''}`}
                onClick={() => setSectionStatus('active')}
              >
                Active Sections
              </button>
              <button 
                className={`tab-btn ${sectionStatus === 'archived' ? 'active' : ''}`}
                onClick={() => setSectionStatus('archived')}
              >
                Archived
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="sections-content">
        {viewMode === 'overview' ? (
          <div className="overview-container">
            <div className="summary-banner">
              <div className="summary-stat">
                <span className="summary-label">Total School Enrollment</span>
                <span className="summary-value">{stats.total}</span>
              </div>
              <div className="summary-details">
                <div className="detail-pill">Junior High: {stats.jhs.students}</div>
                <div className="detail-pill">Senior High: {stats.shs.students}</div>
                <div className="detail-pill">Male: {stats.jhs.male + stats.shs.male}</div>
                <div className="detail-pill">Female: {stats.jhs.female + stats.shs.female}</div>
              </div>
            </div>

            <div className="level-cards-grid">
              <div className="level-card jhs" onClick={() => setViewMode('JHS')}>
                <div className="level-card-icon">🏫</div>
                <div className="level-card-info">
                  <h3>Junior High School</h3>
                  <p className="level-description">Grades 7 to 10</p>
                  <div className="level-stats">
                    <div className="l-stat">
                      <span className="l-val">{stats.jhs.sections}</span>
                      <span className="l-lab">Sections</span>
                    </div>
                    <div className="l-stat">
                      <span className="l-val">{stats.jhs.students}</span>
                      <span className="l-lab">Students</span>
                    </div>
                  </div>
                  <div className="gender-ratio">
                    <div className="ratio-bar">
                      <div 
                        className="ratio-fill male" 
                        style={{ width: `${(stats.jhs.male / (stats.jhs.students || 1)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="ratio-labels">
                      <span>M: {stats.jhs.male}</span>
                      <span>F: {stats.jhs.female}</span>
                    </div>
                  </div>
                </div>
                <div className="level-card-footer">
                  View JHS Sections →
                </div>
              </div>

              <div className="level-card shs" onClick={() => setViewMode('SHS')}>
                <div className="level-card-icon">🎓</div>
                <div className="level-card-info">
                  <h3>Senior High School</h3>
                  <p className="level-description">Grades 11 to 12</p>
                  <div className="level-stats">
                    <div className="l-stat">
                      <span className="l-val">{stats.shs.sections}</span>
                      <span className="l-lab">Sections</span>
                    </div>
                    <div className="l-stat">
                      <span className="l-val">{stats.shs.students}</span>
                      <span className="l-lab">Students</span>
                    </div>
                  </div>
                  <div className="gender-ratio">
                    <div className="ratio-bar">
                      <div 
                        className="ratio-fill male" 
                        style={{ width: `${(stats.shs.male / (stats.shs.students || 1)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="ratio-labels">
                      <span>M: {stats.shs.male}</span>
                      <span>F: {stats.shs.female}</span>
                    </div>
                  </div>
                </div>
                <div className="level-card-footer">
                  View SHS Sections →
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="sections-grid">
            {displayedSections.map((section, index) => {
              const sectionStudents = students.filter(s => s.sectionId === section?.id);
              const maleCount = sectionStudents.filter(s => s.gender === 'Male').length;
              const femaleCount = sectionStudents.filter(s => s.gender === 'Female').length;
              const fourPsCount = sectionStudents.filter(s => s.is4Ps).length;

              return (
                <div 
                  key={section?.id || index} 
                  className={`section-tile ${selectedSection?.id === section?.id ? 'selected' : ''}`}
                  onClick={() => {
                    if (section) {
                      navigate(`/students?sectionId=${section.id}`);
                    }
                  }}
                >
                  <div className="tile-header">
                    <span className={`status-dot ${section?.isActive ? 'active' : 'inactive'}`}></span>
                    <span className="grade-badge">{section?.gradeLevel || 'N/A'}</span>
                  </div>
                  <div className="tile-content">
                    <h3 className="section-name">{section?.name || 'Unnamed Section'}</h3>
                    <div className="section-info">
                      <div className="info-item">
                        <span className="info-label">Adviser:</span>
                        <span className="info-value">{section?.adviserName || 'No Adviser'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Total Students:</span>
                        <span className="info-value">{sectionStudents.length}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Male / Female:</span>
                        <span className="info-value">{maleCount} / {femaleCount}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">4Ps Beneficiaries:</span>
                        <span className="info-value">{fourPsCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="tile-footer">
                    <span className="view-details">View Students →</span>
                    {isAdmin && (
                      <button 
                        className="manage-tile-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSection(section);
                          setEditSectionForm(section);
                          setIsEditing(true);
                          setIsAdding(false);
                          setActiveTab('details');
                        }}
                      >
                        ⚙️ Manage
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {displayedSections.length === 0 && (
              <div className="no-sections">
                <p>No sections found for this level.</p>
              </div>
            )}
          </div>
        )}

        {isAdding && isAdmin && (
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
              <div className="title-with-tabs">
                <h2>{selectedSection.name}</h2>
                <div className="tab-bar">
                  <button 
                    className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
                    onClick={() => setActiveTab('students')}
                  >
                    Learner List
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                    onClick={() => setActiveTab('details')}
                  >
                    Section Info
                  </button>
                </div>
              </div>
              <button className="close-btn" onClick={() => setIsEditing(false)}>×</button>
            </div>
            
            <div className="detail-body">
              {activeTab === 'details' ? (
                <div className="section-info-form">
                  <div className="form-group">
                    <label>Section Name</label>
                    <input 
                      type="text" 
                      name="name" 
                      value={editSectionForm.name} 
                      onChange={handleEditSectionChange} 
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="form-group">
                    <label>Grade Level</label>
                    <select 
                      name="gradeLevel" 
                      value={editSectionForm?.gradeLevel || 'Grade 7'} 
                      onChange={handleEditSectionChange}
                      disabled={!isAdmin}
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
                    <label>Adviser</label>
                    <select 
                      name="adviserId" 
                      value={editSectionForm.adviserId} 
                      onChange={(e) => handleAdviserSelect(e, 'edit')}
                      disabled={!isAdmin}
                    >
                      <option value="">Select an Adviser</option>
                      {availableTeachers.map(teacher => (
                        <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Year Created</label>
                    <input 
                      type="text" 
                      name="yearCreated" 
                      value={editSectionForm.yearCreated} 
                      onChange={handleEditSectionChange} 
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        name="isActive" 
                        checked={editSectionForm.isActive} 
                        onChange={handleEditSectionChange} 
                        disabled={!isAdmin}
                      />
                      Is Active
                    </label>
                  </div>
                  {isAdmin && (
                    <div className="edit-actions">
                      <button className="save-btn" onClick={handleUpdateSection}>Save Changes</button>
                      <button className="delete-btn-outline" onClick={() => handleDeleteSection(selectedSection.id)}>Delete Section</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="section-students-view">
                  <div className="student-actions-row">
                    <h3>Enrolled Learners ({sectionStudents.length})</h3>
                    <div className="action-buttons">
                      <button className="export-btn-outline" onClick={downloadStudentTemplate}>
                        📄 Template
                      </button>
                      <label className="add-btn-primary" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                        ⬆️ Bulk Enroll
                        <input type="file" accept=".csv" onChange={handleBulkEnroll} style={{ display: 'none' }} />
                      </label>
                      <button className="add-btn-primary" onClick={() => setIsAddingStudent(!isAddingStudent)}>
                        {isAddingStudent ? 'Cancel' : '+ Add Learner'}
                      </button>
                    </div>
                  </div>

                  {isAddingStudent && (
                    <div className="inline-add-student">
                      <div className="inline-form-row">
                        <input 
                          type="text" 
                          placeholder="LRN" 
                          name="id" 
                          value={newStudentForm.id} 
                          onChange={handleNewStudentChange} 
                          maxLength={12}
                        />
                        <input 
                          type="text" 
                          placeholder="Last Name" 
                          name="lastName" 
                          value={newStudentForm.lastName} 
                          onChange={handleNewStudentChange} 
                        />
                        <input 
                          type="text" 
                          placeholder="First Name" 
                          name="firstName" 
                          value={newStudentForm.firstName} 
                          onChange={handleNewStudentChange} 
                        />
                      </div>
                      <div className="inline-form-row">
                        <input 
                          type="text" 
                          placeholder="Middle Name" 
                          name="middleName" 
                          value={newStudentForm.middleName} 
                          onChange={handleNewStudentChange} 
                        />
                        <select name="gender" value={newStudentForm.gender} onChange={handleNewStudentChange}>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                        <button className="save-btn" onClick={handleAddStudentToSection}>Enroll</button>
                      </div>
                    </div>
                  )}

                  <div className="mini-student-table">
                    <table>
                      <thead>
                        <tr>
                          <th>LRN</th>
                          <th>Last Name</th>
                          <th>First Name</th>
                          <th>Gender</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionStudents.length > 0 ? (
                          [...sectionStudents]
                            .sort((a, b) => {
                              if (a.gender !== b.gender) return a.gender === 'Male' ? -1 : 1;
                              return (a.lastName || '').localeCompare(b.lastName || '');
                            })
                            .map(student => (
                              <tr key={student.id}>
                                <td>{student.id}</td>
                                <td style={{ fontWeight: 600 }}>{student.lastName}</td>
                                <td>{student.firstName}</td>
                                <td>{student.gender}</td>
                                <td>
                                  <button className="text-delete-btn" onClick={() => handleDeleteStudent(student.id)}>Remove</button>
                                </td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
                              No students enrolled in this section yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SectionsPage;
