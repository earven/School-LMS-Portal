import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudentFilters } from './useStudentFilters';

describe('useStudentFilters hook', () => {
  const mockStudents = [
    { id: '100000000001', lastName: 'Santos', firstName: 'Juan', gender: 'Male', gradeLevel: 'Grade 7', sectionId: 'sec-1' },
    { id: '100000000002', lastName: 'Aquino', firstName: 'Maria', gender: 'Female', gradeLevel: 'Grade 7', sectionId: 'sec-1' },
    { id: '100000000003', lastName: 'Dela Cruz', firstName: 'Pedro', gender: 'Male', gradeLevel: 'Grade 8', sectionId: 'sec-2' },
    { id: '100000000004', lastName: 'Bautista', firstName: 'Ana', gender: 'Female', gradeLevel: 'Grade 8', sectionId: 'sec-2' }
  ];

  it('initializes with all students sorted DepEd style (Male first, then Female; alphabetically)', () => {
    const { result } = renderHook(() => useStudentFilters({ students: mockStudents }));

    expect(result.current.filteredStudents).toHaveLength(4);
    // Males first
    expect(result.current.filteredStudents[0].gender).toBe('Male');
    expect(result.current.filteredStudents[1].gender).toBe('Male');
    // Females next
    expect(result.current.filteredStudents[2].gender).toBe('Female');
    expect(result.current.filteredStudents[3].gender).toBe('Female');
  });

  it('filters students by search query across name and ID', () => {
    const { result } = renderHook(() => useStudentFilters({ students: mockStudents }));

    act(() => {
      result.current.setSearchTerm('maria');
    });

    expect(result.current.filteredStudents).toHaveLength(1);
    expect(result.current.filteredStudents[0].firstName).toBe('Maria');
  });

  it('filters students by grade level', () => {
    const { result } = renderHook(() => useStudentFilters({ students: mockStudents }));

    act(() => {
      result.current.setFilterGrade('Grade 7');
    });

    expect(result.current.filteredStudents).toHaveLength(2);
    expect(result.current.filteredStudents.every(s => s.gradeLevel === 'Grade 7')).toBe(true);
  });

  it('filters students by section ID', () => {
    const { result } = renderHook(() => useStudentFilters({ students: mockStudents }));

    act(() => {
      result.current.setFilterSection('sec-2');
    });

    expect(result.current.filteredStudents).toHaveLength(2);
    expect(result.current.filteredStudents.every(s => s.sectionId === 'sec-2')).toBe(true);
  });

  it('restricts non-admin teachers strictly to assigned sections', () => {
    const assignedSections = [{ id: 'sec-1', name: 'Diamond' }];
    const { result } = renderHook(() => 
      useStudentFilters({
        students: mockStudents,
        isAdmin: false,
        assignedSections
      })
    );

    expect(result.current.filteredStudents).toHaveLength(2);
    expect(result.current.filteredStudents.every(s => s.sectionId === 'sec-1')).toBe(true);
  });

  it('clears all active filters', () => {
    const { result } = renderHook(() => useStudentFilters({ students: mockStudents }));

    act(() => {
      result.current.setSearchTerm('pedro');
      result.current.setFilterGrade('Grade 8');
      result.current.setFilterSection('sec-2');
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.searchTerm).toBe('');
    expect(result.current.filterGrade).toBe('All');
    expect(result.current.filterSection).toBe('All');
    expect(result.current.filteredStudents).toHaveLength(4);
    expect(result.current.hasActiveFilters).toBe(false);
  });
});
