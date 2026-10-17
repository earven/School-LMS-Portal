import React, { useMemo } from 'react';
import { buildFullName } from '../../utils/personnelName';
import TableSkeleton from '../../components/TableSkeleton';
import EmptyState from '../../components/EmptyState';

const StudentDataTable = ({
  loading,
  filteredStudents = [],
  selectedStudent,
  selectedStudentIds = [],
  sections = [],
  filterSection = 'All',
  onSelectAll,
  onToggleSelect,
  onRowClick,
  hasActiveFilters = false,
  onClearFilters
}) => {
  const isAllSelected = filteredStudents.length > 0 && selectedStudentIds.length === filteredStudents.length;

  // When filterSection is 'All', organize students into section groups
  const studentGroups = useMemo(() => {
    if (filterSection !== 'All') {
      return [{
        sectionId: filterSection,
        section: sections.find(s => s.id === filterSection),
        list: filteredStudents
      }];
    }

    // Sort sections by grade level then name
    const sortedSections = [...sections].sort((a, b) => {
      const gA = parseInt((a.gradeLevel || '').replace(/\D/g, ''), 10) || 0;
      const gB = parseInt((b.gradeLevel || '').replace(/\D/g, ''), 10) || 0;
      if (gA !== gB) return gA - gB;
      return (a.name || '').localeCompare(b.name || '');
    });

    const groupsMap = new Map();
    sortedSections.forEach(sec => {
      groupsMap.set(sec.id, {
        sectionId: sec.id,
        section: sec,
        list: []
      });
    });

    const unassignedGroup = {
      sectionId: 'unassigned',
      section: { name: 'Unassigned Learners', gradeLevel: '' },
      list: []
    };

    filteredStudents.forEach(student => {
      const sId = student.sectionId;
      if (sId && groupsMap.has(sId)) {
        groupsMap.get(sId).list.push(student);
      } else {
        unassignedGroup.list.push(student);
      }
    });

    const groups = [];
    groupsMap.forEach(group => {
      if (group.list.length > 0) {
        groups.push(group);
      }
    });

    if (unassignedGroup.list.length > 0) {
      groups.push(unassignedGroup);
    }

    return groups;
  }, [filteredStudents, filterSection, sections]);

  return (
    <div className="table-wrapper card">
      <table className="students-table">
        <thead>
          <tr>
            <th style={{ width: '40px' }}>
              <input 
                type="checkbox"
                checked={isAllSelected}
                onChange={onSelectAll}
                aria-label="Select all learners"
              />
            </th>
            <th>Learner Name</th>
            <th>LRN</th>
            <th>Gender</th>
            <th>Grade Level</th>
            <th>Section</th>
            <th>Nutritional Status</th>
            <th>4Ps</th>
          </tr>
        </thead>
        {loading ? (
          <TableSkeleton rows={8} columns={7} hasCheckbox={true} />
        ) : (
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state-table-cell">
                  <EmptyState
                    icon="👥"
                    title="No Learners Found"
                    description={
                      hasActiveFilters
                        ? "No learners match your search query or filter criteria."
                        : "No learners are registered in this section yet."
                    }
                    actionLabel={hasActiveFilters ? "Clear Filters" : undefined}
                    onAction={onClearFilters}
                    compact
                  />
                </td>
              </tr>
            ) : null}

          {studentGroups.map(group => {
            const showGroupHeader = filterSection === 'All' && studentGroups.length > 0;

            return (
              <React.Fragment key={`group-${group.sectionId}`}>
                {showGroupHeader && (
                  <tr className="section-group-header-row">
                    <td colSpan="8">
                      <div className="section-group-header">
                        <div className="section-group-title">
                          <span className="section-group-icon">
                            {group.sectionId === 'unassigned' ? '⚠️' : '🏛️'}
                          </span>
                          <span className="section-group-name">
                            {group.section?.name || 'Section'}
                          </span>
                          {group.section?.gradeLevel && (
                            <span className="section-group-grade">
                              ({group.section.gradeLevel})
                            </span>
                          )}
                        </div>
                        <span className="section-group-count">
                          {group.list.length} {group.list.length === 1 ? 'learner' : 'learners'}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}

                {group.list.map(student => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  const section = sections.find(s => s.id === student.sectionId);
                  const fullName = buildFullName({
                    lastName: student.lastName,
                    firstName: student.firstName,
                    middleName: student.middleName,
                    nameExtension: student.extension
                  });

                  return (
                    <tr 
                      key={student.id}
                      className={`table-row ${selectedStudent?.id === student.id ? 'active-row' : ''} ${isSelected ? 'selected-row' : ''}`}
                      onClick={() => onRowClick(student)}
                    >
                      <td onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onToggleSelect(student.id, e)}
                          aria-label={`Select ${fullName}`}
                        />
                      </td>
                      <td>
                        <div className="student-name-cell">
                          <strong>{fullName}</strong>
                          {student.status && student.status !== 'Active' && (
                            <span className="status-badge-inline">{student.status}</span>
                          )}
                        </div>
                      </td>
                      <td className="lrn-cell">{student.id}</td>
                      <td>
                        <span className={`gender-tag tag-${(student.gender || 'male').toLowerCase()}`}>
                          {student.gender || 'Male'}
                        </span>
                      </td>
                      <td>{student.gradeLevel}</td>
                      <td>{section ? section.name : student.sectionId || 'Unassigned'}</td>
                      <td>
                        <span className={`nutrition-badge nutrition-${(student.nutritionalStatus || 'normal').toLowerCase().replace(/\s+/g, '-')}`}>
                          {student.nutritionalStatus || 'Normal'}
                        </span>
                      </td>
                      <td>
                        {student.is4Ps ? (
                          <span className="badge-4ps">4Ps</span>
                        ) : (
                          <span className="badge-none">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      )}
      </table>
    </div>
  );
};

export default StudentDataTable;
