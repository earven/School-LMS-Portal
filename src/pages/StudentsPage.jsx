import React, { useState, useMemo, useEffect } from 'react';
import { useStudents } from '../context/StudentContext';
import { useAuth } from '../context/AuthContext.jsx';
import { useSections } from '../context/SectionContext';
import { useSettings } from '../context/SettingsContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { printSF1Register, exportSF1ToCSV } from '../utils/sf1Generator';

import StudentIdCardModal from '../components/StudentIdCardModal';
import BatchPromotionModal from '../components/BatchPromotionModal';
import StudentFilterBar from './StudentsComponents/StudentFilterBar';
import StudentDataTable from './StudentsComponents/StudentDataTable';
import StudentProfileDrawer from './StudentsComponents/StudentProfileDrawer';
import StudentAddModal from './StudentsComponents/StudentAddModal';
import StudentBatchActions from './StudentsComponents/StudentBatchActions';
import StudentSummaryBar from './StudentsComponents/StudentSummaryBar';
import StudentSectionTabs from './StudentsComponents/StudentSectionTabs';
import { useStudentFilters } from '../hooks/useStudentFilters';

import './StudentsPage.css';

const StudentsPage = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const isAdmin = ['admin', 'system_admin'].includes(user?.role);
  const { 
    students, 
    loading, 
    updateStudent, 
    addStudent, 
    addBulkStudents, 
    deleteStudent,
    bulkUpdateSection,
    bulkUpdateStatus,
    bulkDeleteStudents,
    addAnecdotalNote,
    deleteAnecdotalNote
  } = useStudents();
  const { sections } = useSections();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const assignedSections = useMemo(() => {
    if (isAdmin) return sections;
    return sections.filter(section => 
      section.adviserId === user?.uid || 
      (user?.assignedSections && user.assignedSections.includes(section.id))
    );
  }, [sections, user, isAdmin]);

  const defaultSectionId = useMemo(() => {
    const fromUrl = searchParams.get('sectionId');
    if (fromUrl) return fromUrl;
    if (!isAdmin && assignedSections.length > 0) {
      return assignedSections[0].id;
    }
    return 'All';
  }, [searchParams, isAdmin, assignedSections]);

  // Filters State encapsulated via useStudentFilters hook
  const {
    searchTerm,
    setSearchTerm,
    filterGrade,
    setFilterGrade,
    filterSection,
    setFilterSection,
    filterStatus,
    setFilterStatus,
    filteredStudents,
    clearFilters,
    hasActiveFilters
  } = useStudentFilters({
    students,
    isAdmin,
    assignedSections,
    initialSection: defaultSectionId,
    initialSearch: searchParams.get('search') || '',
    initialGrade: 'All',
    initialStatus: 'All'
  });
  
  // Selection & Modals State
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [idCardTargetStudents, setIdCardTargetStudents] = useState([]);
  const [showBatchPromoModal, setShowBatchPromoModal] = useState(false);
  const [promoTargetStudents, setPromoTargetStudents] = useState([]);
  const [promoInitialSectionId, setPromoInitialSectionId] = useState(null);

  // Profile Drawer State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  // Enrolment Masterlist state
  const [enrolmentStudents, setEnrolmentStudents] = useState([]);

  useEffect(() => {
    const sectionId = searchParams.get('sectionId');
    if (sectionId) {
      setFilterSection(sectionId);
    } else if (!isAdmin && assignedSections.length > 0) {
      setFilterSection(prev => (prev === 'All' ? assignedSections[0].id : prev));
    }
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
    }
    const studentIdParam = searchParams.get('studentId');
    if (studentIdParam && students.length > 0) {
      const matched = students.find(s => s.id === studentIdParam);
      if (matched) {
        setSelectedStudent(matched);
      }
    }
    const openPromoParam = searchParams.get('openPromo');
    if (openPromoParam === 'true') {
      if (sectionId) {
        setPromoInitialSectionId(sectionId);
      }
      setShowBatchPromoModal(true);
    }
  }, [searchParams, students, setFilterSection, setSearchTerm, isAdmin, assignedSections]);

  const currentActiveSection = useMemo(() => {
    if (filterSection === 'All' || filterSection === 'unassigned') return null;
    return sections.find(s => s.id === filterSection) || null;
  }, [filterSection, sections]);

  const handleManageSection = (sectionId) => {
    const sec = sections.find(s => s.id === sectionId);
    const getGradeNum = (str) => (str || '').toString().replace(/\D/g, '');
    const gNum = getGradeNum(sec?.gradeLevel);
    const view = ['11', '12'].includes(gNum) ? 'SHS' : 'JHS';
    navigate(`/teacher-tools/sections?view=${view}&sectionId=${sectionId}`);
  };

  const activeSectionName = useMemo(() => {
    if (filterSection === 'All') return 'All Sections';
    if (filterSection === 'unassigned') return 'Unassigned';
    const sec = sections.find(s => s.id === filterSection);
    return sec ? `${sec.name} (${sec.gradeLevel})` : filterSection;
  }, [filterSection, sections]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'enrolment_students'), (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          ...d,
          lrn: d.lrn || doc.id
        };
      });
      setEnrolmentStudents(data);
    });
    return () => unsub();
  }, []);

  const handleRowClick = (student) => {
    setSelectedStudent(student);
  };

  const handleToggleSelectStudent = (id, e) => {
    e.stopPropagation();
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = (e) => {
    if (e.target.checked) {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  // Open Batch ID Card Modal
  const handleOpenIdCards = (studentList = null) => {
    const listToPrint = studentList || (selectedStudentIds.length > 0 
      ? students.filter(s => selectedStudentIds.includes(s.id))
      : filteredStudents);

    if (listToPrint.length === 0) {
      alert('No learners available to generate ID badges.');
      return;
    }

    setIdCardTargetStudents(listToPrint);
    setShowIdCardModal(true);
  };

  // Open Batch Promotion Modal
  const handleOpenBatchPromotion = (studentList = null) => {
    let targetSectionId = (filterSection && filterSection !== 'All') ? filterSection : null;
    if (studentList && studentList.length > 0 && studentList[0].sectionId) {
      targetSectionId = studentList[0].sectionId;
    } else if (selectedStudentIds.length > 0) {
      const firstSelected = students.find(s => selectedStudentIds.includes(s.id));
      if (firstSelected?.sectionId) {
        targetSectionId = firstSelected.sectionId;
      }
    }
    setPromoInitialSectionId(targetSectionId);
    setShowBatchPromoModal(true);
  };

  // Export DepEd SF1 (School Register)
  const handlePrintSF1 = () => {
    const activeSection = sections.find(s => s.id === filterSection);
    printSF1Register(filteredStudents, settings, activeSection || { name: 'Masterlist', gradeLevel: filterGrade });
  };

  const handleExportSF1CSV = () => {
    const activeSection = sections.find(s => s.id === filterSection);
    exportSF1ToCSV(filteredStudents, settings, activeSection || { name: 'Masterlist', gradeLevel: filterGrade });
  };

  // Student Profile Updates
  const handleUpdateStudent = async (updatedData) => {
    await updateStudent(updatedData);
    setSelectedStudent(updatedData);
  };

  const handleDeleteStudent = async (id) => {
    await deleteStudent(id);
    setSelectedStudent(null);
  };

  const handleAddAnecdotalNote = async (studentId, noteData) => {
    const res = await addAnecdotalNote(studentId, noteData);
    if (res?.success && selectedStudent?.id === studentId) {
      const updatedNotes = [res.note, ...(selectedStudent.anecdotalNotes || [])];
      setSelectedStudent(prev => ({ ...prev, anecdotalNotes: updatedNotes }));
    }
    return res;
  };

  const handleDeleteAnecdotalNote = async (studentId, noteId) => {
    await deleteAnecdotalNote(studentId, noteId);
    if (selectedStudent?.id === studentId) {
      const updatedNotes = (selectedStudent.anecdotalNotes || []).filter(n => n.id !== noteId);
      setSelectedStudent(prev => ({ ...prev, anecdotalNotes: updatedNotes }));
    }
  };

  // Bulk Handlers
  const handleBulkReassign = async (targetSectionId, targetSection) => {
    await bulkUpdateSection(selectedStudentIds, targetSectionId, targetSection.gradeLevel);
    setSelectedStudentIds([]);
  };

  const handleBulkStatusUpdate = async (status) => {
    await bulkUpdateStatus(selectedStudentIds, status);
    setSelectedStudentIds([]);
  };

  const handleBulkDelete = async () => {
    await bulkDeleteStudents(selectedStudentIds);
    setSelectedStudentIds([]);
  };

  return (
    <div className="students-container">
      {/* Top Header & Actions */}
      <div className="students-header">
        <div>
          <h1>Learner Management & Masterlist</h1>
          <p className="subtitle">
            Manage official learner records, DepEd SF1 registers, student ID badges, and EOSY promotions.
          </p>
        </div>

        <div className="students-header-actions">
          <button 
            type="button" 
            className="btn-header-action btn-sf1-print"
            onClick={handlePrintSF1}
            title="Print Official DepEd School Form 1 (School Register)"
          >
            📋 Print SF1 Register
          </button>

          <button 
            type="button" 
            className="btn-header-action btn-sf1-csv"
            onClick={handleExportSF1CSV}
            title="Export SF1 to CSV / Excel"
          >
            📥 SF1 (CSV)
          </button>

          <button 
            type="button" 
            className="btn-header-action btn-id-badges"
            onClick={() => handleOpenIdCards()}
            title="Generate and print official student ID cards with QR code"
          >
            🪪 Print ID Cards
          </button>

          {isAdmin && (
            <button 
              type="button" 
              className="btn-header-action btn-batch-promo"
              onClick={() => handleOpenBatchPromotion()}
              title="Batch promote or rollover learners to the next academic year"
            >
              🎓 EOSY Promotion
            </button>
          )}

          {(isAdmin || assignedSections.length > 0) && (
            <button 
              type="button"
              className="primary-btn" 
              onClick={() => setIsAdding(true)}
            >
              + Add Learner
            </button>
          )}
        </div>
      </div>

      {/* Summary Statistics Ribbon */}
      <StudentSummaryBar 
        students={filteredStudents} 
        activeSectionName={activeSectionName} 
        activeSection={currentActiveSection}
        onManageSection={handleManageSection}
      />

      {/* Section Navigation Tabs */}
      <StudentSectionTabs
        assignedSections={assignedSections}
        allStudents={students}
        filterSection={filterSection}
        onSectionChange={setFilterSection}
        isAdmin={isAdmin}
        filterGrade={filterGrade}
      />

      {/* Filter & Search Bar */}
      <StudentFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterGrade={filterGrade}
        onGradeChange={setFilterGrade}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Main Table Area & Profile Drawer */}
      <div className="main-content-layout">
        <StudentDataTable
          loading={loading}
          filteredStudents={filteredStudents}
          selectedStudent={selectedStudent}
          selectedStudentIds={selectedStudentIds}
          sections={sections}
          filterSection={filterSection}
          onSelectAll={handleSelectAllFiltered}
          onToggleSelect={handleToggleSelectStudent}
          onRowClick={handleRowClick}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />

        {/* Learner 360° Profile Inspector Drawer */}
        {selectedStudent && (
          <StudentProfileDrawer
            selectedStudent={selectedStudent}
            onClose={() => setSelectedStudent(null)}
            sections={sections}
            assignedSections={assignedSections}
            isAdmin={isAdmin}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onAddAnecdotalNote={handleAddAnecdotalNote}
            onDeleteAnecdotalNote={handleDeleteAnecdotalNote}
            onOpenIdCards={handleOpenIdCards}
          />
        )}

        {/* Add New Learner Modal / Drawer */}
        <StudentAddModal
          isOpen={isAdding}
          onClose={() => setIsAdding(false)}
          sections={sections}
          assignedSections={assignedSections}
          students={students}
          enrolmentStudents={enrolmentStudents}
          onAddStudent={addStudent}
          onAddBulkStudents={addBulkStudents}
        />
      </div>

      {/* Floating Bulk Actions Toolbar and Modals */}
      <StudentBatchActions
        selectedStudentIds={selectedStudentIds}
        sections={sections}
        isAdmin={isAdmin}
        onOpenIdCards={() => handleOpenIdCards()}
        onOpenBatchPromotion={() => handleOpenBatchPromotion()}
        onBulkReassign={handleBulkReassign}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onBulkDelete={handleBulkDelete}
        onClearSelection={() => setSelectedStudentIds([])}
      />

      {/* Global Student ID Card Modal */}
      {showIdCardModal && (
        <StudentIdCardModal
          students={idCardTargetStudents}
          sections={sections}
          settings={settings}
          onClose={() => setShowIdCardModal(false)}
        />
      )}

      {/* Global Batch Promotion Modal */}
      {showBatchPromoModal && (
        <BatchPromotionModal
          initialSectionId={promoInitialSectionId || (filterSection !== 'All' ? filterSection : null)}
          onClose={() => {
            setShowBatchPromoModal(false);
            setPromoInitialSectionId(null);
          }}
        />
      )}
    </div>
  );
};

export default StudentsPage;
