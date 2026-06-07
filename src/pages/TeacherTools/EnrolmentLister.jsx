import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import EnrolmentSummaryWidget from '../../components/EnrolmentSummaryWidget';
import { useSections } from '../../context/SectionContext';
import { useStudents } from '../../context/StudentContext';
import './EnrolmentLister.css';

const EnrolmentLister = () => {
  const { user } = useAuth();
  const { sections } = useSections();
  const { students: enrolledStudents, addStudent, deleteStudent } = useStudents();
  
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);
  const isCoordinator = user?.isEnrolmentCoordinator;
  const adviserSections = sections.filter(s => s.adviserId === user?.uid);
  const isAdviser = adviserSections.length > 0;
  const hasAccess = isAdmin || isCoordinator || isAdviser;

  const [students, setStudents] = useState([]);
  const [filterGrade, setFilterGrade] = useState('All');
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    lrn: '',
    lastName: '',
    firstName: '',
    middleName: '',
    extName: '',
    gender: '',
    gradeLevel: '',
    prevSchool: '',
    genAverage: '',
    isOldStudent: false,
    form9: false,
    birthCert: false,
    is4Ps: false
  });

  useEffect(() => {
    if (!hasAccess) return;

    const colRef = collection(db, 'enrolment_students');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const studentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(studentsList);
    });

    return () => unsubscribe();
  }, [hasAccess]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'lrn') {
      const sanitized = value.replace(/\D/g, '').slice(0, 12);
      setFormData(prev => ({
        ...prev,
        [name]: sanitized
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetForm = () => {
    setFormData({
      lrn: '',
      lastName: '',
      firstName: '',
      middleName: '',
      extName: '',
      gender: '',
      gradeLevel: '',
      prevSchool: '',
      genAverage: '',
      isOldStudent: false,
      form9: false,
      birthCert: false,
      is4Ps: false
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate LRN length if provided
    if (formData.lrn && formData.lrn.length !== 12) {
      alert("LRN (Learner Reference Number) must be exactly 12 digits!");
      return;
    }
    
    // Force unified letter case (Upper Case) for names
    const upperLastName = formData.lastName.trim().toUpperCase();
    const upperFirstName = formData.firstName.trim().toUpperCase();
    const upperMiddleName = formData.middleName ? formData.middleName.trim().toUpperCase() : '';
    const upperExtName = formData.extName ? formData.extName.trim().toUpperCase() : '';

    // Check for duplicates (case insensitive match)
    const isDuplicate = students.some(s => 
      s.id !== editingId && // Skip the current student if editing
      ((formData.lrn && s.lrn === formData.lrn) || 
      ((s.firstName || '').trim().toUpperCase() === upperFirstName && 
       (s.lastName || '').trim().toUpperCase() === upperLastName &&
       (s.extName || '').trim().toUpperCase() === upperExtName))
    );

    if (isDuplicate) {
      alert("A student with this LRN or Name already exists in the enrolment list!");
      return;
    }

    const newStudentData = {
      ...formData,
      lastName: upperLastName,
      firstName: upperFirstName,
      middleName: upperMiddleName,
      extName: upperExtName
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'enrolment_students', editingId), newStudentData);
      } else {
        const newId = Date.now().toString();
        await setDoc(doc(db, 'enrolment_students', newId), {
          ...newStudentData,
          id: newId,
          dateAdded: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error saving document: ", error);
      alert("Failed to save enrollee. Please check your permissions.");
      return;
    }
    
    resetForm();
  };

  const handleEdit = (student) => {
    setEditingId(student.id);
    setFormData({
      lrn: student.lrn || '',
      lastName: student.lastName || '',
      firstName: student.firstName || '',
      middleName: student.middleName || '',
      extName: student.extName || '',
      gender: student.gender || '',
      gradeLevel: student.gradeLevel || '',
      prevSchool: student.prevSchool || '',
      genAverage: student.genAverage || '',
      isOldStudent: !!student.isOldStudent,
      form9: !!student.form9,
      birthCert: !!student.birthCert,
      is4Ps: !!student.is4Ps
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this enrollee?')) {
      try {
        await deleteDoc(doc(db, 'enrolment_students', id));
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Failed to delete enrollee.");
      }
    }
  };

  const handleAssignSection = async (student, sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    if (window.confirm(`Enroll ${student.firstName} ${student.lastName} to section ${section.name}?`)) {
      try {
        const studentData = {
          id: student.lrn,
          lastName: student.lastName,
          firstName: student.firstName,
          middleName: student.middleName || '',
          extension: student.extName || '',
          gender: student.gender,
          is4Ps: !!student.is4Ps,
          gradeLevel: section.gradeLevel,
          sectionId: section.id,
          nutritionalStatus: 'Normal',
          address: '',
        };
        await addStudent(studentData);
        alert('Student successfully enrolled to section!');
      } catch (error) {
        console.error('Error assigning section:', error);
        alert('Failed to assign section.');
      }
    }
  };

  const handleUnassignSection = async (student) => {
    if (window.confirm(`Remove ${student.firstName} ${student.lastName} from their section?`)) {
      try {
        await deleteStudent(student.lrn);
        alert('Student removed from section.');
      } catch (error) {
        console.error('Error removing section:', error);
        alert('Failed to remove from section.');
      }
    }
  };

  const handleExport = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      
      // Group students by grade level
      const groupedByGradeForExport = students.reduce((acc, student) => {
        const grade = student.gradeLevel || 'Unspecified Grade';
        if (!acc[grade]) acc[grade] = [];
        acc[grade].push(student);
        return acc;
      }, {});

      const sortedExportGrades = Object.keys(groupedByGradeForExport).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
      });

      if (sortedExportGrades.length === 0) {
        workbook.addWorksheet('Enrolment List');
      }

      sortedExportGrades.forEach(grade => {
        // Create a separate worksheet for each grade level
        const worksheet = workbook.addWorksheet(grade);
        
        // Styling the header row
        worksheet.columns = [
          { header: 'LRN', key: 'lrn', width: 15 },
          { header: 'Last Name', key: 'lastName', width: 20 },
          { header: 'First Name', key: 'firstName', width: 20 },
          { header: 'Middle Name', key: 'middleName', width: 20 },
          { header: 'Ext Name', key: 'extName', width: 10 },
          { header: 'Gender', key: 'gender', width: 10 },
          { header: 'Grade Level', key: 'gradeLevel', width: 15 },
          { header: 'Previous School', key: 'prevSchool', width: 25 },
          { header: 'Gen Average', key: 'genAverage', width: 15 },
          { header: 'Returning', key: 'isOldStudent', width: 12 },
          { header: '4Ps Beneficiary', key: 'is4Ps', width: 15 },
          { header: 'SF9 Submitted', key: 'form9', width: 15 },
          { header: 'Birth Cert', key: 'birthCert', width: 15 }
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

        const gradeStudents = groupedByGradeForExport[grade].sort((a, b) => {
          return (a.lastName || "").localeCompare(b.lastName || "");
        });

        gradeStudents.forEach(s => {
          worksheet.addRow({
            ...s,
            isOldStudent: s.isOldStudent ? 'Yes' : 'No',
            is4Ps: s.is4Ps ? 'Yes' : 'No',
            form9: s.form9 ? 'Yes' : 'No',
            birthCert: s.birthCert ? 'Yes' : 'No'
          });
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Enrolment_Masterlist_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed: ", error);
      alert("Failed to export masterlist.");
    }
  };

  if (!hasAccess) {
    return (
      <div className="enrolment-container" style={{ textAlign: 'center', marginTop: '10vh' }}>
        <h1 style={{ color: 'var(--danger, #ef4444)', fontSize: '2rem', marginBottom: '1rem' }}>Access Denied</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          You do not have permission to access the Enrolment Lister. 
          <br/>
          Please contact the administrator to be designated as an Enrolment Coordinator.
        </p>
      </div>
    );
  }

  // Filter students
  const filteredStudents = students.filter(s => filterGrade === 'All' || s.gradeLevel === filterGrade);

  // Group by Grade Level
  const groupedByGrade = filteredStudents.reduce((acc, student) => {
    const grade = student.gradeLevel || 'Unspecified Grade';
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(student);
    return acc;
  }, {});

  // Sort grades (e.g. Grade 7, Grade 8...)
  const sortedGrades = Object.keys(groupedByGrade).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  const renderStudentTable = (studentList) => {
    const sorted = [...studentList].sort((a, b) => {
      const cmp = (a.lastName || "").localeCompare(b.lastName || "");
      return cmp !== 0 ? cmp : (a.firstName || "").localeCompare(b.firstName || "");
    });

    if (sorted.length === 0) {
      return <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>No enrollees in this category.</p>;
    }

    return (
      <table className="students-table" style={{ marginBottom: '1.5rem' }}>
        <thead>
          <tr>
            <th>LRN</th>
            <th>Name</th>
            <th>Section</th>
            <th>Prev. School</th>
            <th>Avg</th>
            <th>Old</th>
            <th>4Ps</th>
            <th>SF9</th>
            <th>Birth Cert.</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(student => {
            const enrolledInfo = enrolledStudents.find(es => es.id === student.lrn);
            const assignedSection = enrolledInfo ? sections.find(sec => sec.id === enrolledInfo.sectionId) : null;
            const gradeSections = sections.filter(sec => sec.isActive && sec.gradeLevel === student.gradeLevel);
            const allowedSections = (isAdmin || isCoordinator) 
              ? gradeSections 
              : adviserSections.filter(sec => sec.isActive && sec.gradeLevel === student.gradeLevel);
            const canManageSection = isAdmin || isCoordinator || (assignedSection && assignedSection.adviserId === user?.uid);

            return (
              <tr key={student.id}>
                <td>{student.lrn}</td>
                <td style={{ fontWeight: 500 }}>{student.lastName}, {student.firstName} {student.extName ? student.extName + ' ' : ''}{student.middleName}</td>
                <td>
                  {assignedSection ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span className="status-badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 600 }}>
                        {assignedSection.name}
                      </span>
                      {canManageSection && (
                        <button 
                          onClick={() => handleUnassignSection(student)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '2px 4px'
                          }}
                          title="Remove from Section"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ) : allowedSections.length > 0 ? (
                    <select
                      className="section-picker-select"
                      onChange={(e) => handleAssignSection(student, e.target.value)}
                      defaultValue=""
                      style={{
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.8rem',
                        backgroundColor: 'white',
                        color: 'var(--text-color)',
                        maxWidth: '120px'
                      }}
                    >
                      <option value="" disabled>Select Section</option>
                      {allowedSections.map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Unassigned
                    </span>
                  )}
                </td>
                <td>{student.prevSchool || '-'}</td>
                <td>{student.genAverage || '-'}</td>
                <td><span className={`status-badge ${student.isOldStudent ? 'status-yes' : 'status-no'}`}>{student.isOldStudent ? 'Yes' : 'No'}</span></td>
                <td><span className={`status-badge ${student.is4Ps ? 'status-yes' : 'status-no'}`}>{student.is4Ps ? 'Yes' : 'No'}</span></td>
                <td><span className={`status-badge ${student.form9 ? 'status-yes' : 'status-no'}`}>{student.form9 ? 'Submitted' : 'Pending'}</span></td>
                <td><span className={`status-badge ${student.birthCert ? 'status-yes' : 'status-no'}`}>{student.birthCert ? 'Submitted' : 'Pending'}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button className="btn-edit" onClick={() => handleEdit(student)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, padding: 0 }}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(student.id)} style={{ padding: 0 }}>Delete</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="enrolment-container">
      <header className="enrolment-header">
        <h1>Enrolment Management</h1>
        <p>Pre-enrolment data entry and masterlist overview.</p>
      </header>

      <div style={{ marginBottom: '2rem' }}>
        <EnrolmentSummaryWidget />
      </div>

      <main className="enrolment-main">
        <section className="form-section">
          <h2>{editingId ? "Edit Student" : "Add Student"}</h2>
          <form id="enrolment-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="input-group">
                <label htmlFor="lrn">LRN (Learner Reference Number)</label>
                <input 
                  type="text" 
                  id="lrn" 
                  name="lrn" 
                  value={formData.lrn} 
                  onChange={handleInputChange} 
                  maxLength={12} 
                  pattern="[0-9]{12}"
                  placeholder="12-digit number"
                />
              </div>
              
              <div className="form-grid-2col">
                <div className="input-group">
                  <label htmlFor="firstName">First Name</label>
                  <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} required />
                </div>
                <div className="input-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="form-grid-2col">
                <div className="input-group">
                  <label htmlFor="middleName">Middle Name</label>
                  <input type="text" id="middleName" name="middleName" value={formData.middleName} onChange={handleInputChange} />
                </div>
                <div className="input-group">
                  <label htmlFor="extName">Ext. Name (e.g. Jr.)</label>
                  <input type="text" id="extName" name="extName" value={formData.extName} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-grid-2col">
                <div className="input-group">
                  <label htmlFor="gender">Gender</label>
                  <select id="gender" name="gender" value={formData.gender} onChange={handleInputChange} required>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="gradeLevel">Grade Level</label>
                  <select id="gradeLevel" name="gradeLevel" value={formData.gradeLevel} onChange={handleInputChange} required>
                    <option value="">Select Grade</option>
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2col">
                <div className="input-group">
                  <label htmlFor="prevSchool">Previous School</label>
                  <input type="text" id="prevSchool" name="prevSchool" value={formData.prevSchool} onChange={handleInputChange} />
                </div>
                <div className="input-group">
                  <label htmlFor="genAverage">Gen Average</label>
                  <input type="number" step="0.01" id="genAverage" name="genAverage" value={formData.genAverage} onChange={handleInputChange} placeholder="e.g. 88.5" />
                </div>
              </div>
            </div>

            <div className="checkbox-section-horizontal">
              <div className="checkbox-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Status & Programs</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="checkbox-item">
                    <input type="checkbox" id="isOldStudent" name="isOldStudent" checked={formData.isOldStudent} onChange={handleInputChange} />
                    <label htmlFor="isOldStudent">Returning Enrollee</label>
                  </div>
                  <div className="checkbox-item">
                    <input type="checkbox" id="is4Ps" name="is4Ps" checked={formData.is4Ps} onChange={handleInputChange} />
                    <label htmlFor="is4Ps">4Ps Beneficiary</label>
                  </div>
                </div>
              </div>

              <div className="checkbox-group" style={{ marginBottom: '0' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Requirements</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="checkbox-item">
                    <input type="checkbox" id="form9" name="form9" checked={formData.form9} onChange={handleInputChange} />
                    <label htmlFor="form9">School Form 9 (SF9)</label>
                  </div>
                  <div className="checkbox-item">
                    <input type="checkbox" id="birthCert" name="birthCert" checked={formData.birthCert} onChange={handleInputChange} />
                    <label htmlFor="birthCert">Birth Certificate</label>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-primary">{editingId ? "Update Enrollee" : "Add Enrollee"}</button>
              {editingId && (
                <button type="button" onClick={resetForm} style={{ width: '100%', padding: '0.55rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
              )}
            </div>
          </form>
        </section>

        <section className="list-section">
          <div className="list-header">
            <div className="list-header-top">
              <h2>Enrolled Students</h2>
              <button 
                type="button" 
                onClick={handleExport} 
                className="btn-primary" 
                style={{ width: 'auto', backgroundColor: '#10b981', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                disabled={students.length === 0}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Export Masterlist
              </button>
            </div>
            <div className="grade-tabs">
              {['All', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(grade => (
                <button
                  key={grade}
                  type="button"
                  className={`grade-tab ${filterGrade === grade ? 'active' : ''}`}
                  onClick={() => setFilterGrade(grade)}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          <div className="categorized-container">
            {sortedGrades.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                No students found
              </div>
            ) : (
              sortedGrades.map(grade => {
                const gradeStudents = groupedByGrade[grade];
                const males = gradeStudents.filter(s => s.gender === 'Male');
                const females = gradeStudents.filter(s => s.gender === 'Female');
                
                return (
                  <div key={grade} className="grade-category" style={{ marginBottom: '2.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                      {grade} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({gradeStudents.length} Total)</span>
                    </h3>
                    
                    <div className="gender-group">
                      <h4 style={{ color: '#2563eb', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Male Enrollees <span className="status-badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>{males.length}</span>
                      </h4>
                      <div className="table-container">
                        {renderStudentTable(males)}
                      </div>
                    </div>

                    <div className="gender-group">
                      <h4 style={{ color: '#db2777', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Female Enrollees <span className="status-badge" style={{ backgroundColor: '#fdf2f8', color: '#be185d' }}>{females.length}</span>
                      </h4>
                      <div className="table-container">
                        {renderStudentTable(females)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default EnrolmentLister;
