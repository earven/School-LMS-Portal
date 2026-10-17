import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import EnrolmentSummaryWidget from '../../components/EnrolmentSummaryWidget';
import BeefFormModal from '../../components/BeefFormModal';
import { useSections } from '../../context/SectionContext';
import { useStudents } from '../../context/StudentContext';
import { printQuickCountReport, exportQuickCountToCSV } from '../../utils/beefGenerator';
import { buildFullName } from '../../utils/personnelName';
import './EnrolmentLister.css';

const STATUS_TABS = [
  { id: 'All', label: 'All Applicants' },
  { id: 'Pending Review', label: '⏳ Pending Review' },
  { id: 'Verified', label: '✅ Verified' },
  { id: 'Enrolled & Sectioned', label: '🏫 Enrolled' },
  { id: 'Incomplete Requirements', label: '⚠️ Incomplete Docs' }
];

const GRADE_PILLS = [
  'All',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12'
];

const EnrolmentLister = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { sections } = useSections();
  const { students: enrolledStudents, addBulkStudents } = useStudents();
  
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);
  const isCoordinator = user?.isEnrolmentCoordinator;
  const adviserSections = sections.filter(s => s.adviserId === user?.uid);
  const isAdviser = adviserSections.length > 0;
  const hasAccess = isAdmin || isCoordinator || isAdviser;

  const [students, setStudents] = useState([]);
  const [filterGrade, setFilterGrade] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Quick Filter Chips
  const [filter4PsOnly, setFilter4PsOnly] = useState(false);
  const [filterMissingDocs, setFilterMissingDocs] = useState(false);
  const [filterTransfereesOnly, setFilterTransfereesOnly] = useState(false);

  // Modal & Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // BEEF Printable Modal State
  const [beefStudent, setBeefStudent] = useState(null);

  // Bulk Actions State
  const [selectedEnrolleeIds, setSelectedEnrolleeIds] = useState([]);
  const [showBulkSectionModal, setShowBulkSectionModal] = useState(false);
  const [bulkTargetSectionId, setBulkTargetSectionId] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    lrn: '',
    lastName: '',
    firstName: '',
    middleName: '',
    extName: '',
    gender: 'Male',
    birthdate: '',
    psaBirthCertNo: '',
    motherTongue: 'Filipino',
    ipEthnicGroup: 'N/A',
    religion: 'Christianity',
    address: '',
    gradeLevel: 'Grade 7',
    trackStrand: '',
    learnerType: 'New Entrant',
    preferredModality: 'Face-to-Face',
    specialNeeds: 'None',
    prevSchool: '',
    genAverage: '',
    fatherName: '',
    motherMaidenName: '',
    guardianName: '',
    guardianRelationship: '',
    contactNumber: '',
    isOldStudent: false,
    form9: false,
    birthCert: false,
    goodMoral: false,
    photos: false,
    is4Ps: false,
    status: 'Pending Review'
  });

  useEffect(() => {
    if (!hasAccess) return;

    const colRef = collection(db, 'enrolment_students');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const studentsList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        lrn: d.data().lrn || d.id
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
      gender: 'Male',
      birthdate: '',
      psaBirthCertNo: '',
      motherTongue: 'Filipino',
      ipEthnicGroup: 'N/A',
      religion: 'Christianity',
      address: '',
      gradeLevel: 'Grade 7',
      trackStrand: '',
      learnerType: 'New Entrant',
      preferredModality: 'Face-to-Face',
      specialNeeds: 'None',
      prevSchool: '',
      genAverage: '',
      fatherName: '',
      motherMaidenName: '',
      guardianName: '',
      guardianRelationship: '',
      contactNumber: '',
      isOldStudent: false,
      form9: false,
      birthCert: false,
      goodMoral: false,
      photos: false,
      is4Ps: false,
      status: 'Pending Review'
    });
    setEditingId(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (student) => {
    setFormData({
      lrn: student.lrn || student.id || '',
      lastName: student.lastName || '',
      firstName: student.firstName || '',
      middleName: student.middleName || '',
      extName: student.extName || student.extension || '',
      gender: student.gender || 'Male',
      birthdate: student.birthdate || '',
      psaBirthCertNo: student.psaBirthCertNo || '',
      motherTongue: student.motherTongue || 'Filipino',
      ipEthnicGroup: student.ipEthnicGroup || 'N/A',
      religion: student.religion || 'Christianity',
      address: student.address || '',
      gradeLevel: student.gradeLevel || 'Grade 7',
      trackStrand: student.trackStrand || '',
      learnerType: student.learnerType || (student.isOldStudent ? 'Continuing' : 'New Entrant'),
      preferredModality: student.preferredModality || 'Face-to-Face',
      specialNeeds: student.specialNeeds || 'None',
      prevSchool: student.prevSchool || '',
      genAverage: student.genAverage || '',
      fatherName: student.fatherName || '',
      motherMaidenName: student.motherMaidenName || '',
      guardianName: student.guardianName || '',
      guardianRelationship: student.guardianRelationship || '',
      contactNumber: student.contactNumber || student.phone || '',
      isOldStudent: !!student.isOldStudent,
      form9: !!student.form9,
      birthCert: !!student.birthCert,
      goodMoral: !!student.goodMoral,
      photos: !!student.photos,
      is4Ps: !!student.is4Ps,
      status: student.status || 'Pending Review'
    });
    setEditingId(student.id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.lrn && formData.lrn.length !== 12) {
      alert("LRN (Learner Reference Number) must be exactly 12 digits!");
      return;
    }
    
    const upperLastName = formData.lastName.trim().toUpperCase();
    const upperFirstName = formData.firstName.trim().toUpperCase();
    const upperMiddleName = formData.middleName ? formData.middleName.trim().toUpperCase() : '';
    const upperExtName = formData.extName ? formData.extName.trim().toUpperCase() : '';

    // Check duplicate
    const isDuplicate = students.some(s => 
      s.id !== editingId &&
      ((formData.lrn && s.lrn === formData.lrn) || 
      ((s.firstName || '').trim().toUpperCase() === upperFirstName && 
       (s.lastName || '').trim().toUpperCase() === upperLastName &&
       (s.extName || '').trim().toUpperCase() === upperExtName))
    );

    if (isDuplicate) {
      alert("A student with this LRN or Name already exists in the enrolment list!");
      return;
    }

    try {
      const payload = {
        ...formData,
        lastName: upperLastName,
        firstName: upperFirstName,
        middleName: upperMiddleName,
        extName: upperExtName,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'enrolment_students', editingId), payload);
        alert('Enrollee record updated successfully!');
      } else {
        const docId = formData.lrn || `ENR-${Date.now()}`;
        await setDoc(doc(db, 'enrolment_students', docId), {
          ...payload,
          id: docId,
          createdAt: new Date().toISOString()
        });
        alert('New applicant successfully registered!');
      }

      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error saving enrolment student:', err);
      alert('Failed to save enrollee record.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this applicant from the enrolment records?")) {
      try {
        await deleteDoc(doc(db, 'enrolment_students', id));
      } catch (err) {
        console.error('Error deleting student:', err);
        alert('Failed to delete applicant.');
      }
    }
  };

  // Status Counts for Tab Badges
  const statusCounts = useMemo(() => {
    const counts = {
      All: students.length,
      'Pending Review': 0,
      'Verified': 0,
      'Enrolled & Sectioned': 0,
      'Incomplete Requirements': 0
    };

    for (const s of students) {
      const st = s.status || 'Pending Review';
      if (counts[st] !== undefined) {
        counts[st]++;
      }
      if (!s.birthCert || !s.form9) {
        counts['Incomplete Requirements']++;
      }
    }
    return counts;
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesGrade = filterGrade === 'All' || s.gradeLevel === filterGrade;
      
      let matchesStatus = true;
      if (filterStatus === 'Incomplete Requirements') {
        matchesStatus = !s.birthCert || !s.form9;
      } else if (filterStatus !== 'All') {
        matchesStatus = (s.status || 'Pending Review') === filterStatus;
      }

      const matches4Ps = !filter4PsOnly || !!s.is4Ps;
      const matchesMissingDocs = !filterMissingDocs || (!s.birthCert || !s.form9);
      const matchesTransferee = !filterTransfereesOnly || (s.learnerType || '').toLowerCase().includes('transferee') || !!s.prevSchool;
      
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (s.lastName || '').toLowerCase().includes(q) ||
        (s.firstName || '').toLowerCase().includes(q) ||
        (s.middleName || '').toLowerCase().includes(q) ||
        (s.lrn || '').includes(q) ||
        (s.prevSchool || '').toLowerCase().includes(q) ||
        (s.trackStrand || '').toLowerCase().includes(q);

      return matchesGrade && matchesStatus && matches4Ps && matchesMissingDocs && matchesTransferee && matchesSearch;
    });
  }, [students, filterGrade, filterStatus, filter4PsOnly, filterMissingDocs, filterTransfereesOnly, searchQuery]);

  // Toggle Selection
  const handleToggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedEnrolleeIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedEnrolleeIds(filteredStudents.map(s => s.id));
    } else {
      setSelectedEnrolleeIds([]);
    }
  };

  // Bulk Verification
  const handleBulkVerify = async () => {
    if (selectedEnrolleeIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      const batch = writeBatch(db);
      for (const id of selectedEnrolleeIds) {
        const ref = doc(db, 'enrolment_students', id);
        batch.update(ref, { status: 'Verified' });
      }
      await batch.commit();
      alert(`Marked ${selectedEnrolleeIds.length} applicants as Verified!`);
      setSelectedEnrolleeIds([]);
    } catch (err) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk Section & Push to Student Masterlist
  const handleBulkSectionSubmit = async () => {
    if (!bulkTargetSectionId) {
      alert('Please select a target classroom section.');
      return;
    }

    const targetSec = sections.find(s => s.id === bulkTargetSectionId);
    if (!targetSec) {
      alert('Target section not found.');
      return;
    }

    setIsBulkProcessing(true);
    try {
      const selectedRecords = students.filter(s => selectedEnrolleeIds.includes(s.id));
      
      const formattedForMasterlist = selectedRecords.map(s => ({
        id: s.lrn || s.id,
        lrn: s.lrn || s.id,
        lastName: s.lastName,
        firstName: s.firstName,
        middleName: s.middleName,
        extension: s.extName,
        gender: s.gender || 'Male',
        birthdate: s.birthdate || '',
        psaBirthCertNo: s.psaBirthCertNo || '',
        motherTongue: s.motherTongue || 'Filipino',
        ipEthnicGroup: s.ipEthnicGroup || 'N/A',
        religion: s.religion || 'Christianity',
        address: s.address || '',
        gradeLevel: targetSec.gradeLevel,
        sectionId: targetSec.id,
        fatherName: s.fatherName || '',
        motherMaidenName: s.motherMaidenName || '',
        guardianName: s.guardianName || '',
        guardianRelationship: s.guardianRelationship || '',
        contactNumber: s.contactNumber || '',
        is4Ps: !!s.is4Ps,
        nutritionalStatus: 'Normal',
        status: 'Active'
      }));

      // Push to masterlist
      await addBulkStudents(formattedForMasterlist);

      // Update status in enrolment_students
      const batch = writeBatch(db);
      for (const id of selectedEnrolleeIds) {
        const ref = doc(db, 'enrolment_students', id);
        batch.update(ref, { 
          status: 'Enrolled & Sectioned',
          sectionId: targetSec.id,
          sectionName: targetSec.name
        });
      }
      await batch.commit();

      alert(`Successfully enrolled & sectioned ${selectedRecords.length} learners into ${targetSec.name}!`);
      setShowBulkSectionModal(false);
      setSelectedEnrolleeIds([]);
    } catch (err) {
      alert(`Enrollment failed: ${err.message}`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedEnrolleeIds.length} applicants?`)) {
      setIsBulkProcessing(true);
      try {
        const batch = writeBatch(db);
        for (const id of selectedEnrolleeIds) {
          const ref = doc(db, 'enrolment_students', id);
          batch.delete(ref);
        }
        await batch.commit();
        alert(`Deleted ${selectedEnrolleeIds.length} applicant records.`);
        setSelectedEnrolleeIds([]);
      } catch (err) {
        alert(`Delete failed: ${err.message}`);
      } finally {
        setIsBulkProcessing(false);
      }
    }
  };

  const resetAllFilters = () => {
    setFilterGrade('All');
    setFilterStatus('All');
    setFilter4PsOnly(false);
    setFilterMissingDocs(false);
    setFilterTransfereesOnly(false);
    setSearchQuery('');
  };

  const hasActiveFilters = filterGrade !== 'All' || filterStatus !== 'All' || filter4PsOnly || filterMissingDocs || filterTransfereesOnly || searchQuery !== '';

  if (!hasAccess) {
    return (
      <div className="enrolment-lister-container">
        <div className="access-denied card">
          <h2>Access Restricted</h2>
          <p>You must be an Enrolment Coordinator, Class Adviser, or Administrator to access the Enrolment Lister.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enrolment-lister-container">
      {/* Top Header */}
      <div className="enrolment-header">
        <div>
          <h1>General Enrolment Data & Lister</h1>
          <p className="subtitle">Track incoming applicant records, DepEd BEEF compliance, and class section assignments.</p>
        </div>

        <div className="enrolment-header-actions">
          <button 
            type="button" 
            className="btn-header-action btn-qc-print"
            onClick={() => printQuickCountReport(students, settings)}
            title="Print Official DepEd Enrolment Quick Count Matrix"
          >
            📊 Print Quick Count
          </button>

          <button 
            type="button" 
            className="btn-header-action btn-qc-csv"
            onClick={() => exportQuickCountToCSV(students, settings)}
            title="Export Quick Count Summary to CSV"
          >
            📥 Quick Count (CSV)
          </button>

          <button 
            type="button" 
            className="primary-btn"
            onClick={handleOpenAddModal}
          >
            + Enroll New Applicant
          </button>
        </div>
      </div>

      {/* Analytics Dashboard Widget */}
      <EnrolmentSummaryWidget />

      {/* ENHANCED INTERACTIVE FILTER SUITE */}
      <div className="enrolment-filter-suite card">
        {/* Status Tabs with Live Badges */}
        <div className="status-segmented-control">
          {STATUS_TABS.map(tab => {
            const count = statusCounts[tab.id] || 0;
            const isActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`status-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setFilterStatus(tab.id)}
              >
                <span>{tab.label}</span>
                <span className={`status-pill-count ${isActive ? 'count-active' : ''}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Secondary Filter Row: Search, Grade Pills, Quick Chips */}
        <div className="filter-controls-row">
          {/* Search Box */}
          <div className="search-box-polished">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name, LRN, school, track..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-btn" onClick={() => setSearchQuery('')}>×</button>
            )}
          </div>

          {/* Grade Level Pills */}
          <div className="grade-pills-bar">
            <span className="pills-label">Grade:</span>
            {GRADE_PILLS.map(grade => {
              const isActive = filterGrade === grade;
              return (
                <button
                  key={grade}
                  type="button"
                  className={`grade-filter-pill ${isActive ? 'active' : ''}`}
                  onClick={() => setFilterGrade(grade)}
                >
                  {grade === 'All' ? 'All Grades' : grade.replace('Grade ', 'G')}
                </button>
              );
            })}
          </div>

          {/* Quick Filter Toggle Chips */}
          <div className="quick-chips-group">
            <button
              type="button"
              className={`chip-toggle ${filter4PsOnly ? 'active' : ''}`}
              onClick={() => setFilter4PsOnly(!filter4PsOnly)}
            >
              🤝 4Ps Only
            </button>

            <button
              type="button"
              className={`chip-toggle ${filterMissingDocs ? 'active' : ''}`}
              onClick={() => setFilterMissingDocs(!filterMissingDocs)}
            >
              ⚠️ Missing Docs
            </button>

            <button
              type="button"
              className={`chip-toggle ${filterTransfereesOnly ? 'active' : ''}`}
              onClick={() => setFilterTransfereesOnly(!filterTransfereesOnly)}
            >
              🚚 Transferees
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                className="chip-reset-btn"
                onClick={resetAllFilters}
                title="Clear all active filters"
              >
                Reset Filters ↺
              </button>
            )}
          </div>
        </div>

        {/* Filter Summary Bar */}
        <div className="filter-results-summary">
          <span>Showing <strong>{filteredStudents.length}</strong> of <strong>{students.length}</strong> total applicants</span>
          {selectedEnrolleeIds.length > 0 && (
            <span className="selection-active-text">({selectedEnrolleeIds.length} selected for batch actions)</span>
          )}
        </div>
      </div>

      {/* Enrollees Table */}
      <div className="table-wrapper card">
        <table className="enrolment-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input 
                  type="checkbox"
                  checked={filteredStudents.length > 0 && selectedEnrolleeIds.length === filteredStudents.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Applicant Name</th>
              <th>LRN</th>
              <th>Gender</th>
              <th>Grade Level</th>
              <th>Track / Strand</th>
              <th>Modality</th>
              <th>Requirements</th>
              <th>Intake Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="10" className="empty-state-polished">
                  <div className="empty-state-content">
                    <span className="empty-icon">🔍</span>
                    <h4>No Enrolment Records Found</h4>
                    <p>No applicants match the selected filters or search keywords.</p>
                    {hasActiveFilters && (
                      <button className="primary-btn btn-sm" onClick={resetAllFilters}>
                        Clear Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredStudents.map((s) => {
                const isSelected = selectedEnrolleeIds.includes(s.id);
                const fullName = buildFullName({
                  lastName: s.lastName,
                  firstName: s.firstName,
                  middleName: s.middleName,
                  nameExtension: s.extName || s.extension
                });
                const status = s.status || 'Pending Review';

                return (
                  <tr 
                    key={s.id} 
                    className={`table-row ${isSelected ? 'selected-row' : ''}`}
                  >
                    <td onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleToggleSelect(s.id, e)}
                      />
                    </td>
                    <td>
                      <div className="applicant-name-cell">
                        <strong>{fullName}</strong>
                        {s.is4Ps && <span className="badge-4ps">4Ps</span>}
                      </div>
                    </td>
                    <td className="lrn-cell">{s.lrn || '—'}</td>
                    <td>
                      <span className={`gender-tag tag-${(s.gender || 'male').toLowerCase()}`}>
                        {s.gender || 'Male'}
                      </span>
                    </td>
                    <td>
                      <span className="grade-pill-badge">{s.gradeLevel}</span>
                    </td>
                    <td>{s.trackStrand || '—'}</td>
                    <td>
                      <span className="modality-tag">{s.preferredModality || 'Face-to-Face'}</span>
                    </td>
                    <td>
                      <div className="docs-check-icons">
                        <span title="PSA Birth Certificate" className={s.birthCert ? 'doc-ok' : 'doc-missing'}>PSA</span>
                        <span title="SF9 Report Card" className={s.form9 ? 'doc-ok' : 'doc-missing'}>SF9</span>
                        <span title="Good Moral" className={s.goodMoral ? 'doc-ok' : 'doc-missing'}>GM</span>
                      </div>
                    </td>
                    <td>
                      <span className={`enr-status-badge status-${status.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                        {status}
                      </span>
                    </td>
                    <td>
                      <div className="table-row-actions">
                        <button 
                          type="button" 
                          className="btn-tbl-action"
                          onClick={() => setBeefStudent(s)}
                          title="Print DepEd BEEF Form"
                        >
                          📄 BEEF
                        </button>
                        <button 
                          type="button" 
                          className="btn-tbl-action"
                          onClick={() => handleOpenEditModal(s)}
                          title="Edit Record"
                        >
                          ✏️
                        </button>
                        <button 
                          type="button" 
                          className="btn-tbl-action btn-del"
                          onClick={() => handleDelete(s.id)}
                          title="Delete Record"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FLOATING BULK ACTIONS TOOLBAR */}
      {selectedEnrolleeIds.length > 0 && (
        <div className="bulk-actions-toolbar">
          <div className="bulk-toolbar-info">
            <span className="bulk-count-badge">{selectedEnrolleeIds.length}</span>
            <span>applicants selected</span>
          </div>

          <div className="bulk-toolbar-actions">
            <button 
              type="button" 
              className="bulk-btn btn-bulk-verify"
              onClick={handleBulkVerify}
              disabled={isBulkProcessing}
            >
              ✅ Mark Verified
            </button>

            <button 
              type="button" 
              className="bulk-btn btn-bulk-section"
              onClick={() => setShowBulkSectionModal(true)}
            >
              🏫 Section & Enroll
            </button>

            <button 
              type="button" 
              className="bulk-btn btn-bulk-delete"
              onClick={handleBulkDelete}
              disabled={isBulkProcessing}
            >
              🗑️ Delete Selected
            </button>

            <button 
              type="button" 
              className="bulk-btn btn-bulk-clear"
              onClick={() => setSelectedEnrolleeIds([])}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* BULK SECTIONING MODAL */}
      {showBulkSectionModal && (
        <div className="modal-overlay" onClick={() => setShowBulkSectionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Section & Enroll {selectedEnrolleeIds.length} Applicants</h2>
              <button className="close-btn" onClick={() => setShowBulkSectionModal(false)}>&times;</button>
            </div>
            <div style={{ padding: '1rem 0' }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#64748b' }}>
                This will officially enroll the selected applicants into the classroom section and promote their records into the active Students Masterlist.
              </p>
              <div className="form-group">
                <label>Select Target Classroom Section *</label>
                <select 
                  value={bulkTargetSectionId} 
                  onChange={e => setBulkTargetSectionId(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem' }}
                >
                  <option value="">-- Choose Target Section --</option>
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.name} ({sec.gradeLevel})</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="secondary-btn" onClick={() => setShowBulkSectionModal(false)}>Cancel</button>
              <button 
                className="primary-btn" 
                onClick={handleBulkSectionSubmit} 
                disabled={isBulkProcessing || !bulkTargetSectionId}
              >
                {isBulkProcessing ? 'Enrolling...' : 'Confirm Enrollment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT ENROLLEE MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Enrollee Application' : 'Register New Enrollee (DepEd BEEF)'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="enrolment-form">
              <div className="form-section-title">A. Learner Demographic Information</div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>12-Digit LRN</label>
                  <input
                    type="text"
                    name="lrn"
                    maxLength="12"
                    value={formData.lrn}
                    onChange={handleInputChange}
                    placeholder="12-digit number"
                  />
                </div>
                <div className="form-group">
                  <label>PSA Birth Certificate No.</label>
                  <input
                    type="text"
                    name="psaBirthCertNo"
                    value={formData.psaBirthCertNo}
                    onChange={handleInputChange}
                    placeholder="e.g. 12345-67890"
                  />
                </div>
                <div className="form-group">
                  <label>Gender *</label>
                  <select name="gender" required value={formData.gender} onChange={handleInputChange}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Last Name *</label>
                  <input type="text" name="lastName" required value={formData.lastName} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>First Name *</label>
                  <input type="text" name="firstName" required value={formData.firstName} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Middle Name</label>
                  <input type="text" name="middleName" value={formData.middleName} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Extension (Jr., III)</label>
                  <input type="text" name="extName" value={formData.extName} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Birthdate</label>
                  <input type="date" name="birthdate" value={formData.birthdate} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Mother Tongue</label>
                  <input type="text" name="motherTongue" value={formData.motherTongue} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-group">
                <label>Complete Residential Address</label>
                <textarea name="address" rows="2" value={formData.address} onChange={handleInputChange} />
              </div>

              <div className="form-section-title">B. Enrollment & Academic Details</div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Grade Level to Enroll *</label>
                  <select name="gradeLevel" required value={formData.gradeLevel} onChange={handleInputChange}>
                    <option value="Grade 7">Grade 7</option>
                    <option value="Grade 8">Grade 8</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Learner Classification (DO 009, s. 2026)</label>
                  <select name="learnerType" value={formData.learnerType} onChange={handleInputChange}>
                    <option value="New Entrant">New Entrant (Grade 7)</option>
                    <option value="Continuing">Continuing / Old Student</option>
                    <option value="Transferee">Transferee</option>
                    <option value="Balik-Aral">Balik-Aral / Returnee</option>
                    <option value="Repeater">Repeater</option>
                    <option value="Late Enrollee">Late Enrollee (Admitted before Term 1 ST2 / ≥80% Days)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Preferred Modality</label>
                  <select name="preferredModality" value={formData.preferredModality} onChange={handleInputChange}>
                    <option value="Face-to-Face">Face-to-Face</option>
                    <option value="Blended Learning">Blended Learning</option>
                    <option value="Modular (Print)">Modular (Print)</option>
                    <option value="Modular (Digital)">Modular (Digital)</option>
                  </select>
                </div>
              </div>

              {(formData.gradeLevel === 'Grade 11' || formData.gradeLevel === 'Grade 12') && (
                <div className="form-group">
                  <label>Senior High Track & Strand</label>
                  <input
                    type="text"
                    name="trackStrand"
                    value={formData.trackStrand}
                    onChange={handleInputChange}
                    placeholder="e.g. Academic - STEM / ABM / HUMSS / TVL-ICT"
                  />
                </div>
              )}

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Previous School Attended</label>
                  <input type="text" name="prevSchool" value={formData.prevSchool} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>General Average</label>
                  <input type="number" step="0.1" name="genAverage" value={formData.genAverage} onChange={handleInputChange} placeholder="e.g. 88.5" />
                </div>
              </div>

              <div className="form-section-title">C. Parent / Guardian Contacts</div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label>Father's Name</label>
                  <input type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Mother's Maiden Name</label>
                  <input type="text" name="motherMaidenName" value={formData.motherMaidenName} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Emergency Contact Phone</label>
                  <input type="text" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} placeholder="09XX-XXX-XXXX" />
                </div>
              </div>

              <div className="form-section-title">D. Document Checklist & Status</div>

              <div className="docs-checkboxes-grid">
                <label className="checkbox-item">
                  <input type="checkbox" name="birthCert" checked={formData.birthCert} onChange={handleInputChange} />
                  <span>PSA Birth Certificate</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" name="form9" checked={formData.form9} onChange={handleInputChange} />
                  <span>SF9 / Form 138 Card</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" name="goodMoral" checked={formData.goodMoral} onChange={handleInputChange} />
                  <span>Good Moral Certificate</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" name="photos" checked={formData.photos} onChange={handleInputChange} />
                  <span>2x2 ID Photos</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" name="is4Ps" checked={formData.is4Ps} onChange={handleInputChange} />
                  <span>4Ps Household Card</span>
                </label>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Intake Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange}>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Verified">Verified / Qualified</option>
                  <option value="Enrolled & Sectioned">Enrolled & Sectioned</option>
                  <option value="Incomplete Requirements">Incomplete Requirements</option>
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn">{editingId ? 'Save Changes' : 'Register Applicant'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BEEF PRINT MODAL */}
      {beefStudent && (
        <BeefFormModal
          student={beefStudent}
          settings={settings}
          onClose={() => setBeefStudent(null)}
        />
      )}
    </div>
  );
};

export default EnrolmentLister;
