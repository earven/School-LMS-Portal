import { useState, useMemo } from 'react';

/**
 * Custom hook to encapsulate search, grade filtering, section filtering,
 * role authorization filtering, and learner sorting.
 * 
 * @param {Object} params
 * @param {Array} params.students - Full list of students
 * @param {boolean} [params.isAdmin=true] - Whether the active user is an administrator
 * @param {Array} [params.assignedSections=[]] - Sections assigned to the active user
 * @param {string} [params.initialSearch=''] - Initial search string
 * @param {string} [params.initialGrade='All'] - Initial grade filter ('All', 'Grade 7', etc.)
 * @param {string} [params.initialSection='All'] - Initial section ID filter ('All' or specific ID)
 * @returns {Object} Filter state, setters, and computed filtered learners
 */
export const useStudentFilters = ({
  students = [],
  isAdmin = true,
  assignedSections = [],
  initialSearch = '',
  initialGrade = 'All',
  initialSection = 'All',
  initialStatus = 'All'
} = {}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [filterGrade, setFilterGrade] = useState(initialGrade);
  const [filterSection, setFilterSection] = useState(initialSection);
  const [filterStatus, setFilterStatus] = useState(initialStatus);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterGrade('All');
    setFilterSection('All');
    setFilterStatus('All');
  };

  const filteredStudents = useMemo(() => {
    let result = [...students];

    // Security: Non-admins should only see learners in their assigned sections
    if (!isAdmin) {
      const assignedIds = assignedSections.map(s => s.id);
      result = result.filter(student => assignedIds.includes(student.sectionId));
    }

    // Text search query across names and LRN/ID
    if (searchTerm && searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(student =>
        (student.lastName || '').toLowerCase().includes(q) ||
        (student.firstName || '').toLowerCase().includes(q) ||
        (student.middleName || '').toLowerCase().includes(q) ||
        (student.id || '').toLowerCase().includes(q) ||
        (student.lrn || '').toLowerCase().includes(q)
      );
    }

    // Grade Level filter
    if (filterGrade !== 'All') {
      const targetGradeNum = filterGrade.replace(/\D/g, '');
      result = result.filter(student => {
        const studentGradeNum = (student.gradeLevel || '').replace(/\D/g, '');
        return studentGradeNum === targetGradeNum;
      });
    }

    // Section filter
    if (filterSection !== 'All') {
      if (filterSection === 'unassigned') {
        result = result.filter(student => !student.sectionId || student.sectionId === 'unassigned');
      } else {
        result = result.filter(student => student.sectionId === filterSection);
      }
    }

    // Status filter
    if (filterStatus !== 'All') {
      result = result.filter(student => (student.status || 'Active') === filterStatus);
    }

    // Official DepEd Roster sorting: Male first, then Female; alphabetically by Last Name
    return result.sort((a, b) => {
      if (a.gender !== b.gender) {
        return a.gender === 'Male' ? -1 : 1;
      }
      return (a.lastName || '').localeCompare(b.lastName || '');
    });
  }, [students, searchTerm, filterGrade, filterSection, filterStatus, assignedSections, isAdmin]);

  return {
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
    totalCount: students.length,
    filteredCount: filteredStudents.length,
    hasActiveFilters: searchTerm.trim() !== '' || filterGrade !== 'All' || filterSection !== 'All' || filterStatus !== 'All'
  };
};

export default useStudentFilters;
