import React from 'react';

const StudentFilterBar = ({
  searchTerm,
  onSearchChange,
  filterGrade,
  onGradeChange,
  filterStatus = 'All',
  onStatusChange,
  onClearFilters,
  hasActiveFilters
}) => {
  return (
    <div className="filters-bar card">
      <div className="search-box">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Search by LRN, First Name, Last Name..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button 
            type="button" 
            className="clear-btn" 
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <div className="filter-controls">
        <div className="filter-group">
          <label>Grade Level:</label>
          <select value={filterGrade} onChange={(e) => onGradeChange(e.target.value)}>
            <option value="All">All Grades</option>
            <option value="Grade 7">Grade 7</option>
            <option value="Grade 8">Grade 8</option>
            <option value="Grade 9">Grade 9</option>
            <option value="Grade 10">Grade 10</option>
            <option value="Grade 11">Grade 11</option>
            <option value="Grade 12">Grade 12</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => onStatusChange && onStatusChange(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Transferred In">Transferred In</option>
            <option value="Transferred Out">Transferred Out</option>
            <option value="Dropped">Dropped</option>
            <option value="Graduated">Graduated</option>
          </select>
        </div>

        {hasActiveFilters && onClearFilters && (
          <button 
            type="button" 
            className="btn-clear-filters"
            onClick={onClearFilters}
            title="Reset search and filters"
          >
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
};

export default StudentFilterBar;
