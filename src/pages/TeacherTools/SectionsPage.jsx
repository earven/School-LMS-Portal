import React, { useState, useEffect, useMemo } from 'react';
import { useSections } from "../../context/SectionContext";
import { usePersonnel } from '../../context/PersonnelContext';
import { useStudents } from '../../context/StudentContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import EnrolmentSummaryWidget from '../../components/EnrolmentSummaryWidget';
import BeefFormModal from '../../components/BeefFormModal';
import { printQuickCountReport, exportQuickCountToCSV } from '../../utils/beefGenerator';

import SectionsOverviewMatrix from './SectionsComponents/SectionsOverviewMatrix';
import SectionsCardsGrid from './SectionsComponents/SectionsCardsGrid';
import SectionAddDrawer from './SectionsComponents/SectionAddDrawer';
import SectionDetailDrawer from './SectionsComponents/SectionDetailDrawer';

import './SectionsPage.css';

const SectionsPage = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { sections, loading, error, addSection, updateSection, deleteSection } = useSections();
  const { personnel } = usePersonnel();
  const { students, addStudent, addBulkStudents, deleteStudent } = useStudents();
  const [searchParams] = useSearchParams();
  
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'overview'); // 'overview', 'JHS', 'SHS'
  const [sectionStatus, setSectionStatus] = useState('active'); // 'active', 'archived'

  // Section Filters
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('All');
  const [selectedStrandFilter, setSelectedStrandFilter] = useState('All');

  useEffect(() => {
    const view = searchParams.get('view');
    if (view && ['overview', 'JHS', 'SHS'].includes(view)) {
      setViewMode(view);
    }
    const secId = searchParams.get('sectionId');
    if (secId && sections.length > 0) {
      const target = sections.find(s => s.id === secId);
      if (target) {
        setSelectedSection(target);
        const getGradeNum = (str) => (str || '').toString().replace(/\D/g, '');
        const gNum = getGradeNum(target.gradeLevel);
        if (['11', '12'].includes(gNum)) {
          setViewMode('SHS');
        } else if (['7', '8', '9', '10'].includes(gNum)) {
          setViewMode('JHS');
        }
      }
    }
  }, [searchParams, sections]);

  const [isAdding, setIsAdding] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [drawerInitialTab, setDrawerInitialTab] = useState('details');

  // BEEF Modal
  const [beefStudent, setBeefStudent] = useState(null);

  // Incoming Enrollees state from enrolment_students
  const [enrolmentQueue, setEnrolmentQueue] = useState([]);
  const [isIntakeProcessing, setIsIntakeProcessing] = useState(false);

  const availableTeachers = personnel.filter(p => p.role === 'teacher' || p.position);
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);

  // Fetch live enrolment queue
  useEffect(() => {
    const colRef = collection(db, 'enrolment_students');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        lrn: d.data().lrn || d.id
      }));
      setEnrolmentQueue(list);
    });
    return () => unsubscribe();
  }, []);

  // Filtered Sections
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
      filtered = filtered.filter(s => jhsNums.includes(getGradeNum(s.gradeLevel)));
    } else if (viewMode === 'SHS') {
      const shsNums = ['11', '12'];
      filtered = filtered.filter(s => shsNums.includes(getGradeNum(s.gradeLevel)));
    }

    if (selectedGradeFilter !== 'All') {
      filtered = filtered.filter(s => s.gradeLevel === selectedGradeFilter);
    }

    if (viewMode === 'SHS' && selectedStrandFilter !== 'All') {
      const strandQ = selectedStrandFilter.toUpperCase();
      filtered = filtered.filter(s => {
        const sStrand = (s.trackStrand || '').toUpperCase();
        return sStrand.includes(strandQ);
      });
    }

    if (sectionSearchQuery.trim()) {
      const q = sectionSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(s => 
        (s.name || '').toLowerCase().includes(q) ||
        (s.adviserName || '').toLowerCase().includes(q) ||
        (s.room || '').toLowerCase().includes(q) ||
        (s.trackStrand || '').toLowerCase().includes(q) ||
        (s.gradeLevel || '').toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [sections, isAdmin, user, viewMode, sectionStatus, selectedGradeFilter, selectedStrandFilter, sectionSearchQuery]);

  // Section stats for navigation counters
  const stats = useMemo(() => {
    const getGradeNum = (str) => (str || '').toString().replace(/\D/g, '');
    const jhsNums = ['7', '8', '9', '10'];
    const shsNums = ['11', '12'];

    const activeSections = sections.filter(s => s.isActive);
    const jhsSections = activeSections.filter(s => jhsNums.includes(getGradeNum(s.gradeLevel)));
    const shsSections = activeSections.filter(s => shsNums.includes(getGradeNum(s.gradeLevel)));

    return {
      jhs: { sections: jhsSections.length },
      shs: { sections: shsSections.length }
    };
  }, [sections]);

  const sectionStudents = useMemo(() => {
    if (!selectedSection) return [];
    return students.filter(s => s.sectionId === selectedSection.id);
  }, [students, selectedSection]);

  const sectionIntakeQueue = useMemo(() => {
    if (!selectedSection) return [];
    const secGrade = (selectedSection.gradeLevel || '').toLowerCase();
    return enrolmentQueue.filter(e => {
      const enrGrade = (e.gradeLevel || '').toLowerCase();
      const notSectionedYet = !e.sectionId || e.sectionId === selectedSection.id;
      return enrGrade === secGrade && notSectionedYet;
    });
  }, [enrolmentQueue, selectedSection]);

  const handleAddSection = async (formData) => {
    await addSection(formData);
    alert('Section added successfully!');
  };

  const handleUpdateSection = async (formData) => {
    await updateSection(formData);
    setSelectedSection(formData);
  };

  const handleDeleteSection = async (id) => {
    if (window.confirm('Are you sure you want to delete this section? This action cannot be undone.')) {
      await deleteSection(id);
      setSelectedSection(null);
      alert('Section deleted successfully!');
    }
  };

  const handleAddStudentToSection = async (studentData) => {
    await addStudent(studentData);
  };

  const handleBulkEnrollStudents = async (studentsPayload) => {
    await addBulkStudents(studentsPayload);
  };

  const handleDeleteStudent = async (id) => {
    if (window.confirm("Are you sure you want to remove this learner from the section?")) {
      await deleteStudent(id);
    }
  };

  const handleAssignIntakeToSection = async (enrollee) => {
    if (!selectedSection) return;
    setIsIntakeProcessing(true);
    try {
      const studentData = {
        id: enrollee.lrn || enrollee.id,
        lrn: enrollee.lrn || enrollee.id,
        lastName: enrollee.lastName,
        firstName: enrollee.firstName,
        middleName: enrollee.middleName || '',
        extension: enrollee.extName || '',
        gender: enrollee.gender || 'Male',
        birthdate: enrollee.birthdate || '',
        psaBirthCertNo: enrollee.psaBirthCertNo || '',
        motherTongue: enrollee.motherTongue || 'Filipino',
        religion: enrollee.religion || 'Christianity',
        address: enrollee.address || '',
        gradeLevel: selectedSection.gradeLevel,
        sectionId: selectedSection.id,
        fatherName: enrollee.fatherName || '',
        motherMaidenName: enrollee.motherMaidenName || '',
        guardianName: enrollee.guardianName || '',
        guardianRelationship: enrollee.guardianRelationship || '',
        contactNumber: enrollee.contactNumber || '',
        is4Ps: !!enrollee.is4Ps,
        nutritionalStatus: 'Normal',
        status: 'Active'
      };

      await addStudent(studentData);

      await updateDoc(doc(db, 'enrolment_students', enrollee.id), {
        status: 'Enrolled & Sectioned',
        sectionId: selectedSection.id,
        sectionName: selectedSection.name
      });

      alert(`Successfully enrolled ${enrollee.firstName} ${enrollee.lastName} into ${selectedSection.name}!`);
    } catch (err) {
      alert(`Sectioning failed: ${err.message}`);
    } finally {
      setIsIntakeProcessing(false);
    }
  };

  const handleBulkAssignIntake = async (targetIds) => {
    if (!selectedSection || !targetIds || targetIds.length === 0) return;
    setIsIntakeProcessing(true);
    try {
      const selectedEnrollees = enrolmentQueue.filter(e => targetIds.includes(e.id));
      
      const studentsPayload = selectedEnrollees.map(e => ({
        id: e.lrn || e.id,
        lrn: e.lrn || e.id,
        lastName: e.lastName,
        firstName: e.firstName,
        middleName: e.middleName || '',
        extension: e.extName || '',
        gender: e.gender || 'Male',
        birthdate: e.birthdate || '',
        psaBirthCertNo: e.psaBirthCertNo || '',
        motherTongue: e.motherTongue || 'Filipino',
        religion: e.religion || 'Christianity',
        address: e.address || '',
        gradeLevel: selectedSection.gradeLevel,
        sectionId: selectedSection.id,
        fatherName: e.fatherName || '',
        motherMaidenName: e.motherMaidenName || '',
        guardianName: e.guardianName || '',
        guardianRelationship: e.guardianRelationship || '',
        contactNumber: e.contactNumber || '',
        is4Ps: !!e.is4Ps,
        nutritionalStatus: 'Normal',
        status: 'Active'
      }));

      await addBulkStudents(studentsPayload);

      const batch = writeBatch(db);
      for (const id of targetIds) {
        const ref = doc(db, 'enrolment_students', id);
        batch.update(ref, {
          status: 'Enrolled & Sectioned',
          sectionId: selectedSection.id,
          sectionName: selectedSection.name
        });
      }
      await batch.commit();

      alert(`Batch enrolled ${selectedEnrollees.length} learners into ${selectedSection.name}!`);
    } catch (err) {
      alert(`Bulk enrollment failed: ${err.message}`);
    } finally {
      setIsIntakeProcessing(false);
    }
  };

  const handleInspectFromOverview = (sec, isShs, tab = 'details') => {
    setViewMode(isShs ? 'SHS' : 'JHS');
    setSelectedSection(sec);
    setDrawerInitialTab(tab);
  };

  const handleClearFilters = () => {
    setSectionSearchQuery('');
    setSelectedGradeFilter('All');
    setSelectedStrandFilter('All');
  };

  const availableGradesForView = viewMode === 'JHS' 
    ? ['All', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10']
    : (viewMode === 'SHS' ? ['All', 'Grade 11', 'Grade 12'] : []);

  return (
    <div className="sections-container">
      {/* Top Header */}
      <div className="sections-header">
        <div>
          <h1>Section & Class Roster Management</h1>
          <p className="subtitle">Manage classroom rosters, adviser assignments, room capacity, and live enrollment queues.</p>
        </div>
        <div className="header-actions">
          <button 
            type="button" 
            className="action-btn-qc btn-qc-print"
            onClick={() => printQuickCountReport(enrolmentQueue.length > 0 ? enrolmentQueue : students, settings)}
            title="Print Official DepEd Enrolment Quick Count Matrix"
          >
            📊 Quick Count Matrix
          </button>

          <button 
            type="button" 
            className="action-btn-qc btn-qc-csv"
            onClick={() => exportQuickCountToCSV(enrolmentQueue.length > 0 ? enrolmentQueue : students, settings)}
            title="Export Quick Count Matrix to CSV"
          >
            📥 Quick Count (CSV)
          </button>

          {isAdmin && (
            <button className="primary-btn" onClick={() => setIsAdding(true)}>
              + Create Section
            </button>
          )}
        </div>
      </div>

      {/* View Navigation Bar */}
      <div className="view-navigation-bar card">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${viewMode === 'overview' ? 'active' : ''}`}
            onClick={() => { setViewMode('overview'); setSelectedGradeFilter('All'); setSelectedStrandFilter('All'); }}
          >
            📊 Overview
          </button>
          <button 
            className={`nav-tab ${viewMode === 'JHS' ? 'active' : ''}`}
            onClick={() => { setViewMode('JHS'); setSelectedGradeFilter('All'); setSelectedStrandFilter('All'); }}
          >
            📘 Junior High <span className="tab-counter">{stats.jhs.sections}</span>
          </button>
          <button 
            className={`nav-tab ${viewMode === 'SHS' ? 'active' : ''}`}
            onClick={() => { setViewMode('SHS'); setSelectedGradeFilter('All'); setSelectedStrandFilter('All'); }}
          >
            🎓 Senior High <span className="tab-counter">{stats.shs.sections}</span>
          </button>
        </div>

        <div className="status-toggle">
          <button 
            className={`toggle-btn ${sectionStatus === 'active' ? 'active' : ''}`}
            onClick={() => setSectionStatus('active')}
          >
            Active ({sections.filter(s => s.isActive).length})
          </button>
          <button 
            className={`toggle-btn ${sectionStatus === 'archived' ? 'active' : ''}`}
            onClick={() => setSectionStatus('archived')}
          >
            Archived ({sections.filter(s => !s.isActive).length})
          </button>
        </div>
      </div>

      {/* Interactive Filter Suite for JHS / SHS */}
      {viewMode !== 'overview' && (
        <div className="sections-filter-bar card">
          <div className="sec-filter-top-row">
            <div className="sec-search-box">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search sections by name, adviser, room, strand..."
                value={sectionSearchQuery}
                onChange={(e) => setSectionSearchQuery(e.target.value)}
              />
              {sectionSearchQuery && (
                <button className="clear-btn" onClick={() => setSectionSearchQuery('')}>×</button>
              )}
            </div>

            <div className="sec-grade-pills">
              {availableGradesForView.map(g => (
                <button
                  key={g}
                  type="button"
                  className={`sec-pill ${selectedGradeFilter === g ? 'active' : ''}`}
                  onClick={() => setSelectedGradeFilter(g)}
                >
                  {g === 'All' ? 'All Grades' : g}
                </button>
              ))}
            </div>
          </div>

          {/* Senior High Strand Filters */}
          {viewMode === 'SHS' && (
            <div className="sec-strand-pills">
              <span className="strand-filter-label">Academic / TVL Strand:</span>
              {['All', 'STEM', 'ABM', 'HUMSS', 'GAS', 'TVL'].map(st => (
                <button
                  key={st}
                  type="button"
                  className={`sec-pill strand-pill ${selectedStrandFilter === st ? 'active' : ''}`}
                  onClick={() => setSelectedStrandFilter(st)}
                >
                  {st === 'All' ? 'All Strands' : st}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overview Analytics Widget */}
      {viewMode === 'overview' && (
        <div className="sections-overview-widget">
          <EnrolmentSummaryWidget />
        </div>
      )}

      {/* Content Area */}
      <div className="sections-content">
        {viewMode === 'overview' ? (
          <SectionsOverviewMatrix
            sections={sections}
            students={students}
            loading={loading}
            onInspectSection={handleInspectFromOverview}
          />
        ) : (
          <SectionsCardsGrid
            displayedSections={displayedSections}
            students={students}
            loading={loading}
            selectedSection={selectedSection}
            sectionSearchQuery={sectionSearchQuery}
            selectedGradeFilter={selectedGradeFilter}
            selectedStrandFilter={selectedStrandFilter}
            viewMode={viewMode}
            onClearFilters={handleClearFilters}
            onSelectSection={(sec, tab = 'details') => {
              setSelectedSection(sec);
              setDrawerInitialTab(tab);
            }}
          />
        )}

        {/* Add Section Drawer */}
        <SectionAddDrawer
          isOpen={isAdding && isAdmin}
          onClose={() => setIsAdding(false)}
          availableTeachers={availableTeachers}
          onAddSection={handleAddSection}
        />

        {/* Section Detail & Roster Drawer */}
        <SectionDetailDrawer
          isOpen={!!selectedSection}
          onClose={() => setSelectedSection(null)}
          section={selectedSection}
          initialTab={drawerInitialTab}
          sectionStudents={sectionStudents}
          sectionIntakeQueue={sectionIntakeQueue}
          isAdmin={isAdmin}
          settings={settings}
          availableTeachers={availableTeachers}
          onUpdateSection={handleUpdateSection}
          onDeleteSection={handleDeleteSection}
          onAddStudent={handleAddStudentToSection}
          onBulkEnrollStudents={handleBulkEnrollStudents}
          onDeleteStudent={handleDeleteStudent}
          onAssignIntake={handleAssignIntakeToSection}
          onBulkAssignIntake={handleBulkAssignIntake}
          onTriggerBeef={(student) => setBeefStudent(student)}
        />
      </div>

      {/* DepEd BEEF Form Print Modal */}
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

export default SectionsPage;
